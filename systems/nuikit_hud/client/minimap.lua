-- nuikit_hud: the minimap. GTA's own radar, placed on the HUD's 16:9 stage and framed by the UI.
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
--- Pure maths, so it can be tested: width, height and safe zone (0.9–1.0) in, numbers out.
function Minimap.layout(width, height, safezone)
  local r = rem(height)
  local size = (cfg.size or 15.0) * r
  local band = (cfg.band or 0.375) * r
  -- the 16:9 stage: on wider screens the HUD stays in the middle 16:9 band
  local stageW = math.min(width, height * 16.0 / 9.0)
  local stageX = (width - stageW) / 2.0
  -- the edge distance grows with GTA's safe-zone setting, like the game's own HUD
  local sz = clamp(safezone or 1.0, 0.8, 1.0)
  local edgeX = 1.5 * r + stageW * (1.0 - sz) / 2.0
  local edgeY = 1.5 * r + height * (1.0 - sz) / 2.0
  local anchor = cfg.anchor or 'bottom-left'
  local x = anchor:find('right') and (stageX + stageW - edgeX - size) or (stageX + edgeX)
  local y = anchor:find('top') and edgeY or (height - edgeY - size)
  local frame = { x = x, y = y, w = size, h = size }
  -- the radar sits under the frame's hole, with its edge half a pixel into the band so the
  -- game's rounding never leaves a gap
  local inset = (cfg.shape == 'circle') and band * 0.5 or band - 0.5
  local radar = { x = x + inset, y = y + inset, w = size - 2.0 * inset, h = size - 2.0 * inset }
  return frame, band, radar
end

--- GTA's rule for SetMinimapComponentPosition('L', 'B', x, y, w, h): x and w are fractions of a
--- 16:9 width centred on the screen, y and h fractions of the height, measured from the safe
--- zone's left and bottom edges. Returns those four numbers for a box in screen pixels.
function Minimap.component(box, width, height, safezone)
  local sz = clamp(safezone or 1.0, 0.8, 1.0)
  local unitW = height * 16.0 / 9.0
  local originX = math.ceil(width * (1.0 - sz) * 0.5) + math.max(0.0, (width - unitW) / 2.0)
  local safeBottom = math.floor(height - height * (1.0 - sz) * 0.5)
  return (box.x - originX) / unitW, (box.y + box.h - safeBottom) / height, box.w / unitW, box.h / height
end

local function place(box, width, height, safezone)
  local x, y, w, h = Minimap.component(box, width, height, safezone)
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
  local frame, band, radar = Minimap.layout(width, height, safezone)
  -- the texture shapes the radar; the round clip type keeps edge blips on the circle
  SetMinimapClipType(tune.clip or (cfg.shape == 'circle' and 1 or 0))
  useMask(tune.texture or cfg.shape)
  local x, y, w, h, mx, my, mw, mh = place(radar, width, height, safezone)
  if cfg.compass ~= false then SetBlipAlpha(GetNorthRadarBlip(), 0) end
  -- GTA only re-reads component positions when the radar changes mode: flick the big map
  SetRadarBigmapEnabled(true, false)
  Wait(50)
  SetRadarBigmapEnabled(false, false)
  if not scaleform then scaleform = RequestScaleformMovie('minimap') end
  placed = {
    x = frame.x / width, y = frame.y / height, w = frame.w / width, h = frame.h / height,
    band = band / height, shape = cfg.shape == 'circle' and 'circle' or 'square',
  }
  NUI.send('hud:minimap:frame', placed)
  if Config.debug then
    print(('[nuikit_hud] minimap: %dx%d safezone %.2f, frame %.0f,%.0f %.0fpx, radar %.0f,%.0f %.0fx%.0fpx'):format(
      width, height, safezone, frame.x, frame.y, frame.w, radar.x, radar.y, radar.w, radar.h))
    print(('[nuikit_hud] minimap: radar %.4f %.4f %.4f %.4f, mask %.4f %.4f %.4f %.4f (%s)'):format(
      x, y, w, h, mx, my, mw, mh, cfg.shape or 'square'))
  end
end

--- What the frame shows this moment: whether the radar is on screen, the camera heading for the
--- compass, and where the player is.
--- The camera heading, to a tenth of a degree.
function Minimap.cameraHeading()
  return math.floor((GetGameplayCamRot(2).z % 360.0) * 10.0 + 0.5) / 10.0 % 360.0
end

local function state(radarOn)
  local ped = PlayerPedId()
  local c = GetEntityCoords(ped)
  local s1, s2 = GetStreetNameAtCoord(c.x, c.y, c.z)
  local street = GetStreetNameFromHashKey(s1)
  local crossing = (s2 and s2 ~= 0) and GetStreetNameFromHashKey(s2) or nil
  return {
    visible = radarOn and not IsBigmapActive() and not IsRadarHidden(),
    heading = Minimap.cameraHeading(), -- where the compass starts; it follows hud:minimap:heading
    street = street,
    crossing = crossing,
    zone = GetLabelText(GetNameOfZone(c.x, c.y, c.z)),
  }
end

--- Called by main.lua every tick with whether the radar should show.
---@param radarOn boolean
function Minimap.tick(radarOn)
  if cfg.enabled == false then return end
  local s = state(radarOn)
  -- the heading has its own, faster channel (Minimap.compass): turning never re-sends this
  local key = ('%s|%s|%s|%s'):format(tostring(s.visible), s.street, s.crossing or '', s.zone)
  if key ~= lastKey then
    lastKey = key
    NUI.send('hud:minimap', s)
  end
end

local lastHeading
--- The compass: the heading alone, sent only when it changed (to the tenth of a degree). The page
--- eases toward it and predicts between messages on every browser frame (minimap.tsx), so the
--- compass turns at the game's full frame rate from about 30 small messages a second.
function Minimap.compass()
  local h = Minimap.cameraHeading()
  if h == lastHeading then return end
  lastHeading = h
  NUI.send('hud:minimap:heading', h)
end

--- The page asks for the frame when it (re)loads.
function Minimap.resend()
  if placed then NUI.send('hud:minimap:frame', placed) end
  lastKey, lastHeading = '', nil
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

if cfg.enabled ~= false then
  -- Street, area and whether the radar shows: a few times a second.
  CreateThread(function()
    while true do
      Minimap.tick(Minimap.radarOn)
      Wait(Minimap.radarOn and 200 or 500)
    end
  end)
  -- The compass: about 30 times a second while the radar shows (and only when it turned).
  CreateThread(function()
    while true do
      if Minimap.radarOn and cfg.compass ~= false then
        Minimap.compass()
        Wait(33)
      else
        Wait(500)
      end
    end
  end)
  -- Re-place only when the render size or safe zone changes.
  CreateThread(function()
    local lw, lh, ls = 0, 0, 0.0
    while true do
      local w, h = GetActiveScreenResolution()
      local s = GetSafeZoneSize()
      if w ~= lw or h ~= lh or math.abs(s - ls) > 0.0001 then
        lw, lh, ls = w, h, s
        Minimap.apply()
      end
      Wait(1500)
    end
  end)
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
