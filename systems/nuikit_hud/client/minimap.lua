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
-- uses can't matter. Calibrated in game (b3258, 2558x1360): the texture alone shapes the radar's
-- tiles (SetMinimapClipType 1 with an opaque texture is still square).
--
-- The box keeps GTA's own aspect. GTA draws the same view of the world into whatever box it gets, so a
-- square box squeezed the map about 29% sideways (0.7.0 test, design note A). The radar's box is
-- GTA's stock 1.41:1 (Minimap.ASPECT) with its height the hole's, and the mask draws the disc or the
-- square only in its middle: the sides are transparent, so what shows is exactly the hole.
--
-- minimap_mask is placed in absolute component units over the hole, like the radar (as minimap
-- scripts do: they offset all three components alike). At (0, 0) it sat in the screen's bottom-left
-- corner, away from a top-right ring, and the GPS route wasn't drawn inside the ring (0.7.0 test, 7b).

Minimap = {}

local cfg = Config.minimap or {}
local scaleform
local placed               -- the last geometry sent to the page
local placedByUs = false   -- nuikit moved GTA's radar this session (so it puts it back)
local lastKey = ''

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

-- What each layout preset puts on the map; Config.minimap overrides any of them.
local PRESETS = {
  compact = { shape = 'circle', size = 12.0, band = 0.125, anchor = 'top-right', headroom = 1.75 },
  classic = { shape = 'square', size = 15.0, band = 0.375, anchor = 'bottom-left', headroom = 0 },
}

--- The map's shape, size, band, anchor and headroom (rem above a top-anchored map for the heading),
--- from the preset with Config.minimap on top. Read on every call, so a test or a reload can change it.
function Minimap.options()
  local preset = Layout.preset()
  local p = PRESETS[preset]
  local o = { preset = preset }
  for k, v in pairs(p) do o[k] = v end
  for _, k in ipairs({ 'shape', 'size', 'band', 'anchor' }) do
    if cfg[k] ~= nil then o[k] = cfg[k] end
  end
  o.shape = o.shape == 'circle' and 'circle' or 'square'
  -- the heading reads above the ring only on a round compact map
  if o.shape ~= 'circle' or cfg.compass == false then o.headroom = 0 end
  return o
end

-- A new name on every start: after a live restart a txd with the old name could still be held by
-- GTA, and the mask resolved to nothing (an empty ring until the pause map was opened; 0.7.0 test, F2).
local MASK_TXD = ('nuikit_minimap_%d'):format(GetGameTimer())

--- GTA's stock radar box, width over height on screen: 0.150 of a 16:9 width by 0.188888 of the
--- height (frontend.xml), about 1.41. GTA draws the same view into any box, so the box keeps it.
Minimap.ASPECT = (Layout.STOCK.minimap[3] * 16.0 / 9.0) / Layout.STOCK.minimap[4]

local tune = {}            -- debug overrides (Config.debug only): raw mask placement, route candidate

--- How the GPS route is kept inside the map (Config.minimap.routeClip; the comment there lists the
--- candidates). GTA draws the route across the whole radar box and through none of the masks nuikit
--- knows (0.7.0 test, A4); none of these is proven, which is why it's a setting and an F8 command.
function Minimap.routeClip()
  local v = tune.route or cfg.routeClip
  if v == 'inset' or v == 'texture' or v == 'stock' or v == 'box' then return v end
  return 'mask'
end

--- The box's aspect: GTA's (Config.minimap.aspect overrides it; 1 is the square box of 0.7.0-next,
--- which routeClip = 'box' also picks).
function Minimap.aspect()
  local a = tonumber(cfg.aspect)
  if a and a >= 1.0 and a <= 3.0 then return a end
  if Minimap.routeClip() == 'box' then return 1.0 end
  return Minimap.ASPECT
end

-- ───────────────────────────────── style: nuikit places the radar ('ring'), or leaves it ('stock')

-- Minimap resources that place or reshape GTA's radar themselves. When one is started nuikit
-- leaves the radar alone and lays the HUD out around wherever GTA's stock rectangle is.
-- Config.minimap.yieldTo replaces this list ({} turns detection off).
Minimap.YIELD_TO = { 'circleminimap', 'squaremap', 'minimap', 'jg-hud', 'ps-hud', 'qb-hud', 'qbx_hud' }

