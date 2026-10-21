--[[
  nuikit adapter spike: listener (docs/architecture.md §3, mechanism 2).

  Handles the notify events each framework emits and logs them, so the owner can count what a
  listener sees against what the player sees on screen. Draws nothing.

    QBCore:Notify (text|{text,caption}, type, length)        qb-core and qbx_core's qb bridge
    ox_lib:notify ({ title, description, type, … })          server → client lib.notify
    esx:showNotification (msg, type, length, title, position) es_extended / esx_notify
    okokNotify:Alert (title, message, time, type, playSound)
    mythic_notify:client:SendAlert ({ type, text, length, style })
    mythic_notify:client:PersistentAlert ({ action, id, type, text, style })

  What a listener cannot see, by design: direct calls into the library (exports.qbx_core:Notify,
  QBCore.Functions.Notify, lib.notify). /spike_notify direct in the caller sends those; they must
  be missing from this log and present on screen. That gap is the listener's result.

  Silencing the library's own drawing: none of these libraries has a public config flag for it
  (results.md has the table). The one generic lever is CancelEvent() from the handler, which
  FiveM only honours in some cases. `setr nuikit_spike_listener_cancel 1` turns it on so the
  owner can see whether the library's own notification still draws.
]]

local TAG = '[nuikit-spike:listener]'
local log = {}
local counts = {}
local CANCEL = GetConvarInt('nuikit_spike_listener_cancel', 0) == 1

local function record(event, args)
  counts[event] = (counts[event] or 0) + 1
  local entry = { t = GetGameTimer(), event = event, from = GetInvokingResource() or 'server/unknown', args = args }
  log[#log + 1] = entry
  print(('%s %s'):format(TAG, json.encode(entry)))
  if CANCEL then CancelEvent() end
end

local function textOf(text)
  if type(text) == 'table' then return { text = text.text, caption = text.caption } end
  return text
end

RegisterNetEvent('QBCore:Notify', function(text, ntype, length)
  record('QBCore:Notify', { text = textOf(text), type = ntype, length = length })
end)

RegisterNetEvent('ox_lib:notify', function(data)
  data = type(data) == 'table' and data or {}
  record('ox_lib:notify', {
    id = data.id, title = data.title, description = data.description, type = data.type,
    duration = data.duration, position = data.position, icon = data.icon, iconColor = data.iconColor,
    hasStyle = data.style ~= nil, showDuration = data.showDuration,
  })
end)

RegisterNetEvent('esx:showNotification', function(msg, ntype, length, title, position)
  record('esx:showNotification', { message = msg, type = ntype, length = length, title = title, position = position })
end)

RegisterNetEvent('esx:showAdvancedNotification', function(sender, subject, msg, textureDict, iconType, flash, saveToBrief, hudColorIndex)
  record('esx:showAdvancedNotification', { sender = sender, subject = subject, message = msg, textureDict = textureDict, iconType = iconType })
end)

RegisterNetEvent('okokNotify:Alert', function(title, message, time, ntype, playSound)
  record('okokNotify:Alert', { title = title, message = message, time = time, type = ntype, playSound = playSound })
end)

RegisterNetEvent('mythic_notify:client:SendAlert', function(data)
  data = type(data) == 'table' and data or {}
  record('mythic_notify:client:SendAlert', { type = data.type, text = data.text, length = data.length, hasStyle = data.style ~= nil })
end)

RegisterNetEvent('mythic_notify:client:PersistentAlert', function(data)
  data = type(data) == 'table' and data or {}
  record('mythic_notify:client:PersistentAlert', { action = data.action, id = data.id, type = data.type, text = data.text })
end)

RegisterCommand('spike_listener', function(_, args)
  local sub = args[1]
  if sub == 'dump' then
    print(('%s %d entries · counts %s'):format(TAG, #log, json.encode(counts)))
    for _, e in ipairs(log) do print(TAG .. ' ' .. json.encode(e)) end
  elseif sub == 'counts' then
    print(('%s %s'):format(TAG, json.encode(counts)))
  elseif sub == 'clear' then
    log, counts = {}, {}
    print(TAG .. ' cleared')
  else
    print(TAG .. ' usage: /spike_listener dump | counts | clear')
  end
end, false)

exports('spikeLog', function() return log end)

print(('%s started · cancel=%s'):format(TAG, tostring(CANCEL)))
