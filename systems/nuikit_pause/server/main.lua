-- nuikit_pause: server
-- Players online, ping, uptime and the next restart for the menu, and Disconnect. A client can only
-- ever drop itself.

local last = {}
local started = os.time()

--- Seconds until the next time in Config.restarts ('HH:MM', server time), or nil.
local function restartIn()
  local list = Config.restarts
  if type(list) ~= 'table' or #list == 0 then return nil end
  local now = os.time()
  local t = os.date('*t', now)
  local best
  for _, hhmm in ipairs(list) do
    local h, m = tostring(hhmm):match('^(%d+):(%d+)$')
    if h then
      local at = os.time({ year = t.year, month = t.month, day = t.day, hour = tonumber(h), min = tonumber(m), sec = 0 })
      if at <= now then at = at + 86400 end
      if not best or at < best then best = at end
    end
  end
  return best and (best - now) or nil
end

local function projectName()
  local name = GetConvar('sv_projectName', '')
  if name == '' then name = GetConvar('sv_hostname', '') end
  return (name:gsub('%^%d', '')) -- strip ^1 colour codes
end

RegisterNetEvent('nuikit_pause:request', function()
  local src = source
  local now = GetGameTimer()
  if last[src] and now - last[src] < 1000 then return end
  last[src] = now
  TriggerClientEvent('nuikit_pause:info', src, {
    players = #GetPlayers(),
    max = GetConvarInt('sv_maxclients', 48),
    name = projectName(),
    ping = GetPlayerPing(src),
    uptime = os.time() - started,
    restartIn = restartIn(),
  })
end)

RegisterNetEvent('nuikit_pause:disconnect', function()
  DropPlayer(source, Config.disconnectReason or 'Disconnected.')
end)

AddEventHandler('playerDropped', function()
  last[source] = nil
end)
