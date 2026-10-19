-- nuikit_loading: client scripts start once the game has loaded, while the loading screen is
-- still up (loadscreen_manual_shutdown). Close it, or tell it we're waiting on another resource.
CreateThread(function()
  if Config.externalShutdown then
    SendLoadingScreenMessage(json.encode({ eventName = 'nuikit:ready' }))
    return
  end
  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
end)
