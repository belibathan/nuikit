--[[
  Bounded waiting: every `while` has a limiter. Poll until a condition holds or a deadline passes;
  the service-loop interval is 1000 ms unless you say otherwise.
  Side: shared. Load from fxmanifest (shared_scripts).
  From fivem-foundation (upstream/examples/helpers/wait.lua, MIT), STANDARDS §8.

    -- a spawn, a model, a network id: poll fast, but never past the deadline
    local ok = WaitLimiter.waitUntil(function() return DoesEntityExist(entity) end, { timeout = 3000, interval = 50 })

    -- a service loop
    while active do
      work()
      Wait(WaitLimiter.interval())
    end

  An interval under the service default is fine when a timeout bounds it (streaming, spawns: the
  foundation measures 28–594 ms for a model). Render loops use Wait(0) directly, with a comment.
]]

-- GLOBAL: helper table, shared by every file of this resource
WaitLimiter = WaitLimiter or {}

WaitLimiter.DEFAULT_INTERVAL_MS = 1000
WaitLimiter.DEFAULT_TIMEOUT_MS = 1000

--- The interval for a service loop: at least the default (1000 ms).
--- @param ms? number
--- @return number
function WaitLimiter.interval(ms)
  if type(ms) ~= 'number' or ms < WaitLimiter.DEFAULT_INTERVAL_MS then
    return WaitLimiter.DEFAULT_INTERVAL_MS
  end
  return ms
end

--- Poll `condition` until it returns true or `timeout` ms pass. Stops early when this resource is
--- no longer started. Returns whether the condition held.
--- @param condition fun(): boolean
--- @param options? { timeout?: number, interval?: number, onTimeout?: fun() }
--- @return boolean
function WaitLimiter.waitUntil(condition, options)
  assert(type(condition) == 'function', 'condition must be a function')
  options = options or {}

  local timeout = type(options.timeout) == 'number' and options.timeout or WaitLimiter.DEFAULT_TIMEOUT_MS
  local interval = type(options.interval) == 'number' and options.interval >= 0 and options.interval or WaitLimiter.interval()
  local deadline = GetGameTimer() + timeout
  local resource = GetCurrentResourceName()

  while GetGameTimer() < deadline do
    if GetResourceState and GetResourceState(resource) ~= 'started' then return false end
    if condition() then return true end
    Wait(interval)
  end

  if type(options.onTimeout) == 'function' then options.onTimeout() end
  return false
end