local yieldedTo, said, checked = nil, false, false

--- The started minimap resource nuikit yields to, or nil. Looked up once, then again only when a
--- resource starts or stops (not on every tick).
function Minimap.yielding()
  if not checked then
    checked = true
    yieldedTo = nil
    for _, name in ipairs(cfg.yieldTo or Minimap.YIELD_TO) do
      if name ~= GetCurrentResourceName() and GetResourceState(name) == 'started' then
        yieldedTo = name
        break
      end
    end
  end
  return yieldedTo
end
AddEventHandler('onClientResourceStart', function() checked = false end)
AddEventHandler('onClientResourceStop', function() checked = false end)

--- 'ring' (nuikit places and frames the radar: the default) or 'stock' (GTA's radar untouched):
--- Config.minimap.style, `enabled = false` (0.6) or a started minimap resource (printed once).
function Minimap.style()
  if cfg.enabled == false or cfg.style == 'stock' then return 'stock' end
  if Minimap.yielding() then
    if not said then
      said = true
      print(('[nuikit_hud] %s is started: leaving the minimap to it (Config.minimap.style = \'stock\'). Set Config.minimap.yieldTo = {} to place it anyway.'):format(yieldedTo))
    end
    return 'stock'
  end
  return 'ring'
end

--- The mask's opacity (0-255) at pixel x, y of a w x h texture stretched over a box `aspect` times
--- wider than it is high: the middle h x h square on screen is the hole (a disc for the circle, all of
--- it for the square), with a one-pixel soft edge; the sides are transparent. Pure, so it can be tested.
function Minimap.maskPixel(shape, w, h, x, y, aspect)
  aspect = aspect or Minimap.ASPECT
  -- the pixel's centre from the hole's centre, in the hole's pixels (a texel spans about one)
  local px = ((x + 0.5) / w - 0.5) * h * aspect
  local py = (y + 0.5) - h / 2.0
  local inside
  if shape == 'circle' then
    inside = h / 2.0 - math.sqrt(px * px + py * py)
  else
    inside = h / 2.0 - math.abs(px)
  end
  return math.floor(clamp(inside + 0.5, 0.0, 1.0) * 255 + 0.5)
end

local masks = {}
--- Draw the mask for a shape once (per aspect), and put it in place of GTA's radarmasksm.
local function useMask(shape)
  local aspect = Minimap.aspect()
  local kind = shape == 'circle' and 'circle' or 'square'
  -- the nuikit resource owns the texture so it survives this resource's restarts (0.7.0 test,
  -- 0.7.0 baseline A2); the code below stays as the fallback for an older nuikit
  if GetResourceState('nuikit') == 'started' then
    TriggerEvent('nuikit:minimap:mask', kind, aspect)
    return
  end
  local name = ('%s_%d'):format(kind, math.floor(aspect * 1000 + 0.5))
  if not masks[name] then
    local txd = masks.txd or CreateRuntimeTxd(MASK_TXD)
    masks.txd = txd
    local h = kind == 'circle' and 128 or 32
    local w = math.floor(h * aspect + 0.5)
    local tex = CreateRuntimeTexture(txd, name, w, h)
    for y = 0, h - 1 do
      for x = 0, w - 1 do
        local a = Minimap.maskPixel(kind, w, h, x, y, aspect)
        SetRuntimeTexturePixel(tex, x, y, a, a, a, a)
      end
    end
    CommitRuntimeTexture(tex)
    masks[name] = true
  end
  RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
  AddReplaceTexture('platform:/textures/graphics', 'radarmasksm', MASK_TXD, name)
  return MASK_TXD, name
end

--- Where minimap_mask goes (component units): over the hole, in the same absolute units as the radar
--- ('mask'); on the square inside the disc ('inset': side = hole / √2, centred); or GTA's own place
--- ('stock'). `hole` is the hole's x, y, w, h from Minimap.component; `clip` is Minimap.routeClip().
function Minimap.maskComponent(x, y, w, h, clip)
  if tune.mask then return table.unpack(tune.mask) end
  clip = clip or Minimap.routeClip()
  if clip == 'stock' then return table.unpack(Layout.STOCK.minimap_mask) end
  if clip == 'inset' then
    local k = 1.0 - 1.0 / math.sqrt(2.0)
    return x + w * k / 2.0, y + h * k / 2.0, w * (1.0 - k), h * (1.0 - k)
  end
  return x, y, w, h
