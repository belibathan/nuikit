-- {{name}}: client
-- The character select lives in web/ (the character-select block); this file shows it when the
-- player joins (and on /{{name}}, to switch), with a camera over the city, and does what the
-- server answers: teleport to the spawn point it sends, then hand the player their character.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- modal, escape = 'back': Escape steps back inside the screen; there's nothing behind it to go to.
local screen = nk.surface('character-select', { layer = 'modal', exclusive = true, escape = 'back' })
local cam = nil        -- the city view while choosing (an nk.camera claim)
local previewing = nil -- the spawn point preview on top of it

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
    -- nuikit's camera service: one stack of cameras for every resource, given back on death and stop
    local c = Config.camera
    cam = nk.camera.claim({ id = 'select', fov = 60.0 })
    SetCamCoord(cam.cam, c.x, c.y, c.z)
    SetCamRot(cam.cam, -10.0, 0.0, c.w, 2)
    nk.camera.stream(c.x, c.y, c.z, cam)
  elseif cam then
    if previewing then nk.camera.release(previewing, { instant = true }) end
    previewing = nil
    nk.camera.release(cam, { ms = 800 })
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
    Log.info('The server did not answer; try /{{name}}.')
    hold(false)
  end
  DoScreenFadeIn(500)
end

-- When the player arrives (and when this resource restarts while they're in).
CreateThread(function()
  -- joining can take a while; the limiter stops this when the resource stops, and after ten minutes
  if not WaitLimiter.waitUntil(NetworkIsSessionStarted, { timeout = 600000, interval = 250 }) then return end
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
      WaitLimiter.waitUntil(function() return HasCollisionLoadedAroundEntity(ped) end, { timeout = 3000, interval = 50 })
    end
    hold(false)
    DoScreenFadeIn(800)
    nk.notify({ title = ('Welcome, %s'):format(res.name) })
    TriggerEvent('{{name}}:playing', data.id) -- your scripts: the character is in
  end)
  return { ok = true }
end)

-- The spawn point the player is looking at: the camera glides over it (only where to look; the
-- server still decides where they land). Config.preview = false keeps the city view.
nk.on('character:preview', function(data)
  if Config.preview == false or not cam then return { ok = true } end
  local spawn
  for _, s in ipairs(Config.spawns or {}) do
    if s.id == data.spawn then spawn = s end
  end
  if not spawn then
    if previewing then nk.camera.release(previewing, { ms = 700 }) end
    previewing = nil
    return { ok = true }
  end
  local p = Config.preview or {}
  local c = spawn.coords
  -- re-claiming the same id starts from the view on screen: one glide from spawn to spawn
  previewing = nk.camera.claim({
    id = 'spawn',
    target = { x = c.x, y = c.y, z = c.z },
    heading = c.w or 0.0,
    offset = p.offset or { y = -38.0, z = 24.0 },
    look = { z = 1.0 },
    fov = p.fov or 45.0,
    duration = p.duration or 1100,
  })
  nk.camera.stream(c.x, c.y, c.z, previewing)
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
