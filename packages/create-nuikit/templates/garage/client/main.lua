-- {{name}}: client
-- The garage lives in web/ (the garage block); this file opens it at the nearest garage, asks
-- server/main.lua for your vehicles, and spawns or stores them. What the page asks for
-- (garage:takeOut, garage:store, garage:release) is answered here; an error goes back to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local panel = nk.surface('garage', { layer = 'panel', exclusive = true })
local here = nil -- the garage the panel is open at

-- ───────────────────────────────── asking the server

local pending, seq = {}, 0

--- Ask server/main.lua and wait for its answer (or nil after 5 s).
local function request(name, data)
  seq = seq + 1
  local id, p = seq, promise.new()
  pending[id] = p
  TriggerServerEvent('{{name}}:req', id, name, data)
  SetTimeout(5000, function()
    if pending[id] then pending[id] = nil; p:resolve(nil) end
  end)
  return Citizen.Await(p)
end

RegisterNetEvent('{{name}}:res', function(id, result)
  local p = pending[id]
  if p then pending[id] = nil; p:resolve(result) end
end)

-- ───────────────────────────────── the panel

local function nearest()
  local pos = GetEntityCoords(PlayerPedId())
  for _, g in ipairs(Config.garages) do
    if #(pos - g.coords) <= Config.radius then return g end
  end
end

--- The vehicle the player is driving, or nil.
local function driving()
  local ped = PlayerPedId()
  local veh = GetVehiclePedIsIn(ped, false)
  if veh ~= 0 and GetPedInVehicleSeat(veh, -1) == ped then return veh end
end

--- What the panel shows (web/src/components/blocks/garage/nui.ts: GarageData), or nil.
local function snapshot()
  local res = request('list', { garage = here.id })
  if not res or not res.ok then return nil end
  return { title = here.label, vehicles = res.vehicles, canStore = driving() ~= nil }
end

local function open()
  here = nearest()
  if not here then
    print(("[{{name}}] You're not at a garage."))
    return
  end
  local data = snapshot()
  if data then panel:open(data) end
end

local function refresh()
  local data = here and snapshot()
  if data and panel:isOpen() then panel:update(data) end
end

-- /{{name}} or F6 (players can rebind it in Settings → Key Bindings → FiveM). An "[E] Open garage"
-- prompt at each garage comes with the kit's key-prompt component.
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the garage', 'keyboard', Config.key or 'F6')

-- ───────────────────────────────── what the page asks for

local CLASSES = { [0] = 'Compact', 'Sedan', 'SUV', 'Coupe', 'Muscle', 'Sports Classic', 'Sports', 'Super', 'Motorcycle', 'Off-road',
  'Industrial', 'Utility', 'Van', 'Cycle', 'Boat', 'Helicopter', 'Plane', 'Service', 'Emergency', 'Military', 'Commercial', 'Train', 'Open Wheel' }

local function pct(n) return math.floor(math.max(0, math.min(100, n)) + 0.5) end

-- The server reads the vehicle itself (plate, model, health) and deletes it once you're out; the
-- client only names it and adds the label and class for the list.
nk.on('garage:store', function()
  local veh = driving()
  if not veh or not here then return { ok = false, error = 'Drive the vehicle into the garage first.' } end
  local model = GetEntityModel(veh)
  local res = request('store', {
    garage = here.id,
    net = VehToNet(veh),
    label = GetLabelText(GetDisplayNameFromVehicleModel(model)),
    class = CLASSES[GetVehicleClass(veh)],
    fuel = pct(GetVehicleFuelLevel(veh)), -- used when no fuel resource sets the `fuel` state bag
  })
  if not res or not res.ok then return { ok = false, error = res and res.error or "The garage didn't answer." } end
  TaskLeaveVehicle(PlayerPedId(), veh, 0)
  SetTimeout(1600, refresh)
  return { ok = true }
end)

-- The server spawns it (so it can't come out twice) and sends its network id; the client waits for
-- it to arrive, applies the health the server can't set, and puts you in the driver's seat.
nk.on('garage:takeOut', function(data)
  if not here then return { ok = false } end
  local s = here.spawn
  if IsAnyVehicleNearPoint(s.x, s.y, s.z, 3.0) then return { ok = false, error = 'Something is parked in the way.' } end
  local res = request('take', { id = data.id, garage = here.id })
  if not res or not res.ok then return { ok = false, error = res and res.error or "The garage didn't answer." } end
  local deadline = GetGameTimer() + 5000
  while not NetworkDoesNetworkIdExist(res.net) and GetGameTimer() < deadline do Wait(50) end
  local veh = NetworkDoesNetworkIdExist(res.net) and NetToVeh(res.net) or 0
  panel:close()
  if veh == 0 then return { ok = true } end -- it's out at the spawn point, just not streamed in yet
  local v = res.vehicle
  SetVehicleFuelLevel(veh, v.fuel + 0.0)
  SetVehicleEngineHealth(veh, v.engine * 10.0)
  SetVehicleBodyHealth(veh, v.body * 10.0)
  TaskWarpPedIntoVehicle(PlayerPedId(), veh, -1)
  return { ok = true }
end)

nk.on('garage:release', function(data)
  if not here then return { ok = false } end
  local res = request('release', { id = data.id, garage = here.id })
  if not res or not res.ok then return { ok = false, error = res and res.error or "The garage didn't answer." } end
  refresh()
  return { ok = true }
end)
