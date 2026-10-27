-- {{name}}: client
-- The panel lives in web/ (the job-tracker block). This file shows it while the player has a job,
-- turns the key into requests (take the job, do the step) and passes the page's calls on. The server
-- decides every one of them; the answer carries the fresh snapshot, which goes to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- hud: always on the game while you work. manage: the same panel with focus and the buttons;
-- Escape closes its confirm first, then it.
local hud = nk.surface('jobtracker', { layer = 'hud' })
local manage = nk.surface('jobtracker-manage', { layer = 'panel', input = 'full', keepInput = true, escape = 'back', hides = { 'jobtracker' } })

local jobId, snap = nil, nil -- the job the server says we have, and the panel's data

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

--- Take the server's answer: its job (or none) goes to the panel.
local function apply(res)
  jobId, snap = res.id, res.job
  if not snap then
    hud:close()
    manage:close()
    return
  end
  if hud:isOpen() then hud:update(snap) else hud:open(snap) end
  if manage:isOpen() then manage:update(snap) end
end

local function nearestStart()
  local pos = GetEntityCoords(PlayerPedId())
  for id, job in pairs(Config.jobs) do
    if #(pos - job.start.coords) <= job.start.radius then return id end
  end
end

--- The place of the current step (display only: the server checks where the player really is).
local function stepPlace()
  local job = jobId and Config.jobs[jobId]
  return job and snap and job.steps[snap.current + 1]
end

-- E at a job's start takes it; E anywhere else does the current step.
local function press()
  if not snap then
    local id = nearestStart()
    if not id then return end
    local res = request('start', { job = id })
    if not res then nk.notify({ title = "The job didn't answer.", type = 'error' }) return end
    if not res.ok then nk.notify({ title = res.error, type = 'error' }) return end
    apply(res)
    return
  end
  local place = stepPlace()
  if not place then return end
  local res = request('step', { step = place.id })
  if not res then nk.notify({ title = "The job didn't answer.", type = 'error' }) return end
  if not res.ok then nk.notify({ title = res.error, type = 'error' }) return end
  if res.completed then nk.notify({ title = 'Job done', description = ('You were paid %d'):format(res.pay), type = 'success' }) end
  apply(res)
end

RegisterCommand('{{name}}', press, false)
RegisterKeyMapping('{{name}}', 'Take the job or do the step', 'keyboard', Config.key or 'E')

RegisterCommand('{{name}}manage', function()
  if not snap then return end
  if manage:isOpen() then manage:close() else manage:open(snap) end
end, false)
RegisterKeyMapping('{{name}}manage', 'Manage the job', 'keyboard', Config.manageKey or 'J')

-- Show the distance to the current step, twice a second (display only).
CreateThread(function()
  while true do -- INFINITE LOOP: for the resource's life; every pass sleeps
    local place = stepPlace()
    if place and snap and not (place.count and place.count > 1) then
      snap.distance = #(GetEntityCoords(PlayerPedId()) - place.coords)
      if hud:isOpen() then hud:update(snap) end
    end
    Wait(500)
  end
end)

-- A restarted client asks what job it has.
CreateThread(function()
  local res = request('state', {})
  if res and res.ok and res.job then apply(res) end
end)

-- ───────────────────────────────── what the page asks for

nk.on('jobtracker:step', function(data)
  local place = stepPlace()
  if not place or data.step ~= place.id then return { ok = false, error = "That's not your current step." } end
  local res = request('step', { step = place.id })
  if not res then return { ok = false, error = "The job didn't answer." } end
  if res.ok then
    if res.completed then nk.notify({ title = 'Job done', description = ('You were paid %d'):format(res.pay), type = 'success' }) end
    apply(res)
  end
  return { ok = res.ok, error = res.error }
end)

nk.on('jobtracker:abandon', function()
  local res = request('abandon', {})
  if not res then return { ok = false, error = "The job didn't answer." } end
  if res.ok then apply(res) end
  return { ok = res.ok, error = res.error }
end)
