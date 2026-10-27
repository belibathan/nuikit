--[[
  A per-player rate limiter: at most `maxRequests` in any `timeWindowMs` window (sliding).
  Side: server. Load from fxmanifest (server_scripts or shared_scripts).
  From fivem-foundation (upstream/examples/helpers/rate_limiter.lua, MIT), STANDARDS §15.

    local requests = RateLimiter:new(10, 1000)
    RegisterNetEvent('my_resource:server:buy', function()
      local src = source
      if not requests:allow(src) then return end
    end)
    AddEventHandler('playerDropped', function() requests:cleanup(source) end)
]]

-- GLOBAL: class table, shared by every file of this resource
RateLimiter = RateLimiter or {}
RateLimiter.__index = RateLimiter

--- @param maxRequests number
--- @param timeWindowMs number
--- @return table
function RateLimiter:new(maxRequests, timeWindowMs)
  assert(type(maxRequests) == 'number' and maxRequests > 0, 'maxRequests must be a positive number')
  assert(type(timeWindowMs) == 'number' and timeWindowMs > 0, 'timeWindowMs must be a positive number')

  local limiter = setmetatable({}, RateLimiter)
  limiter.maxRequests = maxRequests
  limiter.timeWindow = timeWindowMs
  limiter.requests = {}
  return limiter
end

--- May this player make a request now? Counts it when yes.
--- @param playerId number
--- @return boolean
function RateLimiter:allow(playerId)
  assert(type(playerId) == 'number', 'playerId must be a number')

  local now = GetGameTimer()
  local list = self.requests[playerId] or {}
  local valid = {}

  for _, ts in ipairs(list) do
    if now - ts < self.timeWindow then valid[#valid + 1] = ts end
  end

  if #valid >= self.maxRequests then
    self.requests[playerId] = valid
    return false
  end

  valid[#valid + 1] = now
  self.requests[playerId] = valid
  return true
end

--- Forget a player (playerDropped).
--- @param playerId number
function RateLimiter:cleanup(playerId)
  self.requests[playerId] = nil
end
