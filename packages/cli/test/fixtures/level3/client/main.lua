local hud = NUI.surface('hud', { layer = 'hud' })

CreateThread(function()
  local last
  while true do
    local vehicle = GetVehiclePedIsIn(PlayerPedId(), false)
    if vehicle ~= 0 then
      local speed = math.floor(GetEntitySpeed(vehicle) * 2.236936)
      if speed ~= last then
        last = speed
        NUI.send('hud:vehicle', { speed = speed })
      end
      Wait(100)
    else
      Wait(400)
    end
  end
end)

-- Keys need every frame; nothing is sent from this loop.
CreateThread(function()
  while true do
    if IsControlJustPressed(0, 19) then hud:toggle() end
    Wait(0)
  end
end)

hud:open({ units = 'mph' })
