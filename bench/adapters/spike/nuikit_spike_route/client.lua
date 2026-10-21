--[[
  nuikit adapter spike: page routing. Plays the `nuikit` runtime (docs/architecture.md §3,
  mechanism 3): an override page living in ANOTHER resource (ox_lib's) forwards an intent here,
  and here it is drawn by the runtime's frame.

  Two doors in:
    NUI callback  https://nuikit_spike_route/intent   { id, intent, props, echo? }
                  echo = true  → answered at once (measures the cross-resource callback hop)
                  otherwise    → sent to this resource's frame; answered when the frame resolves
                                 (measures the full intent round trip)
    export        exports.nuikit_spike_route:intent(name, props) → { id, t }
                  synchronous Lua → Lua; the frame is told fire-and-forget

  Prints one `[nuikit-spike:route]` line per 50 calls with the Lua-side timings, and keeps counts:
  /spike_route_stats.
]]

local TAG = '[nuikit-spike:route]'
local seq = 0
local pendingCb = {}   -- id → { cb, t0 }
local stats = { nui = 0, nuiEcho = 0, export = 0, resolved = 0, orphaned = 0, luaMsTotal = 0, luaMsMax = 0 }

local function nextId()
  seq = seq + 1
  return ('r%d'):format(seq)
end

local function note(dt)
  stats.luaMsTotal = stats.luaMsTotal + dt
  if dt > stats.luaMsMax then stats.luaMsMax = dt end
end

-- Door 1: another resource's page posts here.
RegisterNUICallback('intent', function(data, cb)
  local t0 = GetGameTimer()
  local id = type(data) == 'table' and data.id or nextId()
  if type(data) == 'table' and data.echo then
    stats.nuiEcho = stats.nuiEcho + 1
    cb({ id = id, echo = true, t = GetGameTimer() - t0 })
    return
  end
  stats.nui = stats.nui + 1
  pendingCb[id] = { cb = cb, t0 = t0 }
  SendNUIMessage({ action = 'spike:render', id = id, intent = data and data.intent, props = data and data.props })
  -- Nothing is answered yet: the frame resolves it below. If the frame never answers, the
  -- caller's fetch hangs; the orphan sweeper below answers after 2 s so a broken frame shows up
  -- as `orphaned`, not as a hang.
end)

-- The frame answers (the renderer resolved the intent).
RegisterNUICallback('resolve', function(data, cb)
  cb({})
  local p = data and pendingCb[data.id]
  if not p then return end
  pendingCb[data.id] = nil
  stats.resolved = stats.resolved + 1
  local dt = GetGameTimer() - p.t0
  note(dt)
  p.cb({ id = data.id, t = dt, frame = data.frameMs })
  if stats.resolved % 50 == 0 then
    print(('%s %d resolved · Lua-side avg %.2f ms · max %d ms'):format(TAG, stats.resolved, stats.luaMsTotal / stats.resolved, stats.luaMsMax))
  end
end)

-- Door 2: Lua export, synchronous.
exports('intent', function(name, props)
  local t0 = GetGameTimer()
  stats.export = stats.export + 1
  local id = nextId()
  SendNUIMessage({ action = 'spike:render', id = id, intent = name, props = props, fireAndForget = true })
  return { id = id, t = GetGameTimer() - t0 }
end)

-- Orphan sweeper: a pending callback older than 2 s is answered with an error.
CreateThread(function()
  while true do
    Wait(1000)
    local now = GetGameTimer()
    for id, p in pairs(pendingCb) do
      if now - p.t0 > 2000 then
        pendingCb[id] = nil
        stats.orphaned = stats.orphaned + 1
        p.cb({ id = id, error = 'frame did not resolve within 2 s' })
      end
    end
  end
end)

RegisterCommand('spike_route_stats', function()
  print(('%s %s'):format(TAG, json.encode(stats)))
end, false)

print(TAG .. ' started · callback https://nuikit_spike_route/intent · export intent(name, props)')
