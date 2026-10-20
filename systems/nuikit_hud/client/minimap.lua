-- nuikit_hud: the minimap. GTA's own radar, placed in the HUD's area (client/layout.lua) and framed by the UI.
--
-- Lua owns the geometry: it works out the frame's rectangle on screen, puts the native radar inside
-- it, and sends the rectangle to the page, which draws the themed frame exactly there. Nothing is
-- duplicated between the two, so they can't drift apart at any resolution.
--
-- Shapes:
--   square  a rounded square. The radar fills the frame's inner box; the frame's band covers the
--           radar's square corners.
--   circle  a round radar under a ring with a turning compass.
--
-- The mask decides the shape. GTA multiplies the radar by the texture radarmasksm, stretched over the
-- radar's box. The stock texture has a soft transparent margin, which is why the radar only filled
-- about two thirds of the frame. nuikit draws its own once (a runtime texture: fully opaque for the
-- square, an antialiased disc for the circle) and puts it in place of GTA's with AddReplaceTexture.
-- Every pixel has the same value in all four channels, so the channel order SetRuntimeTexturePixel
-- uses can't matter. Calibrated in game (b3258, 2558x1360): the texture alone shapes the radar
-- (SetMinimapClipType 1 with an opaque texture is still square), and the minimap_mask component's
-- placement has no visible effect. A disc on a box that is square in pixels is round on every screen.

Minimap = {}

local cfg = Config.minimap or {}
local scaleform
local placed               -- the last geometry sent to the page
local lastKey = ''

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

local MASK_TXD = 'nuikit_minimap'
local tune = {}            -- debug overrides (Config.debug only): raw mask placement

--- The mask's opacity (0-255) at pixel x, y of a size x size texture: opaque for the square, a disc
--- with a one-pixel soft edge for the circle. Pure, so it can be tested.
function Minimap.maskPixel(shape, size, x, y)
  if shape ~= 'circle' then return 255 end
  local c = (size - 1) / 2.0
  local d = math.sqrt((x - c) ^ 2 + (y - c) ^ 2)
  return math.floor(clamp(size / 2.0 - d, 0.0, 1.0) * 255 + 0.5)
end

local masks = {}
--- Draw the mask for a shape once, and put it in place of GTA's radarmasksm.
local function useMask(shape)
  local name = shape == 'circle' and 'circle' or 'square'
  if not masks[name] then
    local txd = masks.txd or CreateRuntimeTxd(MASK_TXD)
    masks.txd = txd
    local size = name == 'circle' and 128 or 8
    local tex = CreateRuntimeTexture(txd, name, size, size)
    for y = 0, size - 1 do
      for x = 0, size - 1 do
        local a = Minimap.maskPixel(name, size, x, y)
        SetRuntimeTexturePixel(tex, x, y, a, a, a, a)
      end
    end
    CommitRuntimeTexture(tex)
    masks[name] = true
  end
  RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
  AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', MASK_TXD, name)
end

--- Where minimap_mask goes for a radar placed at x, y, w, h (component units): relative to the
--- radar, at its size. In game its placement made no visible difference (see the top of this file);
--- it is set anyway so the stock values never apply.
function Minimap.maskComponent(x, y, w, h)
  if tune.mask then return table.unpack(tune.mask) end
  return 0.0, 0.0, w, h
end

--- The kit's rem in pixels for a screen height (1rem = 1.4815% of the height, 12–32px).
local function rem(height) return clamp(height * 0.014815, 12.0, 32.0) end

--- The frame's rectangle in screen pixels, its band width, and the radar box inside it.
--- Pure maths, so it can be tested: width, height and safe zone (0.8–1.0) in, numbers out. `area` is
--- the HUD area (Layout.measure); without it, the 0.5.0 rule (Layout.stage).
function Minimap.layout(width, height, safezone, area)
  area = area or Layout.stage(width, height, safezone)
  local r = rem(height)
  local size = (cfg.size or 15.0) * r
  local band = (cfg.band or 0.375) * r
  -- --nk-edge (1.5rem) inside GTA's safe area, like every other anchor of the HUD
  local edge = 1.5 * r
  local anchor = cfg.anchor or 'bottom-left'
  local x = anchor:find('right') and (area.right - edge - size) or (area.left + edge)
  local y = anchor:find('top') and (area.top + edge) or (area.bottom - edge - size)
  local frame = { x = x, y = y, w = size, h = size }
  -- the radar sits under the frame's hole, with its edge half a pixel into the band so the
  -- game's rounding never leaves a gap
  local inset = (cfg.shape == 'circle') and band * 0.5 or band - 0.5
  local radar = { x = x + inset, y = y + inset, w = size - 2.0 * inset, h = size - 2.0 * inset }
  return frame, band, radar
