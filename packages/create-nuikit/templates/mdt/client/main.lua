-- {{name}}: client
-- The terminal lives in web/ (the mdt block); this file opens it when the server allows, and passes
-- the page's searches, record lookups and reports on. The server checks job, duty, limits and rates on
-- every call; an error goes back to the panel.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Escape closes the page's confirm first, then the report form, then the terminal.
local panel = nk.surface('mdt', { layer = 'panel', exclusive = true, escape = 'back' })

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
  local res = request('open', {})
  if not res or not res.ok then
    nk.notify({ title = res and res.error or "The terminal didn't answer.", type = 'error' })
    return
  end
  panel:open(res.mdt)
end

-- /{{name}} or F6 (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the MDT', 'keyboard', Config.key or 'F6')

-- The example's /{{name}}_duty (server side) says where it left you.
RegisterNetEvent('{{name}}:duty', function(onDuty)
  nk.notify({ title = onDuty and 'You are on duty' or 'You are off duty' })
  if not onDuty and panel:isOpen() then panel:close() end
end)

-- ───────────────────────────────── what the page asks for

-- Pass on only the fields each call uses; the server validates them all again.
local function forward(name, pick)
  return function(data)
    local res = request(name, pick(data or {}))
    return res or { ok = false, error = "The terminal didn't answer." }
  end
end

nk.on('mdt:search', forward('search', function(d) return { kind = d.kind, query = d.query } end))
nk.on('mdt:record', forward('record', function(d) return { kind = d.kind, id = d.id } end))
nk.on('mdt:report', forward('report', function(d) return { title = d.title, person = d.person, text = d.text } end))
