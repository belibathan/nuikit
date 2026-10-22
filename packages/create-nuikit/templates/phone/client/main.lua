-- {{name}}: client
-- The phone lives in web/ (the phone block); this file opens it with the player's snapshot from the
-- server, passes adding a contact and sending a text on, and shows an arriving text. The server owns
-- the number, the contacts and the messages; the page never says who it is.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

-- escape = 'back': Escape leaves a thread, then an app, then closes the phone.
local panel = nk.surface('phone', { layer = 'panel', escape = 'back' })

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
    nk.notify({ title = res and res.error or "The phone didn't answer.", type = 'error' })
    return
  end
  panel:open(res.phone)
end

-- /{{name}} or the key toggles it.
RegisterCommand('{{name}}', function()
  if panel:isOpen() then panel:close() else open() end
end, false)
RegisterKeyMapping('{{name}}', 'Open the phone', 'keyboard', Config.key or 'F1')

--- A text arrived: the server sends a fresh snapshot and who it's from. Open phones update; closed
--- ones get a notification.
RegisterNetEvent('{{name}}:push', function(phone, from)
  if type(phone) ~= 'table' or type(from) ~= 'table' then return end
  if panel:isOpen() then
    panel:update(phone)
  else
    local title = tostring(from.title):gsub('^(%d+)(%d%d%d%d)$', '%1-%2')
    nk.notify({ title = title, description = tostring(from.text), type = 'info' })
  end
end)

-- ───────────────────────────────── what the page asks for

--- Pass a change on and refresh the panel from the server's answer. Only the fields the server
--- needs go up; who is asking is the server's business.
local function change(name, data)
  local res = request(name, data)
  if not res then return { ok = false, error = "The phone didn't answer." } end
  if res.ok and res.phone and panel:isOpen() then panel:update(res.phone) end
  return { ok = res.ok, error = res.error }
end

nk.on('phone:addContact', function(data)
  return change('addContact', { name = data.name, number = data.number })
end)

nk.on('phone:send', function(data)
  return change('send', { to = data.to, text = data.text })
end)
