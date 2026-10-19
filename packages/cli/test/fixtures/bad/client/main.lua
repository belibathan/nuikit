local open = false

RegisterCommand('shop', function()
  open = true
  SetNuiFocus(true, true)
  SendNUIMessage({ action = 'open' })
end)

RegisterNUICallback('close', function(_, cb)
  open = false
  SetNuiFocus(false, false) -- SetNuiFocus(true) in a comment is not a call
  cb('ok')
end)

CreateThread(function()
  while true do
    if open then
      SendNUIMessage({ action = 'tick', data = GetGameTimer() })
    end
    Wait(0)
  end
end)

print('SetNuiFocus is only text here')
