RegisterCommand('garage', function()
  SetNuiFocus(true, true)
  SendNUIMessage({ action = 'garage:open' })
end)

RegisterNUICallback('garage:close', function(_, cb)
  SetNuiFocus(false, false)
  cb({})
end)

AddEventHandler('onResourceStop', function(resource)
  if resource ~= GetCurrentResourceName() then return end
  SetNuiFocus(false, false)
end)

CreateThread(function()
  while true do
    SendNUIMessage({ action = 'garage:clock', data = GetClockHours() })
    Wait(1000)
  end
end)
