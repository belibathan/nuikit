-- {{name}}: server
-- Players online, ping and uptime for the menu, and Disconnect. A client can only ever drop itself.

local started = os.time()
local last = {}

local function projectName()
  local name = GetConvar('sv_projectName', '')
  if name == '' then name = GetConvar('sv_hostname', '') end
  return (name:gsub('%^%d', '')) -- strip ^1 colour codes
end

RegisterNetEvent('{{name}}:request', function()
  local src = source
  local now = GetGameTimer()
  if last[src] and now - last[src] < 1000 then return end -- one answer a second per player
  last[src] = now
  TriggerClientEvent('{{name}}:info', src, {
    name = projectName(),
    players = #GetPlayers(),
    max = GetConvarInt('sv_maxclients', 48),
    ping = GetPlayerPing(src),
    uptime = os.time() - started,
  })
end)

RegisterNetEvent('{{name}}:disconnect', function()
  DropPlayer(source, Config.disconnectReason or 'Disconnected.')
end)

AddEventHandler('playerDropped', function()
  last[source] = nil
end)
