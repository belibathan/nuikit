-- nuikit_loading: client scripts start once the game has loaded, while the loading screen is
-- still up (loadscreen_manual_shutdown). Close it, or tell it we're waiting on another resource.

Loading = {}

--- Is Qbox's own character menu going to close the loading screen?
--- qbx_core's client/character.lua picks a character before spawning and calls
--- ShutdownLoadingScreen() + ShutdownLoadingScreenNui() itself once its preview scene is ready,
--- unless its config/client.lua sets `characters.useExternalCharacters = true` (then that file
--- returns at once and another resource does the job). Qbox has no convar for it, so the setting is
--- read from that file, which qbx_core sends to clients (`files` in its fxmanifest).
---@return boolean
function Loading.qboxCharacters()
  -- the client only knows resources the server started; anything but 'missing' will run here
  local state = GetResourceState('qbx_core')
  if state == 'missing' or state == 'unknown' then return false end
  local src = LoadResourceFile('qbx_core', 'config/client.lua')
  -- unreadable: qbx_core's default is its own menu
  if type(src) ~= 'string' then return true end
  for line in src:gmatch('[^\n]+') do
    local value = line:gsub('%-%-.*$', ''):match('useExternalCharacters%s*=%s*(%a+)')
    if value then return value ~= 'true' end
  end
  return true
end

--- Wait for another resource to close the loading screen instead of closing it here?
--- Config.externalShutdown: true or false decides; 'auto' (or nil) waits only for Qbox's own
--- character menu.
---@return boolean
function Loading.external()
  local setting = Config.externalShutdown
  if setting == true or setting == false then return setting end
  return Loading.qboxCharacters()
end

CreateThread(function()
  if Loading.external() then
    SendLoadingScreenMessage(json.encode({ eventName = 'nuikit:ready' }))
    return
  end
  ShutdownLoadingScreen()
  ShutdownLoadingScreenNui()
end)
