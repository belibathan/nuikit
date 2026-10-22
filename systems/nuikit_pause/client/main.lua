-- nuikit_pause: client
-- Esc opens this menu instead of GTA's pause menu. P (and the Map / Settings buttons) still open
-- the game's own frontend. Player data comes from bridge.lua; the player count from server/main.lua.

local RESOURCE = GetCurrentResourceName()
local ESC = 200          -- INPUT_FRONTEND_PAUSE_ALTERNATE (Esc)
local P_KEY = 199        -- INPUT_FRONTEND_PAUSE (P): left to GTA unless Config.map.takeP
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
local mapCfg = Config.map or {}

--- Scripted cameras (the focus camera and the 3D map) only when the server allows them
--- (Config.camera) and the player hasn't asked for reduced motion (NUI.prefs). Otherwise the menu is
--- flat: Home blurs the game and Map opens GTA's own map.
function Pause.cameras()
  if Config.camera == false then return false end
  local prefs = NUI.prefs and NUI.prefs.get() or {}
  return not prefs.reducedMotion
end
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
    views = {
      map = views.map ~= false and Pause.cameras(),
      keys = views.keys ~= false,
      info = views.info ~= false,
      preview = views.preview ~= false and Pause.cameras(),
    },
    preview = Focus.isActive(),
    places = places(),
    takeP = mapCfg.takeP == true,
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
---@param at? 'map' open straight on the 3D map (Back still goes Home); falls back to Home when the map is off
function Pause.open(at)
  if pause:isOpen() or Pause.blocked() then return false end
  SetPauseMenuActive(false)
  view = "home"
  local direct = at == "map" and views.map ~= false and Pause.cameras()
  -- The focus camera replaces the blur; without it the world's blur has to come from GTA (CEF
  -- draws over the game). Straight to the map: the map's camera lifts off from the game's instead.
  local focused = not direct and views.preview ~= false and Pause.cameras() and Focus.start()
  local data = payload()
  if direct then data.view = "map" end
  if not pause:open(data) then
    if focused then Focus.stop('instant') end
    return false
  end
  wasOpen = true
  if direct then Pause.setView("map") else blur(not focused) end
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

---@param instant? boolean cut straight back to the game (the player went down) instead of gliding
function Pause.close(instant)
  pause:close()
  quietUntil = GetGameTimer() + QUIET_MS
  if wasOpen then
    wasOpen = false
    teardown(instant == true)
  end
end

--- Dead, or down in last stand: the death screen owns the screen, so the menu has to go.
---@return boolean
function Pause.down()
  return Camera.down() or NUI.player.get().dead == true
end

--- Switch views. Home, Key bindings and Info share the focus camera on the player; the map has
--- its own. Going between them, the new camera starts from the old one's exact view and the old
--- one steps aside, so it's one continuous move.
---@param next string
---@return table
function Pause.setView(next)
  if next ~= "home" and next ~= "map" and next ~= "keys" and next ~= "info" then return { ok = false } end
  if next == "map" and (views.map == false or not Pause.cameras()) then return { ok = false } end
  if next == view then return { ok = true, preview = Focus.isActive() } end
  local was = view
  view = next
  if next == "map" then
    blur(false)
    Map3D.start()
    Focus.stop("handover")
  elseif was == "map" then
    local focused = views.preview ~= false and Pause.cameras() and Focus.start()
    Map3D.stop(focused and "handover" or nil)
    blur(not focused)
  end
  if next == "keys" then NUI.send("pause:keys", Keys.resolve()) end
  return { ok = true, preview = Focus.isActive() }
end

-- The focus camera only gives up when the player goes down, and the menu closes with it.
Focus.onLost = function()
  if pause:isOpen() then Pause.close(true) end
end

function Pause.isOpen()
  return pause:isOpen()
end

--- One frame of the Esc watcher. Cheap: a few natives, no allocations.
-- Whether the player is down, read at most every 250 ms: this runs every frame while the menu is
-- closed, and NUI.player.get() builds a new table each call (resmon showed 0.05 ms closed; 0.7.0
-- test #12). Only DisableControlAction has to run every frame, to keep GTA's pause menu off Esc.
local downAt, downNow = 0, false
local function downCached(now)
  if now >= downAt then
    downAt = now + 250
    downNow = NUI.player.get().dead == true or NUI.getState('dead') and true or false
  end
  return downNow
end

function Pause.tick()
  local now = GetGameTimer()
  if pause:isOpen() then
    wasOpen = true
    SetPauseMenuActive(false)
    -- blockedBy only stops it opening: going down with it open (any view) closes it, cameras and all
    if Pause.down() then Pause.close(true) end
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
  if downCached(now) then return end

  DisableControlAction(0, ESC, true)
  if now >= quietUntil and IsDisabledControlJustPressed(0, ESC) then
    SetPauseMenuActive(false)
    Pause.open()
  end
  -- Config.map.takeP: P opens the 3D map instead of GTA's pause map (a full replacement)
  if mapCfg.takeP == true then
    DisableControlAction(0, P_KEY, true)
    if now >= quietUntil and IsDisabledControlJustPressed(0, P_KEY) then
      SetPauseMenuActive(false)
      Pause.open("map")
    end
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
open("pause:map:follow", function(d) return Map3D.follow(d.on == true) end)
-- closer in over a point (a merged group of blips)
open("pause:map:fly", function(d) return Map3D.fly(num(d.x), num(d.y), (Config.map or {}).focusHeight or 350.0) end)
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
-- Straight to the 3D map (a radial menu entry, a phone app): exports.nuikit_pause:openMap()
exports('openMap', function() return Pause.open('map') end)

-- A key players can bind in FiveM's key settings (Config.map.key is the default, '' = unbound).
RegisterCommand('nuikit_map', function() Pause.open('map') end, false)
RegisterKeyMapping('nuikit_map', 'Open the map', 'keyboard', mapCfg.key or '')
-- A resource that made a blip can give the map its real name (GTA can't read it back):
--   exports.nuikit_pause:nameBlip(blip, 'Legion Square garage')
exports('nameBlip', Map3D.nameBlip)

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
