CreateThread(function()
  while true do
    if IsPedShooting(PlayerPedId()) then TriggerServerEvent('stress:gain', 1) end
    Wait(0)
  end
end)
