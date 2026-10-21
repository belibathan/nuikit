--[[
  nuikit_qb_notify: QBCore:Notify on the `notify` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-core-notify.md. A listener: every TriggerEvent / TriggerClientEvent
  'QBCore:Notify' (text | { text, caption }, textype?, length?) becomes nk.notify. The event is never
  cancelled, so other listeners still run.

  Direct QBCore.Functions.Notify calls never raise the event: those reach qb-core's own page. The optional
  silencer page in override/ (copied over qb-core's html/) draws nothing and forwards every message it gets
  to this resource (NUI callback `page`), which prints them with `nuikit_debug 1` and draws the ones that
  look like a notification (a string `text` field). Unproven in game: the message shape, and whether a page
  in qb-core may fetch https://nuikit_qb_notify/page (spike step 8).
]]

local debug = GetConvarInt('nuikit_debug', 0) == 1

Config = {
  position = nil, -- an anchor ('top-right' …); nil keeps the renderer's default
  duration = 5000,
}

local function log(...)
  if debug then print('^5[nuikit-qb:notify]^7', ...) end
end

local STATUS = { primary = 'info', success = 'success', error = 'error', warning = 'warning' }

local function notify(text, textype, length)
  local props = { meta = { library = 'qb-core' } }
  if type(text) == 'table' then
    props.description = text.text ~= nil and tostring(text.text) or nil
    props.title = text.caption ~= nil and tostring(text.caption) or nil
  elseif text ~= nil then
    props.description = tostring(text)
  end
  if not props.title and not props.description then return end
  local kind = type(textype) == 'string' and textype or 'primary'
  props.status = STATUS[kind] or 'info'
  if not STATUS[kind] then props.meta.kind = kind end
  props.duration = tonumber(length) or Config.duration
  if Config.position then props.position = Config.position end
  nk.notify(props)
  log(props.status, props.description or props.title)
end

RegisterNetEvent('QBCore:Notify', function(text, textype, length)
  notify(text, textype, length)
end)

-- The silencer page (override/html/index.html) forwards qb-core's own page messages here.
RegisterNUICallback('page', function(msg, cb)
  cb({ ok = true })
  if type(msg) ~= 'table' then return end
  if debug then print('[nuikit-qb:page] ' .. json.encode(msg)) end
  TriggerEvent('nuikit_qb:page', msg)
  if type(msg.text) == 'string' then
    notify(msg.caption and { text = msg.text, caption = msg.caption } or msg.text, msg.type, msg.length)
  end
end)

exports('notify', notify)