end

--- routeClip = 'texture': GTA's second radar mask (radarmask1g, the one next to radarmasksm in
--- platform:/textures/graphics) gets our disc too, in case the route layer reads that one. Put back
--- by Minimap.restore and on every other candidate.
local routeTextured = false
local function useRouteTexture(on, txd, name)
  if routeTextured then RemoveReplaceTexture('platform:/textures/graphics', 'radarmask1g') end
  routeTextured = false
  if on and txd and name then
    AddReplaceTexture('platform:/textures/graphics', 'radarmask1g', txd, name)
    routeTextured = true
  end
end

--- The kit's rem in pixels for a screen height (1rem = 1.4815% of the height, 12–32px).
local function rem(height) return clamp(height * 0.014815, 12.0, 32.0) end

--- The frame's rectangle in screen pixels, its band width, the hole (where the radar shows) and the
--- radar's box: the hole's height, Minimap.aspect() times as wide, centred on it.
--- Pure maths, so it can be tested: width, height and safe zone (0.8–1.0) in, numbers out. `area` is
--- the HUD area (Layout.measure); without it, the 0.5.0 rule (Layout.stage).
function Minimap.layout(width, height, safezone, area)
  area = area or Layout.stage(width, height, safezone)
  local o = Minimap.options()
  local r = rem(height)
  local size = o.size * r
  local band = o.band * r
  -- --nk-edge (1.5rem) inside GTA's safe area, like every other anchor of the HUD
  local edge = 1.5 * r
  local anchor = o.anchor
  local x = anchor:find('right') and (area.right - edge - size) or (area.left + edge)
  local y = anchor:find('top') and (area.top + edge + o.headroom * r) or (area.bottom - edge - size)
  local frame = { x = x, y = y, w = size, h = size }
  -- the radar sits under the frame's hole, with its edge half a pixel into the band so the
  -- game's rounding never leaves a gap
  local inset = (o.shape == 'circle') and band * 0.5 or band - 0.5
  local radar = { x = x + inset, y = y + inset, w = size - 2.0 * inset, h = size - 2.0 * inset }
  local bw = radar.h * Minimap.aspect()
  local box = { x = radar.x - (bw - radar.w) / 2.0, y = radar.y, w = bw, h = radar.h }
  return frame, band, radar, box
end

--- GTA's rule for SetMinimapComponentPosition('L', 'B', x, y, w, h): x and w from the HUD area's
--- left edge in 16:9-width units (height × 16/9) on every screen, y and h from its bottom edge in
--- heights. Not the area's measured width: in game (Oct 20, 2418×1286) using that left the radar
--- 16 px narrower than its frame, more the wider the screen. Returns those four numbers for a box in
--- screen pixels. `area` as in Minimap.layout.
function Minimap.component(box, width, height, safezone, area)
  area = area or Layout.stage(width, height, safezone)
  local unitW = Layout.unit16(height)
  return (box.x - area.left) / unitW, (box.y + box.h - area.bottom) / area.unitH, box.w / unitW, box.h / area.unitH
end

local function place(box, hole, width, height, safezone, area)
  local x, y, w, h = Minimap.component(box, width, height, safezone, area)
  SetMinimapComponentPosition('minimap', 'L', 'B', x, y, w, h)
  SetMinimapComponentPosition('minimap_blur', 'L', 'B', x, y, w, h)
  local mx, my, mw, mh = Minimap.maskComponent(Minimap.component(hole, width, height, safezone, area))
  SetMinimapComponentPosition('minimap_mask', 'L', 'B', mx, my, mw, mh)
  return x, y, w, h, mx, my, mw, mh
end

--- GTA re-reads the component positions when the radar changes mode: flick the big map, and make
--- sure it ends off (one left on hides the frame and fills the corner with the big radar).
local function reread()
  SetRadarBigmapEnabled(true, false)
  Wait(50)
  SetRadarBigmapEnabled(false, false)
  Wait(250)
  if IsBigmapActive() then SetRadarBigmapEnabled(false, false) end
end
local stale = false -- placed while the radar was hidden: re-read once it shows

