--[[
  nuikit_mythic_notify: mythic_notify's public API, drawn by nk.notify (docs/adapters/mythic-notify.md).

  Mechanism: stand-in. `provide 'mythic_notify'` plus the five exports registered under mythic_notify's
  name and the two client events (the server path) handled. `style` (a CSS table) goes to `meta.style`
  untouched; a PersistentAlert `start` is a toast with duration 0 under its id, `end` cancels it.
]]

local LIB = 'mythic_notify'
local DEFAULT_LENGTH = 2500
local STATUS = { inform = 'info', info = 'info', error = 'error', success = 'success', warning = 'warning' }

local persistent = {} -- id → handle

local function props(kind, text, length, style)
  if type(text) ~= 'string' then text = text ~= nil and tostring(text) or '' end
  if text == '' then return nil end
  local p = { description = text, status = type(kind) == 'string' and STATUS[kind:lower()] or 'info' }
  local ms = tonumber(length)
  p.duration = ms and ms >= 0 and math.floor(ms) or DEFAULT_LENGTH
  if type(style) == 'table' then p.meta = { style = style } end
  return p
end

local function show(kind, text, length, style)
  local p = props(kind, text, length, style)
  if p then nk.notify(p) end
end

local function SendAlert(data)
  if type(data) ~= 'table' then return end
  show(data.type, data.text, data.length, data.style)
end

local function PersistentAlert(data)
  if type(data) ~= 'table' or data.id == nil then return end
  local id = tostring(data.id)
  local action = type(data.action) == 'string' and data.action:lower() or nil
  if action == 'end' then
    local h = persistent[id]
    persistent[id] = nil
    if h and h:isOpen() then h:cancel() end
    return
  end
  if action ~= 'start' then return end
  local p = props(data.type, data.text, nil, data.style)
  if not p then return end
  p.id = 'persistent:' .. id
  p.duration = 0
  persistent[id] = nk.notify(p)
end

local API = {
  DoHudText = function(kind, text) show(kind, text) end,
  DoLongHudText = function(kind, text, length) show(kind, text, length) end,
  DoCustomHudText = function(kind, text, length, style) show(kind, text, length, style) end,
  SendAlert = SendAlert,
  PersistentAlert = PersistentAlert,
}
for name, fn in pairs(API) do
  exports(name, fn)
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end
RegisterNetEvent('mythic_notify:client:SendAlert', SendAlert)
RegisterNetEvent('mythic_notify:client:PersistentAlert', PersistentAlert)
