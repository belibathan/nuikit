-- {{name}}: client
-- The showroom lives in web/ (the vehicle-shop block); this file opens it at the nearest showroom
-- with a camera on the preview spot, puts a local preview car there (only you see it), and hands
-- the purchase and test drives to the server, which spawns the real cars and checks everything.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Escape closes the page's confirm first, then the showroom.
local panel = nk.surface('vehicle-shop', { layer = 'panel', exclusive = true, escape = 'back' })
local here, cam, preview = nil, nil, nil

-- ───────────────────────────────── asking the server

local pending, seq = {}, 0

--- Ask server/main.lua and wait for its answer (or nil after 8 s: a spawn can take a moment).
local function request(name, data)
  seq = seq + 1
  local id, p = seq, promise.new()
  pending[id] = p
  TriggerServerEvent('{{name}}:req', id, name, data)
  SetTimeout(8000, function()
    if pending[id] then pending[id] = nil; p:resolve(nil) end
  end)
  return Citizen.Await(p)
end

RegisterNetEvent('{{name}}:res', function(id, result)
  local p = pending[id]
  if p then pending[id] = nil; p:resolve(result) end
end)

-- ───────────────────────────────── paint, the preview car, the camera

local function paint(veh, hex)
  if not hex or not hex:match('^#%x%x%x%x%x%x$') then return end
  local r, g, b = tonumber(hex:sub(2, 3), 16), tonumber(hex:sub(4, 5), 16), tonumber(hex:sub(6, 7), 16)
  SetVehicleCustomPrimaryColour(veh, r, g, b)
  SetVehicleCustomSecondaryColour(veh, r, g, b)
end

-- Cars the server spawned carry their colour in a state bag; paint them when they stream in.
AddStateBagChangeHandler('nkColour', nil, function(bag, _, value)
  local net = tonumber(bag:match('^entity:(%d+)$'))
  if not net then return end
  local deadline = GetGameTimer() + 3000
  while not NetworkDoesNetworkIdExist(net) and GetGameTimer() < deadline do Wait(50) end
  if NetworkDoesNetworkIdExist(net) then paint(NetToVeh(net), value) end
end)

local function clearPreview()
  if preview and DoesEntityExist(preview) then DeleteEntity(preview) end
  preview = nil
end

local function showPreview(model, hex)
  local hash = GetHashKey(model)
  if not IsModelInCdimage(hash) or not IsModelAVehicle(hash) then return false end
  RequestModel(hash)
  local deadline = GetGameTimer() + 5000
  while not HasModelLoaded(hash) and GetGameTimer() < deadline do Wait(50) end
  if not HasModelLoaded(hash) then return false end
  clearPreview()
  local s = here.showroom
  preview = CreateVehicle(hash, s.x, s.y, s.z, s.w, false, false) -- local: only this player sees it
  SetModelAsNoLongerNeeded(hash)
  FreezeEntityPosition(preview, true)
  SetVehicleDoorsLocked(preview, 2)
  paint(preview, hex)
  return true
end

local function startCamera()
  local c, s = here.camera, here.showroom
  cam = CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', c.x, c.y, c.z, 0.0, 0.0, 0.0, 50.0, false, 0)
  PointCamAtCoord(cam, s.x, s.y, s.z + 0.4)
  SetCamActive(cam, true)
  RenderScriptCams(true, true, 600, true, true)
end

local function stopCamera()
  if not cam then return end
  RenderScriptCams(false, true, 600, true, true)
  DestroyCam(cam, false)
  cam = nil
end

-- ───────────────────────────────── the panel

local function nearest()
  local pos = GetEntityCoords(PlayerPedId())
  for _, s in ipairs(Config.shops) do
    if #(pos - s.coords) <= s.radius then return s end
  end
end

local function open()
  here = nearest()
  if not here then return end
  local res = request('open', { shop = here.id })
  if not res or not res.ok then
    nk.notify({ title = res and res.error or "The showroom didn't answer.", type = 'error' })
    return
  end
  startCamera()
  panel:open(res.shop)
  -- when it closes (Escape, a purchase, another panel): the camera and the preview go
  CreateThread(function()
    while panel:isOpen() do Wait(200) end
    clearPreview()
    stopCamera()
  end)
end

RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the vehicle showroom', 'keyboard', Config.key or 'E')

CreateThread(function()
  local inside = nil
  while true do
    local s = nearest()
    if s and s ~= inside then nk.notify({ title = s.label, description = ('Press %s to browse'):format(Config.key or 'E') }) end
    inside = s
    Wait(500)
  end
end)

--- Wait for a car the server spawned, then put the player in it.
local function enter(net, hex)
  local deadline = GetGameTimer() + 5000
  while not NetworkDoesNetworkIdExist(net) and GetGameTimer() < deadline do Wait(50) end
  if not NetworkDoesNetworkIdExist(net) then return end
  local veh = NetToVeh(net)
  paint(veh, hex)
  TaskWarpPedIntoVehicle(PlayerPedId(), veh, -1)
end

-- ───────────────────────────────── what the page asks for

nk.on('vehicle-shop:preview', function(data)
  if not here or type(data.id) ~= 'string' then return { ok = false } end
  return { ok = showPreview(data.id, data.colour) }
end)

nk.on('vehicle-shop:buy', function(data)
  if not here then return { ok = false, error = "You're not at the showroom." } end
  local res = request('buy', { shop = here.id, id = data.id, colour = data.colour, payment = data.payment })
  if not res then return { ok = false, error = "The showroom didn't answer." } end
  if not res.ok then return { ok = false, error = res.error } end
  panel:close()
  nk.notify({ title = 'Enjoy the ride', description = ('Plate %s'):format(res.plate), type = 'success' })
  CreateThread(function() enter(res.net, res.colour) end)
  return { ok = true }
end)

local returnTo = nil
nk.on('vehicle-shop:test-drive', function(data)
  if not here then return { ok = false, error = "You're not at the showroom." } end
  local res = request('test', { shop = here.id, id = data.id, colour = data.colour })
  if not res then return { ok = false, error = "The showroom didn't answer." } end
  if not res.ok then return { ok = false, error = res.error } end
  returnTo = here.coords
  panel:close()
  nk.notify({ title = 'Test drive', description = ('%d seconds. Bring it back in one piece.'):format(res.seconds) })
  CreateThread(function() enter(res.net, res.colour) end)
  return { ok = true }
end)

-- The server ended the test drive (and removed the car): back to the showroom.
RegisterNetEvent('{{name}}:testEnd', function()
  local ped = PlayerPedId()
  if returnTo then SetEntityCoords(ped, returnTo.x, returnTo.y, returnTo.z, false, false, false, false) end
  returnTo = nil
  nk.notify({ title = 'Test drive over' })
end)

AddEventHandler('onResourceStop', function(name)
  if name ~= GetCurrentResourceName() then return end
  clearPreview()
  stopCamera()
end)