--- Put the radar where the frame is and tell the page. Runs at start and whenever the screen size
--- or safe zone changes.
function Minimap.apply()
  local width, height = GetActiveScreenResolution()
  if not width or width <= 0 or height <= 0 then return end
  local safezone = GetSafeZoneSize()
  local area = Layout.measure(width, height, safezone)
  local frame, band, radar, box = Minimap.layout(width, height, safezone, area)
  local o = Minimap.options()
  -- the texture shapes the radar; the round clip type keeps edge blips on the circle
  SetMinimapClipType(tune.clip or (o.shape == 'circle' and 1 or 0))
  local txd, name = useMask(tune.texture or o.shape)
  useRouteTexture(Minimap.routeClip() == 'texture', txd, name)
  local x, y, w, h, mx, my, mw, mh = place(box, radar, width, height, safezone, area)
  placedByUs = true
  -- the nuikit resource puts GTA's radar back if this one stops (it can wait for the re-read; a
  -- stopping resource can't, so its own restore never took: 0.7.0 test, F3)
  TriggerEvent('nuikit:minimap:placed')
  if cfg.compass ~= false then SetBlipAlpha(GetNorthRadarBlip(), 0) end
  -- a hidden radar (on foot with radar = 'vehicle') may not re-read: do it again when it shows
  stale = IsRadarHidden()
  reread()
  -- GTA's health and armour arcs are hidden by the nuikit resource: a scaleform handle requested here
  -- is freed when this resource stops, and that unloaded GTA's own radar movie (the empty ring after
  -- a restart, 0.7.0 baseline A2; found by turning the request off).
  TriggerEvent('nuikit:minimap:bars', false)
  placed = {
    x = frame.x / width, y = frame.y / height, w = frame.w / width, h = frame.h / height,
    band = band / height, shape = o.shape, framed = true, preset = o.preset,
  }
  NUI.send('hud:minimap:frame', placed)
  if Config.debug then
    print(('[nuikit_hud] minimap: %dx%d safezone %.2f, frame %.0f,%.0f %.0fpx, hole %.0f,%.0f %.0fx%.0fpx, radar box %.0fx%.0fpx (%.3f:1)'):format(
      width, height, safezone, frame.x, frame.y, frame.w, radar.x, radar.y, radar.w, radar.h, box.w, box.h, box.w / box.h))
    print(('[nuikit_hud] minimap: radar %.4f %.4f %.4f %.4f, mask %.4f %.4f %.4f %.4f (%s, routeClip %s)'):format(
      x, y, w, h, mx, my, mw, mh, o.shape, Minimap.routeClip()))
    -- the check from the in-game test: the radar's visible middle on screen must equal the hole
    print(('[nuikit_hud] minimap: %.2f:1, radar %.4f x %.0f (16:9 unit) / %.3f = %.1f px for a %.1f px hole'):format(
      width / height, w, Layout.unit16(height), Minimap.aspect(), w * Layout.unit16(height) / Minimap.aspect(), radar.w))
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
  -- `wanted`: the radar belongs on screen (Config.radar), whether or not it shows this moment. The
  -- page lays the column out on it, so a menu cutting the radar doesn't shift the column mid-exit.
  local wanted = Minimap.wanted ~= false
  local key = tostring(visible) .. tostring(wanted)
  if key ~= lastKey then
    lastKey = key
    if visible and stale then
      stale = false
      CreateThread(reread)
    end
    -- `heading` is where the compass starts; then it follows hud:minimap:heading
    NUI.send('hud:minimap', { visible = visible, wanted = wanted, heading = Minimap.cameraHeading() })
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

--- Put GTA's radar back as the game ships it: the three components at their frontend.xml places, the
--- square clip, GTA's own mask and the north blip. In game (Oct 20) a live restart or enabled = false
--- left nuikit's placement behind. `flick` re-reads the positions (it waits, so not from a stop handler).
function Minimap.restore(flick)
  for name, v in pairs(Layout.STOCK) do
    SetMinimapComponentPosition(name, 'L', 'B', v[1], v[2], v[3], v[4])
  end
  SetMinimapClipType(0)
  RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm')
  useRouteTexture(false)
  SetBlipAlpha(GetNorthRadarBlip(), 255)
  if flick then
    SetRadarBigmapEnabled(true, false)
    Wait(50)
    SetRadarBigmapEnabled(false, false)
  else
    SetRadarBigmapEnabled(true, false)
    SetRadarBigmapEnabled(false, false)
  end
