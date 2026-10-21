-- {{name}}: client
-- The sheet lives in web/ (the job-sheet block); this file opens it with the pages the server built
-- for your job and passes on what the page asks for (jobsheet:duty, jobsheet:row). The server checks
-- every request; an error goes back to the sheet.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Esc goes to the page, which leaves a sub-page first, then closes the sheet.
local sheet = nk.surface('jobsheet', { layer = 'panel', exclusive = true, escape = 'back' })

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

-- ───────────────────────────────── the sheet

local function open()
  local res = request('open')
  if not res or not res.ok then
    print(('[{{name}}] %s'):format(res and res.error or "The job sheet didn't answer."))
    return
  end
  sheet:open(res.data)
end

--- After a change: the server's fresh snapshot (or close, when you no longer have a job).
local function refresh()
  if not sheet:isOpen() then return end
  local res = request('open')
  if res and res.ok then sheet:update(res.data) elseif res then sheet:close() end
end

-- /{{name}} or F5 (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if sheet:isOpen() then sheet:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the job sheet', 'keyboard', Config.key or 'F5')

-- ───────────────────────────────── what the page asks for

nk.on('jobsheet:duty', function(data)
  local res = request('duty', { onDuty = data.onDuty })
  if not res then return { ok = false, error = "The job sheet didn't answer." } end
  if res.ok then refresh() end
  return { ok = res.ok, error = res.error }
end)

-- A row the server allowed: close the sheet and tell the scripts that do the work.
--   client: AddEventHandler('{{name}}:action', function(job, id) … end)
--   server: AddEventHandler('{{name}}:action', function(src, job, id) … end)
-- A row that only changes state (clock out) returns `stay = true` from the server and the sheet
-- refreshes instead.
nk.on('jobsheet:row', function(data)
  local res = request('row', { page = data.page, id = data.id })
  if not res then return { ok = false, error = "The job sheet didn't answer." } end
  if not res.ok then return { ok = false, error = res.error } end
  if res.stay then
    refresh()
  else
    sheet:close()
    TriggerEvent('{{name}}:action', res.job, data.id)
  end
  return { ok = true }
end)

-- The example's rows just say what would happen. Replace with your armory, garage, outfits…
AddEventHandler('{{name}}:action', function(job, id)
  print(('[{{name}}] %s: %s'):format(job, id))
end)
