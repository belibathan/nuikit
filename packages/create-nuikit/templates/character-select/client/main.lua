-- {{name}}: client
-- The character select lives in web/ (the character-select block); this file shows it when the
-- player joins (and on /{{name}}, to switch), with a camera over the city, and does what the
-- server answers: teleport to the spawn point it sends, then hand the player their character.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- modal, escape = 'back': Escape steps back inside the screen; there's nothing behind it to go to.
local screen = nk.surface('character-select', { layer = 'modal', exclusive = true, escape = 'back' })
local cam = nil

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

-- ───────────────────────────────── the screen

local function hold(on)
  local ped = PlayerPedId()
  FreezeEntityPosition(ped, on)
  SetEntityVisible(ped, not on, false)
  SetEntityInvincible(ped, on)
  if on then
    local c = Config.camera
    cam = cam or CreateCamWithParams('DEFAULT_SCRIPTED_CAMERA', c.x, c.y, c.z, -10.0, 0.0, c.w, 60.0, false, 0)
    SetCamActive(cam, true)
    RenderScriptCams(true, false, 0, true, true)
  elseif cam then
    RenderScriptCams(false, true, 800, true, true)
    DestroyCam(cam, false)
    cam = nil
  end
end

local function refresh()
  local res = request('open')
  if not res or not res.ok then return false end
  if screen:isOpen() then screen:update(res.data) else screen:open(res.data) end
  return true
end

local function show()
  DoScreenFadeOut(300)
  Wait(300)
  hold(true)
  if not refresh() then
    print('[{{name}}] The server did not answer; try /{{name}}.')
    hold(false)
  end
  DoScreenFadeIn(500)
end

-- When the player arrives (and when this resource restarts while they're in).
CreateThread(function()
  while not NetworkIsSessionStarted() do Wait(250) end
  show()
end)

-- /{{name}}: back to the character screen (the server saves where you were).
RegisterCommand('{{name}}', function()
  if not screen:isOpen() then show() end
end, false)

-- ───────────────────────────────── what the page asks for

nk.on('character:play', function(data)
  local res = request('play', { id = data.id, spawn = data.spawn })
  if not res then return { ok = false, error = "The server didn't answer." } end
  if not res.ok then return { ok = false, error = res.error } end
  CreateThread(function()
    DoScreenFadeOut(400)
    Wait(400)
    screen:close()
    local ped = PlayerPedId()
    if res.at then
      RequestCollisionAtCoord(res.at.x, res.at.y, res.at.z)
      SetEntityCoords(ped, res.at.x, res.at.y, res.at.z, false, false, false, false)
      SetEntityHeading(ped, res.at.w or 0.0)
      local deadline = GetGameTimer() + 3000
      while not HasCollisionLoadedAroundEntity(ped) and GetGameTimer() < deadline do Wait(50) end
    end
    hold(false)
    DoScreenFadeIn(800)
    nk.notify({ title = ('Welcome, %s'):format(res.name) })
    TriggerEvent('{{name}}:playing', data.id) -- your scripts: the character is in
  end)
  return { ok = true }
end)

nk.on('character:create', function(data)
  local res = request('create', data)
  if not res then return { ok = false, error = "The server didn't answer." } end
  if res.ok then refresh() end
  return { ok = res.ok, error = res.error }
end)

nk.on('character:delete', function(data)
  local res = request('delete', { id = data.id })
  if not res then return { ok = false, error = "The server didn't answer." } end
  if res.ok then refresh() end
  return { ok = res.ok, error = res.error }
end)

AddEventHandler('onResourceStop', function(name)
  if name == GetCurrentResourceName() and cam then hold(false) end
end)
