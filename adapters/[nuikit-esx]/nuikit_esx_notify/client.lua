--[[
  nuikit_esx_notify: esx_notify's public API, drawn by nk.intent.notify (docs/adapters/esx-notify.md).

  Mechanism: stand-in + listener.
    - `provide 'esx_notify'` (fxmanifest) stands in for the resource; the `Notify` export is registered
      under esx_notify's own name (`__cfx_export_esx_notify_Notify`), so `ESX.ShowNotification` and
      `exports['esx_notify']:Notify(...)` land here.
    - The server path (`esx:showNotification`) is listened to as well. When es_extended turns that event
      into the export call, the same toast would arrive twice: a repeat of the same text within DEDUP_MS
      reuses the toast's id, which the runtime updates in place instead of stacking a second one.

  Only UI is translated. ESX.ShowAdvancedNotification (GTA's feed with a picture) and ShowHelpNotification
  (GTA's help text) are drawn natively by es_extended and stay there; `setr nuikit_esx_notify_advanced 1`
  additionally draws the server-sent advanced notification as a toast (the native one still shows).
]]

local LIB = 'esx_notify'
local DEDUP_MS = 250

-- esx positions → the intent's anchors (docs/adapters/esx-notify.md, "Intent and field mapping").
local POSITIONS = {
  ['top-left'] = 'top-left', ['top-right'] = 'top-right', ['top-middle'] = 'top',
  ['bottom-left'] = 'bottom-left', ['bottom-right'] = 'bottom-right', ['bottom-middle'] = 'bottom',
  ['middle-left'] = 'center-left', ['middle-right'] = 'center-right',
}
local STATUS = { success = 'success', error = 'error', info = 'info', warning = 'warning' }

local recent = {} -- dedup key → { id, at }
local counter = 0

local function toastId(key)
  local now = GetGameTimer()
  local r = recent[key]
  if r and now - r.at <= DEDUP_MS then
    r.at = now
    return r.id
  end
  -- Keep the table small: drop what is older than the window.
  for k, v in pairs(recent) do
    if now - v.at > DEDUP_MS then recent[k] = nil end
  end
  counter = counter + 1
  local id = ('esx:%d'):format(counter)
  recent[key] = { id = id, at = now }
  return id
end

--- Draw one esx notification. Every argument is optional but the message.
local function show(message, kind, length, title, position)
  if type(message) ~= 'string' then message = message ~= nil and tostring(message) or nil end
  if type(title) ~= 'string' then title = title ~= nil and tostring(title) or nil end
  if (message == nil or message == '') and (title == nil or title == '') then return end
  local props = {
    id = toastId(table.concat({ tostring(kind), tostring(title), tostring(message) }, '\n')),
    title = title,
    description = message,
    status = type(kind) == 'string' and STATUS[kind:lower()] or nil,
    position = type(position) == 'string' and POSITIONS[position:lower()] or nil,
  }
  local ms = tonumber(length)
  if ms and ms >= 0 then props.duration = math.floor(ms) end
  if props.status == nil and kind ~= nil then props.meta = { type = kind } end -- an unknown type still reaches a renderer
  nk.intent.notify(props)
end

-- ───────────────────────────────── the library's API, by name

--- exports['esx_notify']:Notify(type, message, length, title, position), as the docs example orders it.
--- If a build passes (type, length, message, …) instead (number second, string third), the arguments are
--- put back in place; the recording decides which order the library really used.
local function Notify(kind, message, length, title, position)
  if type(message) == 'number' and type(length) == 'string' then message, length = length, message end
  show(message, kind, length, title, position)
end

exports('Notify', Notify)
AddEventHandler(('__cfx_export_%s_Notify'):format(LIB), function(setCB) setCB(Notify) end)

-- The server path: TriggerClientEvent('esx:showNotification', id, message, type, length, title, position).
RegisterNetEvent('esx:showNotification', function(message, kind, length, title, position)
  show(message, kind, length, title, position)
end)

-- Optional: the server-sent advanced notification as a toast, with the picture in meta for a renderer.
if GetConvarInt('nuikit_esx_notify_advanced', 0) == 1 then
  RegisterNetEvent('esx:showAdvancedNotification', function(sender, subject, msg, textureDict, iconType, flash)
    local lines = {}
    if type(subject) == 'string' and subject ~= '' then lines[#lines + 1] = subject end
    if type(msg) == 'string' and msg ~= '' then lines[#lines + 1] = msg end
    local description = table.concat(lines, '\n')
    if (type(sender) ~= 'string' or sender == '') and description == '' then return end
    nk.intent.notify({
      title = type(sender) == 'string' and sender or nil,
      description = description ~= '' and description or nil,
      meta = { picture = textureDict, iconType = iconType, flash = flash == true },
    })
  end)
end