end

--- GTA's rule for SetMinimapComponentPosition('L', 'B', x, y, w, h): x and w in component units
--- from the HUD area's left edge (a 16:9 width on most screens), y and h from its bottom edge.
--- Returns those four numbers for a box in screen pixels. `area` as in Minimap.layout.
function Minimap.component(box, width, height, safezone, area)
  area = area or Layout.stage(width, height, safezone)
  return (box.x - area.left) / area.unitW, (box.y + box.h - area.bottom) / area.unitH, box.w / area.unitW, box.h / area.unitH
end

local function place(box, width, height, safezone, area)
  local x, y, w, h = Minimap.component(box, width, height, safezone, area)
  SetMinimapComponentPosition('minimap', 'L', 'B', x, y, w, h)
  SetMinimapComponentPosition('minimap_blur', 'L', 'B', x, y, w, h)
  local mx, my, mw, mh = Minimap.maskComponent(x, y, w, h)
  SetMinimapComponentPosition('minimap_mask', 'L', 'B', mx, my, mw, mh)
  return x, y, w, h, mx, my, mw, mh
end

--- Put the radar where the frame is and tell the page. Runs at start and whenever the screen size
--- or safe zone changes.
function Minimap.apply()
  local width, height = GetActiveScreenResolution()
  if not width or width <= 0 or height <= 0 then return end
  local safezone = GetSafeZoneSize()
  local area = Layout.measure(width, height, safezone)
  local frame, band, radar = Minimap.layout(width, height, safezone, area)
  -- the texture shapes the radar; the round clip type keeps edge blips on the circle
  SetMinimapClipType(tune.clip or (cfg.shape == 'circle' and 1 or 0))
  useMask(tune.texture or cfg.shape)
  local x, y, w, h, mx, my, mw, mh = place(radar, width, height, safezone, area)
  if cfg.compass ~= false then SetBlipAlpha(GetNorthRadarBlip(), 0) end
  -- GTA only re-reads component positions when the radar changes mode: flick the big map. Make
  -- sure it ends off: one left on hides the frame and fills the corner with the big radar.
  SetRadarBigmapEnabled(true, false)
  Wait(50)
  SetRadarBigmapEnabled(false, false)
  Wait(250)
  if IsBigmapActive() then SetRadarBigmapEnabled(false, false) end
  if not scaleform then scaleform = RequestScaleformMovie('minimap') end
  placed = {
    x = frame.x / width, y = frame.y / height, w = frame.w / width, h = frame.h / height,
    band = band / height, shape = cfg.shape == 'circle' and 'circle' or 'square', framed = true,
  }
  NUI.send('hud:minimap:frame', placed)
  if Config.debug then
    print(('[nuikit_hud] minimap: %dx%d safezone %.2f, frame %.0f,%.0f %.0fpx, radar %.0f,%.0f %.0fx%.0fpx'):format(
      width, height, safezone, frame.x, frame.y, frame.w, radar.x, radar.y, radar.w, radar.h))
    print(('[nuikit_hud] minimap: radar %.4f %.4f %.4f %.4f, mask %.4f %.4f %.4f %.4f (%s)'):format(
      x, y, w, h, mx, my, mw, mh, cfg.shape or 'square'))
  end
end

--- The player is in the world: no loading screen, the network session running and the character
--- loaded. Placing the radar before that (while joining) left GTA's big map stuck on.
---@return boolean
function Minimap.inGame()
  if GetIsLoadingScreenActive() or not NetworkIsPlayerActive(PlayerId()) then return false end
  local player = NUI.player and NUI.player.get and NUI.player.get()
  return not player or player.loaded ~= false
end

--- The camera's compass bearing, to a tenth of a degree (0 north, 90 east: what the compass and the
--- frame's N follow). GTA's yaw turns the other way (90 = facing west), so it is negated.
function Minimap.cameraHeading()
  return math.floor(((-GetGameplayCamRot(2).z) % 360.0) * 10.0 + 0.5) / 10.0 % 360.0
end

--- Whether GTA's radar is on screen right now.
function Minimap.visible(radarOn)
  return radarOn and not IsBigmapActive() and not IsRadarHidden()
end

