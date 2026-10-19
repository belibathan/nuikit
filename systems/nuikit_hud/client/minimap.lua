-- nuikit_hud: the minimap. GTA's own radar, placed on the HUD's 16:9 stage and framed by the UI.
--
-- Lua owns the geometry: it works out the frame's rectangle on screen, puts the native radar inside
-- it, and sends the rectangle to the page, which draws the themed frame exactly there. Nothing is
-- duplicated between the two, so they can't drift apart at any resolution.
--
-- Shapes:
--   square  a rounded square. The radar fills the frame's inner box; the frame's band covers the
--           radar's square corners, so no texture is needed.
--   circle  GTA's round clip under a ring with a turning compass. Experimental: the native round
--           mask isn't a perfect circle on every screen, so `fit` can stretch the radar box to
--           match (see Config.minimap).

Minimap = {}

local cfg = Config.minimap or {}
local scaleform
local placed               -- the last geometry sent to the page
local lastKey = ''

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

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
  if cfg.shape == 'circle' then
    local fit = cfg.fit or {}
    local fx, fy = fit.x or 1.0, fit.y or 1.0
    local cx, cy = radar.x + radar.w / 2.0, radar.y + radar.h / 2.0
    radar.w, radar.h = radar.w / fx, radar.h / fy
    radar.x, radar.y = cx - radar.w / 2.0, cy - radar.h / 2.0
  end
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
  for _, component in ipairs({ 'minimap', 'minimap_mask', 'minimap_blur' }) do
    SetMinimapComponentPosition(component, 'L', 'B', x, y, w, h)
  end
end

--- Put the radar where the frame is and tell the page. Runs at start and whenever the screen size
--- or safe zone changes.
function Minimap.apply()
  local width, height = GetActiveScreenResolution()
  if not width or width <= 0 or height <= 0 then return end
  local safezone = GetSafeZoneSize()
  local frame, band, radar = Minimap.layout(width, height, safezone)
  SetMinimapClipType(cfg.shape == 'circle' and 1 or 0)
  place(radar, width, height, safezone)
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
  end
end

--- What the frame shows this moment: whether the radar is on screen, the camera heading for the
--- compass, and where the player is.
local function state(radarOn)
  local ped = PlayerPedId()
  local c = GetEntityCoords(ped)
  local s1, s2 = GetStreetNameAtCoord(c.x, c.y, c.z)
  local street = GetStreetNameFromHashKey(s1)
  local crossing = (s2 and s2 ~= 0) and GetStreetNameFromHashKey(s2) or nil
  return {
    visible = radarOn and not IsBigmapActive() and not IsRadarHidden(),
    heading = math.floor(GetGameplayCamRot(2).z % 360.0),
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
  local key = ('%s|%d|%s|%s|%s'):format(tostring(s.visible), s.heading, s.street, s.crossing or '', s.zone)
  if key ~= lastKey then
    lastKey = key
    NUI.send('hud:minimap', s)
  end
end

--- The page asks for the frame when it (re)loads.
function Minimap.resend()
  if placed then NUI.send('hud:minimap:frame', placed) end
  lastKey = ''
end

Minimap.radarOn = false -- set by main.lua

-- The page asks for the frame when it loads (after a resource restart, say).
NUI.on('hud:minimap:ready', function()
  Minimap.resend()
  return { ok = true }
end)

if cfg.enabled ~= false then
  -- The frame's compass and street: quick while the radar shows, idle otherwise.
  CreateThread(function()
    while true do
      Minimap.tick(Minimap.radarOn)
      Wait(Minimap.radarOn and 50 or 500)
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
