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

local views = Config.views or {}
local view = "home"        -- home | map | keys | info
local blurred = false

--- One place that owns the screen blur, so fades always pair up.
local function blur(on)
  if on == blurred then return end
  blurred = on
  if on then TriggerScreenblurFadeIn(BLUR_MS) else TriggerScreenblurFadeOut(BLUR_MS) end
end

--- Places for the UI: plain numbers, no vectors.
local function places()
  local out = {}
  for _, p in ipairs(Config.places or {}) do
    out[#out + 1] = { id = p.id, label = p.label, category = p.category, icon = p.icon, x = p.coords.x, y = p.coords.y }
  end
  return out
end

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
    ping = info.ping,
    uptime = info.uptime,
    restartIn = info.restartIn,
    views = { map = views.map ~= false, keys = views.keys ~= false, info = views.info ~= false, preview = views.preview ~= false },
    preview = Focus.isActive(),
    places = places(),
    pages = Config.pages or {},
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
  view = "home"
  -- The focus camera replaces the blur; without it the world's blur has to come from GTA (CEF
  -- draws over the game).
  local focused = views.preview ~= false and Focus.start()
  if not pause:open(payload()) then
    if focused then Focus.stop('instant') end
    return false
  end
  wasOpen = true
  blur(not focused)
  TriggerServerEvent('nuikit_pause:request')
  return true
end

--- Everything the menu put on screen, gone: the cameras glide back to the game, the blur fades.
local function teardown(instant)
  local mode = instant and 'instant' or nil
  Map3D.stop(mode)
  Focus.stop(mode)
  view = "home"
  blur(false)
end

function Pause.close()
  pause:close()
  quietUntil = GetGameTimer() + QUIET_MS
  if wasOpen then
    wasOpen = false
    teardown(false)
  end
end

--- Switch views. Home, Key bindings and Info share the focus camera on the player; the map has
--- its own. Going between them, the new camera starts from the old one's exact view and the old
--- one steps aside, so it's one continuous move.
---@param next string
---@return table
function Pause.setView(next)
  if next ~= "home" and next ~= "map" and next ~= "keys" and next ~= "info" then return { ok = false } end
  if next == "map" and views.map == false then return { ok = false } end
  if next == view then return { ok = true, preview = Focus.isActive() } end
  local was = view
  view = next
  if next == "map" then
    blur(false)
    Map3D.start()
    Focus.stop("handover")
  elseif was == "map" then
    local focused = views.preview ~= false and Focus.start()
    Map3D.stop(focused and "handover" or nil)
    blur(not focused)
  end
  if next == "keys" then NUI.send("pause:keys", Keys.resolve()) end
  return { ok = true, preview = Focus.isActive() }
end

-- The focus camera only gives up if the player dies: blur instead.
Focus.onLost = function()
  if pause:isOpen() and view ~= "map" then
    blur(true)
    pause:update(payload())
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
    teardown(false)
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

-- The bigger menu (docs/pause-3d.md). Every handler is a no-op unless the menu is open.
local function open(name, fn)
  NUI.on(name, function(data)
    if not pause:isOpen() then return { ok = false } end
    local r = fn(type(data) == "table" and data or {})
    if type(r) == "table" then return r end
    return { ok = r ~= false }
  end)
end
local function num(v) return tonumber(v) or 0.0 end

open("pause:view", function(d) return Pause.setView(d.view) end)
open("pause:gamemap", function() frontend(Config.frontend.map, true) end)
open("pause:preview:frame", function(d) Focus.setFrame(d) end)
open("pause:preview:rotate", function(d) Focus.rotate(num(d.dx)) end)
open("pause:map:pan", function(d) Map3D.pan(num(d.dx), num(d.dy)) end)
open("pause:map:rotate", function(d) Map3D.rotate(num(d.dx), num(d.dy)) end)
open("pause:map:zoom", function(d) Map3D.zoom(num(d.delta)) end)
open("pause:map:focus", function(d) return Map3D.focus(d.id) end)
open("pause:map:recenter", function() return Map3D.recenter() end)
open("pause:map:topdown", function(d) Map3D.topdown(d.on == true) end)
open("pause:map:pick", function(d)
  local hit = Map3D.pick(num(d.u), num(d.v))
  if not hit then return { ok = false } end
  hit.ok = true
  return hit
end)
open("pause:map:waypoint", function(d)
  if d.clear then return Map3D.waypoint(nil) end
  return Map3D.waypoint(num(d.x), num(d.y))
end)
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
  if resource ~= RESOURCE then return end
  Map3D.stop('instant')
  Focus.stop('instant')
  if blurred then TriggerScreenblurFadeOut(0.0) end
end)
