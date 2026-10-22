-- nuikit_voice: pma-voice's state as slots in a nuikit cluster (docs/slots.md). Presentation only:
-- it reads pma-voice's player state bags (proximity, radioChannel, radioActive, callChannel) and the
-- talking native, and never calls or changes pma-voice.

local slots = {}

--- Join (or update) one slot; `on` false hides it without leaving the cluster.
local function put(key, on, props)
  local cfg = Config[key]
  if not cfg or not cfg.show then return end
  if not slots[key] then
    if not on then return end
    props.order = cfg.order
    props.hidden = false
    slots[key] = NUI.slot(Config.cluster, key, props)
    return
  end
  props.hidden = not on
  slots[key].set(props)
end

local function leave()
  for key, slot in pairs(slots) do
    slot.remove()
    slots[key] = nil
  end
end

local function read()
  local state = LocalPlayer.state
  local talking = NetworkIsPlayerTalking(PlayerId()) and true or false

  -- proximity = { index, distance, mode } (pma-voice sets it on every range change)
  local prox = state.proximity
  local mode = type(prox) == 'table' and prox.mode or nil
  put('range', mode ~= nil, {
    icon = 'mic',
    label = 'Voice',
    value = mode or '',
    hue = talking and 'success' or 'neutral',
    alert = false,
  })

  local radio = tonumber(state.radioChannel) or 0
  local transmitting = state.radioActive == true
  put('radio', radio > 0, {
    icon = 'radio',
    label = 'Radio',
    value = radio > 0 and (('%s MHz'):format(radio)) or '',
    hue = transmitting and 'success' or 'info',
    alert = false,
  })

  local call = tonumber(state.callChannel) or 0
  put('call', call > 0, {
    icon = 'phone',
    label = 'Call',
    value = call > 0 and 'In call' or '',
    hue = (call > 0 and talking) and 'success' or 'info',
    alert = false,
  })
end

CreateThread(function()
  while true do
    if GetResourceState(Config.voice) == 'started' then
      read()
    elseif next(slots) then
      leave()
    end
    Wait(Config.interval or 200)
  end
end)

AddEventHandler('onResourceStop', function(name)
  if name == GetCurrentResourceName() then leave() end
end)
