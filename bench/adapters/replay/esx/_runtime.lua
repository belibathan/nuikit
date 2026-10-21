--[[
  A stand-in for the `nuikit` resource's intent runtime (systems/nuikit/client/intents.lua) for replay
  tests: validates like it, stacks like it, records every open/update/cancel as a NUI message, and lets
  the test play the player through exports (`pick`, `escape`, `emit`) addressed to the newest open
  intent of a kind. notify ends on its duration, progress resolves true at its duration and refuses a
  second one with 'busy', as the real runtime does. Loaded after lib/intents.lua in a resource named nuikit.
]]

local open = {}
local seq = 0

local function newest(kind)
  local best
  for _, it in pairs(open) do
    if it.kind == kind and (not best or it.seq > best.seq) then best = it end
  end
  return best
end

local function close(it, result, reason, data)
  if not open[it.id] then return end
  open[it.id] = nil
  TriggerEvent('nuikit:intent:resolved', it.id, { result = result, reason = reason, data = data })
end

AddEventHandler('nuikit:intent:open', function(id, kind, props)
  local from = GetInvokingResource()
  local issues = NUI.intents.validate(kind, props)
  if #issues > 0 then
    print(('invalid %s from %s: %s %s'):format(kind, tostring(from), issues[1].path, issues[1].message))
    TriggerEvent('nuikit:intent:resolved', id, { reason = 'invalid' })
    return
  end
  if kind == 'progress' and not open[id] then
    for _, other in pairs(open) do
      if other.kind == 'progress' then TriggerEvent('nuikit:intent:resolved', id, { reason = 'busy' }) return end
    end
  end
  seq = seq + 1
  local it = { id = id, kind = kind, resource = from, props = props, seq = seq }
  open[id] = it
  SendNUIMessage({ op = 'open', id = id, kind = kind, resource = from, props = props })
  if kind == 'notify' then
    local d = props.duration == nil and 5000 or props.duration
    if d > 0 then SetTimeout(d, function() if open[id] == it then close(it, nil, 'timeout') end end) end
  elseif kind == 'progress' and props.value == nil then
    SetTimeout(props.duration, function() if open[id] == it then close(it, true) end end)
  end
end)

AddEventHandler('nuikit:intent:update', function(id, patch)
  local it = open[id]
  if not it or it.resource ~= GetInvokingResource() then return end
  for k, v in pairs(patch) do it.props[k] = v end
  SendNUIMessage({ op = 'update', id = id, kind = it.kind, props = patch })
end)

AddEventHandler('nuikit:intent:cancel', function(id, reason)
  local it = open[id]
  if not it or it.resource ~= GetInvokingResource() then return end
  SendNUIMessage({ op = 'cancel', id = id, kind = it.kind, reason = reason })
  close(it, nil, reason or 'cancel')
end)

-- The player: the newest intent of `kind` resolves with `result` (+ data).
exports('pick', function(kind, result, data)
  local it = newest(kind)
  if not it then print('pick: no open ' .. kind) return false end
  close(it, result, nil, data)
  return true
end)

-- Escape on the newest intent of `kind`; a menu that cannot close ignores it, as the renderer does.
exports('escape', function(kind)
  local it = newest(kind)
  if not it then return false end
  if kind == 'menu' and (it.props.canClose == false or it.props.dismissable == false) then return false end
  if kind == 'input' and it.props.allowCancel == false then return false end
  close(it, nil, 'escape')
  return true
end)

-- An event from the renderer (menu 'select', 'scroll', 'change', 'field'…).
exports('emit', function(kind, event, data)
  local it = newest(kind)
  if not it then return false end
  TriggerEvent('nuikit:intent:event', it.id, event, data)
  return true
end)

exports('count', function(kind)
  local n = 0
  for _, it in pairs(open) do if not kind or it.kind == kind then n = n + 1 end end
  return n
end)
