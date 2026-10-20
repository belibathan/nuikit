-- {{name}}: client
-- Client scripts start once the game has loaded, while the loading screen is still up
-- (loadscreen_manual_shutdown). Close it, or tell it we're waiting for your multicharacter.
CreateThread(function()
  if Config.externalShutdown then
    -- the page shows "Ready" until your multicharacter calls ShutdownLoadingScreenNui()
    SendLoadingScreenMessage(json.encode({ eventName = 'nuikit:ready' }))
    return
  end
  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
end)
