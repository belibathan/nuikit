-- nuikit adapter spike, caller (server): answers the stand-in's isServer pick and sends the notify
-- events the way real scripts do (TriggerClientEvent from the server), for the listener spike.

RegisterNetEvent('nuikit_spike_caller:ping', function(args)
  local src = source
  print(('[nuikit-spike:caller] server got ping from %d args=%s'):format(src, json.encode(args)))
  TriggerClientEvent('nuikit_spike_caller:pong', src, args)
end)

RegisterNetEvent('nuikit_spike_caller:notifyMe', function()
  local src = source
  TriggerClientEvent('QBCore:Notify', src, 'Spike: QBCore:Notify from server', 'success', 4000)
  TriggerClientEvent('QBCore:Notify', src, { text = 'Spike: table form from server', caption = 'Caption' }, 'error', 4000)
  TriggerClientEvent('ox_lib:notify', src, { title = 'Spike: ox_lib:notify from server', description = 'event path', type = 'inform' })
  TriggerClientEvent('esx:showNotification', src, 'Spike: esx:showNotification from server', 'info', 4000)
  TriggerClientEvent('okokNotify:Alert', src, 'Spike', 'okokNotify:Alert from server', 4000, 'info')
  TriggerClientEvent('mythic_notify:client:SendAlert', src, { type = 'inform', text = 'Spike: mythic from server', length = 4000 })
end)