end

--- Style 'stock': GTA's radar stays (or goes back to) GTA's; the page still gets its rectangle (no
--- frame drawn) so the HUD sits around it. Restored only when nuikit placed it before, or nothing
--- else might own it (never over a minimap resource nuikit yields to).
function Minimap.applyStock()
  local area = Layout.current
  if not area then return end
  if placedByUs or not Minimap.yielding() then
    -- put back by this resource (it keeps running): the nuikit resource has nothing to restore on a
    -- later stop. Not sent from the stop handler, which would cancel that restore.
    TriggerEvent('nuikit:minimap:released')
    Minimap.restore(true)
    placedByUs = false
  end
  local box = Layout.stockMinimap(area)
  local width, height = area.width, area.height
  placed = {
    x = box.x / width, y = box.y / height, w = box.w / width, h = box.h / height,
    band = 0, shape = 'square', framed = false, preset = Layout.preset(),
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
Minimap.wanted = false -- set by main.lua: Config.radar wants it now (shown or not)

-- The page asks for the frame when it loads (after a resource restart, say).
NUI.on('hud:minimap:ready', function()
  Minimap.resend()
  return { ok = true }
end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource ~= GetCurrentResourceName() then return end
  -- With the nuikit resource running, it restores GTA's radar a second after a real stop and does
  -- nothing on a restart. Resetting here as well swapped the mask and clip out and straight back in
  -- on every restart, which left the ring empty until the pause map reloaded (0.7.0 test, A2).
  if placedByUs and GetResourceState('nuikit') == 'started' then return end
  if placedByUs then Minimap.restore(false) placedByUs = false else RemoveReplaceTexture('platform:/textures/graphics', 'radarmasksm') end
end)

-- Calibration (Config.debug only): raw minimap_mask numbers, a shape or a route candidate, and the
-- radar is re-placed at once. From F8 (`nuikit_minimap route inset`) or the server event.
--   mask x y w h | shape square|circle | texture square|circle | clip 0|1
--   route mask|inset|texture|stock|box (Config.minimap.routeClip, live) | reset
if Config.debug then
  local function tuneMinimap(what, a, b, c, d)
    if what == 'mask' then
      tune.mask = { tonumber(a) or 0.0, tonumber(b) or 0.0, tonumber(c) or 0.1, tonumber(d) or 0.1 }
    elseif what == 'shape' then
      cfg.shape = a == 'circle' and 'circle' or 'square'
    elseif what == 'texture' then
      tune.texture = a
    elseif what == 'clip' then
      tune.clip = tonumber(a)
    elseif what == 'route' then
      tune.route = a
      print(('[nuikit_hud] minimap: routeClip %s'):format(Minimap.routeClip()))
    elseif what == 'reset' then
      tune = {}
    else
      print('[nuikit_hud] nuikit_minimap mask x y w h | shape square|circle | texture square|circle | clip 0|1 | route mask|inset|texture|stock|box | reset')
      return
    end
    CreateThread(Minimap.apply)
  end
  RegisterNetEvent('nuikit_hud:minimap:tune', tuneMinimap)
  RegisterCommand('nuikit_minimap', function(_, args) tuneMinimap(table.unpack(args)) end, false)
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
  local lw, lh, ls, lstyle, was = 0, 0, 0.0, nil, false
  while true do
    local now = Minimap.inGame()
    if now then
      local w, h = GetActiveScreenResolution()
      local s = GetSafeZoneSize()
      local style = Minimap.style()
      if not was or w ~= lw or h ~= lh or math.abs(s - ls) > 0.0001 or style ~= lstyle then
        lw, lh, ls, lstyle = w, h, s, style
        Layout.update()
        if style == 'ring' then Minimap.apply() else Minimap.applyStock() end
      end
    end
    was = now
    Wait(now and 1500 or 500)
  end
end)

do
  -- The HUD draws vitals itself: hide GTA's health and armour arcs around the radar (only while
  -- nuikit places it: 'stock' leaves GTA's radar as it is).
  CreateThread(function()
    while true do
      if Minimap.style() == 'ring' and placedByUs then TriggerEvent('nuikit:minimap:bars', false) end
      Wait(1000)
    end
  end)
end
