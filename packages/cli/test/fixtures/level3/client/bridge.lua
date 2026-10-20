-- bridge.lua (fixture stub)
NUI.player = NUI.player or {}
CreateThread(function()
  while true do
    NUI.send('nuikit:player', { health = GetEntityHealth(PlayerPedId()) })
    Wait(250)
  end
end)
