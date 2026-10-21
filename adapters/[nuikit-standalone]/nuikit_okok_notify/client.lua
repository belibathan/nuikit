--[[
  nuikit_okok_notify: okokNotify's public API, drawn by nk.notify (docs/adapters/okok-notify.md).

  Mechanism: stand-in. `provide 'okokNotify'` plus `Alert` registered under okokNotify's name, and the
  client event `okokNotify:Alert` (the server path) handled. okokNotify is only UI, so nothing else is kept.
  `phone` / `neutral` draw as info with `meta.kind`; `playSound` travels as `sound` (nuikit plays nothing yet).
]]

local LIB = 'okokNotify'
local STATUS = { success = 'success', info = 'info', warning = 'warning', error = 'error' }

local function Alert(title, message, time, kind, playSound)
  if type(title) ~= 'string' then title = title ~= nil and tostring(title) or nil end
  if type(message) ~= 'string' then message = message ~= nil and tostring(message) or nil end
  if (title == nil or title == '') and (message == nil or message == '') then return end
  local props = { title = title ~= '' and title or nil, description = message ~= '' and message or nil }
  local k = type(kind) == 'string' and kind:lower() or nil
  props.status = k and STATUS[k] or 'info'
  if k and not STATUS[k] then props.meta = { kind = kind } end
  local ms = tonumber(time)
  if ms and ms >= 0 then props.duration = math.floor(ms) end
  if playSound ~= nil then props.sound = playSound == true end
  nk.notify(props)
end

exports('Alert', Alert)
AddEventHandler(('__cfx_export_%s_Alert'):format(LIB), function(setCB) setCB(Alert) end)
RegisterNetEvent('okokNotify:Alert', function(title, message, time, kind, playSound)
  Alert(title, message, time, kind, playSound)
end)
