-- nuikit_pause: server
-- Players online for the menu, and Disconnect. A client can only ever drop itself.

local last = {}

RegisterNetEvent('nuikit_pause:request', function()
  local src = source
  local now = GetGameTimer()
  if last[src] and now - last[src] < 1000 then return end
  last[src] = now
  TriggerClientEvent('nuikit_pause:info', src, {
    players = #GetPlayers(),
    max = GetConvarInt('sv_maxclients', 48),
  })
end)

RegisterNetEvent('nuikit_pause:disconnect', function()
  DropPlayer(source, Config.disconnectReason or 'Disconnected.')
end)

AddEventHandler('playerDropped', function()
  last[source] = nil
end)
