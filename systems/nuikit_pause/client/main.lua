-- nuikit_pause: client
-- Esc opens this menu instead of GTA's pause menu. P (and the Map / Settings buttons) still open
-- the game's own frontend. Player data comes from bridge.lua; the player count from server/main.lua.

local RESOURCE = GetCurrentResourceName()
local ESC = 200          -- INPUT_FRONTEND_PAUSE_ALTERNATE (Esc). P is 199 and is left alone.
local QUIET_MS = 400     -- ignore Esc this long after a menu closes, so one press can't reopen it
local BLUR_MS = 200.0

local pause = NUI.surface('pause', {
  layer = 'modal', input = 'full', exclusive = true, hides = { 'hud' }, blockedBy = { 'dead' },
})

Pause = {}

local info = {}          -- { players, max } from the server, refreshed on every open
local wasOpen = false
local quietUntil = 0
-- set when a button opened one of GTA's frontend menus: bring ours back once it closes
local returning = nil   -- { seen = bool, deadline = ms }

local enabled = {}
for _, b in ipairs(Config.buttons or {}) do enabled[b] = true end

local function payload()
  local me = PlayerId()
  local server = {}
  for k, v in pairs(Config.server or {}) do server[k] = v end
  if not server.name or server.name == '' then server.name = info.name end
  return {
    server = server,
    links = Config.links or {},
    buttons = Config.buttons or {},
    help = Config.help or {},
    serverId = GetPlayerServerId(me),
    playerName = GetPlayerName(me),
    players = info.players,
    maxPlayers = info.max,
  }
end

--- Why the menu can't open right now, or nil. While it's blocked Esc is left to the game.
---@return string|nil
function Pause.blocked()
  if IsPauseMenuActive() then return 'frontend' end
  -- chat input, a phone, another resource's UI: whoever has focus owns Esc
  if IsNuiFocused() then return 'focus' end
  local player = NUI.player.get()
  if player.dead or NUI.getState('dead') then return 'dead' end
  for _, e in ipairs(NUI.surfaces()) do
    if not (e.resource == RESOURCE and e.name == 'pause') then
      if e.layer == 'modal' or e.layer == 'system' then return 'modal' end
      if e.input ~= 'none' then return 'surface' end
    end
  end
  return nil
end

---@return boolean
function Pause.open()
  if pause:isOpen() or Pause.blocked() then return false end
  SetPauseMenuActive(false)
  if not pause:open(payload()) then return false end
  wasOpen = true
  -- CEF draws over the game, so the world's blur has to come from GTA
  TriggerScreenblurFadeIn(BLUR_MS)
  TriggerServerEvent('nuikit_pause:request')
  return true
end

function Pause.close()
  pause:close()
  quietUntil = GetGameTimer() + QUIET_MS
  if wasOpen then
    wasOpen = false
    TriggerScreenblurFadeOut(BLUR_MS)
  end
end

function Pause.isOpen()
  return pause:isOpen()
end

--- One frame of the Esc watcher. Cheap: a few natives, no allocations.
function Pause.tick()
  local now = GetGameTimer()
  if pause:isOpen() then
    wasOpen = true
    SetPauseMenuActive(false)
    return
  end
  if wasOpen then
    -- closed by Esc in the UI (nuikit.lua handles that) or by another surface
    wasOpen = false
    quietUntil = now + QUIET_MS
    TriggerScreenblurFadeOut(BLUR_MS)
  end
  if IsPauseMenuActive() then
    -- the game's frontend (P, Map, Settings) owns Esc until it closes
    quietUntil = now + QUIET_MS
    if returning then returning.seen = true end
    return
  end
  if returning then
    if returning.seen then
      -- the frontend we opened just closed: back to our menu, like GTA's own pause menu
      returning = nil
      Pause.open()
      return
    elseif now > returning.deadline then
      returning = nil -- it never opened; give up quietly
    end
  end
  if IsNuiFocused() then return end
  local player = NUI.player.get()
  if player.dead or NUI.getState('dead') then return end

  DisableControlAction(0, ESC, true)
  if now >= quietUntil and IsDisabledControlJustPressed(0, ESC) then
    SetPauseMenuActive(false)
    Pause.open()
  end
end

--- Close ours, then open one of the game's frontend menus.
---@param menu string FE_MENU_VERSION_* name
---@param deeper? boolean step into the first tab (the map) once it's open
local function frontend(menu, deeper)
  Pause.close()
  if Config.returnToMenu ~= false then returning = { seen = false, deadline = GetGameTimer() + 2000 } end
  CreateThread(function()
    Wait(50) -- let NUI focus drop first
    ActivateFrontendMenu(GetHashKey(menu), false, -1)
    if deeper then
      Wait(100)
      PauseMenuceptionGoDeeper(0)
    end
  end)
end

local function action(name, fn)
  NUI.on('pause:' .. name, function(data)
    if not enabled[name] then return { ok = false } end
    fn(data)
    return { ok = true }
  end)
end

action('resume', function() Pause.close() end)
action('map', function() frontend(Config.frontend.map, true) end)
action('settings', function() frontend(Config.frontend.settings) end)
action('keybinds', function() frontend(Config.frontend.keybinds) end)
action('disconnect', function()
  Pause.close()
  TriggerServerEvent('nuikit_pause:disconnect')
end)

RegisterNetEvent('nuikit_pause:info', function(data)
  info = type(data) == 'table' and data or {}
  if pause:isOpen() then pause:update(payload()) end
end)

-- Other resources can open or close the menu (e.g. a radial menu entry).
--   exports.nuikit_pause:open()
exports('open', Pause.open)
exports('close', Pause.close)
exports('isOpen', Pause.isOpen)

CreateThread(function()
  while true do
    Pause.tick()
    Wait(0)
  end
end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE and wasOpen then TriggerScreenblurFadeOut(0.0) end
end)
