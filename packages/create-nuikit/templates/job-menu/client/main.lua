-- {{name}}: client
-- The job menu lives in web/ (the job-menu block); this file opens it with what the server says
-- about your job and passes on what the page asks for (job:duty, job:action, job:hire, job:fire,
-- job:grade). The server checks every request; an error goes back to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local panel = nk.surface('job', { layer = 'panel', exclusive = true })

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

local function open()
  local res = request('open')
  if not res or not res.ok then
    print(('[{{name}}] %s'):format(res and res.error or "The job menu didn't answer."))
    return
  end
  panel:open(res.data)
end

--- After a change: the server's fresh snapshot (or close, when you no longer have a job).
local function refresh()
  if not panel:isOpen() then return end
  local res = request('open')
  if res and res.ok then panel:update(res.data) elseif res then panel:close() end
end

-- /{{name}} or F5 (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the job menu', 'keyboard', Config.key or 'F5')

-- ───────────────────────────────── what the page asks for

--- Ask the server, refresh on success, and give the page the answer.
local function ask(name, data)
  local res = request(name, data)
  if not res then return { ok = false, error = "The job menu didn't answer." } end
  if res.ok then refresh() end
  return { ok = res.ok, error = res.error }
end

nk.on('job:duty', function(data) return ask('duty', { onDuty = data.onDuty }) end)
nk.on('job:hire', function(data) return ask('hire', { player = data.player }) end)
nk.on('job:fire', function(data) return ask('fire', { id = data.id }) end)
nk.on('job:grade', function(data) return ask('grade', { id = data.id, grade = data.grade }) end)

-- An action the server allowed: close the menu and tell the scripts that do the work.
--   client: AddEventHandler('{{name}}:action', function(job, id) … end)
--   server: AddEventHandler('{{name}}:action', function(src, job, id) … end)
nk.on('job:action', function(data)
  local res = request('action', { id = data.id })
  if not res then return { ok = false, error = "The job menu didn't answer." } end
  if not res.ok then return { ok = false, error = res.error } end
  panel:close()
  TriggerEvent('{{name}}:action', res.job, data.id)
  return { ok = true }
end)

-- The example's actions just say what would happen. Replace with your armory, garage, outfits…
AddEventHandler('{{name}}:action', function(job, id)
  print(('[{{name}}] %s: %s'):format(job, id))
end)