--- Called by main.lua with whether the radar should show; tells the page when that changes.
--- (Street, zone and the rest are client/location.lua's `hud:location`.)
---@param radarOn boolean
function Minimap.tick(radarOn)
  local visible = Minimap.visible(radarOn)
  local key = tostring(visible)
  if key ~= lastKey then
    lastKey = key
    -- `heading` is where the compass starts; then it follows hud:minimap:heading
    NUI.send('hud:minimap', { visible = visible, heading = Minimap.cameraHeading() })
  end
end

--- The compass: the heading alone on its own channel, a live value (NUI.stream): sent only when it
--- changed to the tenth of a degree, at most 30 times a second. The page glides between messages on
--- every browser frame (nuikit-core follow, minimap.tsx), so the compass turns at the game's full
--- frame rate from about 30 small messages a second.
local heading = NUI.stream('hud:minimap:heading', { rate = 30, precision = 0.1, kind = 'angle' })
function Minimap.compass()
  heading:push(Minimap.cameraHeading())
end

--- With Config.minimap.enabled = false nuikit leaves GTA's radar where it is; the page still gets its
--- rectangle (no frame drawn) so the vitals sit beside it.
function Minimap.applyStock()
  local area = Layout.current
  if not area then return end
  local box = Layout.stockMinimap(area)
  local width, height = area.width, area.height
  placed = {
    x = box.x / width, y = box.y / height, w = box.w / width, h = box.h / height,
    band = 0, shape = 'square', framed = false,
  }
  NUI.send('hud:minimap:frame', placed)
end

--- The page asks for the frame when it (re)loads.
function Minimap.resend()
  Layout.resend()
  if placed then NUI.send('hud:minimap:frame', placed) end
  lastKey = ''
  heading:reset()
end

Minimap.radarOn = false -- set by main.lua

-- The page asks for the frame when it loads (after a resource restart, say).
NUI.on('hud:minimap:ready', function()
  Minimap.resend()
  return { ok = true }
end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= GetCurrentResourceName() then return end
  RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
end)

-- Calibration (Config.debug only): the server sends raw minimap_mask numbers or a shape, and the
-- radar is re-placed at once. Only the server can trigger a client event.
--   mask x y w h | shape square|circle | texture square|circle | clip 0|1 | reset
if Config.debug then
  RegisterNetEvent('nuikit_hud:minimap:tune', function(what, a, b, c, d)
    if what == 'mask' then
      tune.mask = { tonumber(a) or 0.0, tonumber(b) or 0.0, tonumber(c) or 0.1, tonumber(d) or 0.1 }
    elseif what == 'shape' then
      cfg.shape = a == 'circle' and 'circle' or 'square'
    elseif what == 'texture' then
      tune.texture = a
    elseif what == 'clip' then
      tune.clip = tonumber(a)
    elseif what == 'reset' then
      tune = {}
    end
    CreateThread(Minimap.apply)
  end)
end

-- Whether the radar shows: a few times a second (cheap: three natives, a message only on change).
CreateThread(function()
  while true do
    Minimap.tick(Minimap.radarOn)
    Wait(Minimap.radarOn and 250 or 500)
  end
end)

-- The compass: about 30 times a second while something shows it (the frame's N, the heading strip,
-- the location badge), and only when it turned. Minimap.compassOn is set by main.lua.
Minimap.compassOn = false
CreateThread(function()
  while true do
    if Minimap.compassOn then
      Minimap.compass()
      Wait(33)
    else
      Wait(500)
    end
  end
end)

-- The HUD's edges and the radar: once the player is in the world, again each time they come back (a
-- character switch goes through the loading screen) and whenever the render size or safe zone changes.
CreateThread(function()
  local lw, lh, ls, was = 0, 0, 0.0, false
  while true do
    local now = Minimap.inGame()
    if now then
      local w, h = GetActiveScreenResolution()
      local s = GetSafeZoneSize()
      if not was or w ~= lw or h ~= lh or math.abs(s - ls) > 0.0001 then
        lw, lh, ls = w, h, s
        Layout.update()
        if cfg.enabled ~= false then Minimap.apply() else Minimap.applyStock() end
      end
    end
    was = now
    Wait(now and 1500 or 500)
  end
end)

if cfg.enabled ~= false then
  -- The HUD draws vitals itself: hide GTA's health and armour arcs around the radar.
  CreateThread(function()
    while true do
      if scaleform and HasScaleformMovieLoaded(scaleform) then
        BeginScaleformMovieMethod(scaleform, 'SETUP_HEALTH_ARMOUR')
        ScaleformMovieMethodAddParamInt(3)
        EndScaleformMovieMethod()
      end
      Wait(1000)
    end
  end)
end
