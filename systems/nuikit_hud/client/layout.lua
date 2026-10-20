-- nuikit_hud: where the HUD's edges are, for this screen and GTA's safe zone.
--
-- GTA aligns its own HUD (and the minimap's components) to a safe area that depends on the screen's
-- aspect ratio and the player's "Safezone size" setting. Layout.measure() asks the game for it with
-- GetScriptGfxPosition under 'L','B' alignment, the alignment the minimap components use: the same
-- call that turns the stock minimap's component numbers into its rectangle on screen. Two points give
-- the whole affine map (origin and scale), so it works for 16:9, 21:9 and 32:9 without a table of
-- special cases. If the answer looks wrong (or the native is missing), Layout.stage() is the 0.5.0
-- rule: the middle 16:9 of the screen, inset by the safe zone.
--
-- The result goes to the page as `hud:layout` (fractions of the screen) and becomes CSS variables
-- every anchor reads; the minimap uses the same numbers to place GTA's radar.

Layout = {}

--- The layout preset: 'compact' (default) or 'classic'. A 0.6 config (`layout = { source = … }`) keeps
--- the classic layout it was written for.
function Layout.preset()
  local l = Config.layout
  if l == 'classic' or (type(l) == 'table' and l.preset ~= 'compact') then return 'classic' end
  return 'compact'
end

--- 'game' or 'stage' (Config.area; 0.6 configs: Config.layout.source).
function Layout.source()
  local l = Config.layout
  if type(l) == 'table' and l.source then return l.source end
  return Config.area == 'stage' and 'stage' or 'game'
end

local function clamp(v, a, b) return math.max(a, math.min(b, v)) end

--- The 0.5.0 rule, pure: the HUD area is the middle 16:9 of the screen (all of it up to 16:9),
--- inset by (1 - safezone) / 2 of the screen on each side.
---@return table area { left, right, top, bottom (px from the screen's left/top), unitW, unitH (px per component unit) }
function Layout.stage(width, height, safezone)
  local sz = clamp(safezone or 1.0, 0.8, 1.0)
  local unitW = height * 16.0 / 9.0
  local left = math.ceil(width * (1.0 - sz) * 0.5) + math.max(0.0, (width - unitW) / 2.0)
  local bottom = math.floor(height - height * (1.0 - sz) * 0.5)
  return {
    left = left, right = width - left,
    top = height - bottom, bottom = bottom,
    unitW = unitW, unitH = height,
    source = 'stage',
  }
end

--- The game's own answer, pure given two GetScriptGfxPosition results (screen fractions): p0 for
--- component point (0, 0), p1 for (1, 1), both under 'L','B' alignment. nil when it doesn't look like
--- a HUD area (so the caller falls back to Layout.stage).
function Layout.fromGfx(width, height, p0x, p0y, p1x, p1y)
  if type(p0x) ~= 'number' or type(p1x) ~= 'number' or type(p0y) ~= 'number' or type(p1y) ~= 'number' then return nil end
  local left = p0x * width
  local bottom = p0y * height
  local unitW = (p1x - p0x) * width
  local unitH = (p1y - p0y) * height
  -- plausible: origin in the left half, the safe bottom in the lower half, a unit no wider than the
  -- screen and no narrower than a 16:9 band of a 48:9 triple screen, square-ish pixels vertically
  if left < 0 or left > width * 0.5 then return nil end
  if bottom < height * 0.5 or bottom > height + 0.5 then return nil end
  if unitW < width * 0.3 or unitW > width * 1.05 then return nil end
  if unitH < height * 0.9 or unitH > height * 1.1 then return nil end
  -- GTA's safe area is symmetric: mirror the left and bottom insets
  return {
    left = left, right = width - left,
    top = height - bottom, bottom = bottom,
    unitW = unitW, unitH = unitH,
    source = 'game',
  }
end

--- Ask the game (client only).
local function gfx(x, y)
  if not SetScriptGfxAlign or not GetScriptGfxPosition then return nil end
  SetScriptGfxAlign(76, 66) -- 'L', 'B'
  SetScriptGfxAlignParams(0.0, 0.0, 0.0, 0.0)
  local ok, rx, ry = pcall(GetScriptGfxPosition, x, y)
  ResetScriptGfxAlign()
  if not ok then return nil end
  return rx, ry
end

--- The HUD area for this screen: the game's, or the 0.5.0 rule.
function Layout.measure(width, height, safezone)
  if Layout.source() ~= 'stage' then
    local p0x, p0y = gfx(0.0, 0.0)
    local p1x, p1y = gfx(1.0, 1.0)
    local area = Layout.fromGfx(width, height, p0x, p0y, p1x, p1y)
    if area then return area end
  end
  return Layout.stage(width, height, safezone)
end

--- GTA's stock minimap rectangle in px (frontend.xml: x -0.0045, y 0.002, w 0.150, h 0.188888 in
--- component units from the area's left and bottom). Where the radar is when nuikit doesn't place it.
function Layout.stockMinimap(area)
  local x, y, w, h = -0.0045, 0.002, 0.150, 0.188888
  local px = area.left + x * area.unitW
  local bottom = area.bottom + y * area.unitH
  return { x = px, y = bottom - h * area.unitH, w = w * area.unitW, h = h * area.unitH }
end

--- What goes to the page: the area's insets as fractions of the screen.
function Layout.message(width, height, area)
  local r = function(v) return math.floor(v * 100000 + 0.5) / 100000 end
  return {
    l = r(area.left / width), r = r((width - area.right) / width),
    t = r(area.top / height), b = r((height - area.bottom) / height),
    aspect = r(width / height),
    source = area.source,
  }
end

Layout.current = nil   -- the last area measured (px), with width/height
local sentKey

--- Measure and tell the page when anything changed. Returns the area.
function Layout.update(force)
  local width, height = GetActiveScreenResolution()
  if not width or width <= 0 or height <= 0 then return Layout.current end
  local safezone = GetSafeZoneSize()
  local area = Layout.measure(width, height, safezone)
  area.width, area.height, area.safezone = width, height, safezone
  Layout.current = area
  local msg = Layout.message(width, height, area)
  local key = ('%d|%d|%.4f|%.4f|%.4f|%s'):format(width, height, msg.l, msg.b, safezone, msg.source)
  if force or key ~= sentKey then
    sentKey = key
    NUI.send('hud:layout', msg)
    if Config.debug then
      local st = Layout.stage(width, height, safezone)
      print(('[nuikit_hud] layout: %dx%d (%.2f:1) safezone %.2f, %s area left %.0f bottom %.0f unit %.0fx%.0f (stage rule: left %.0f bottom %.0f)'):format(
        width, height, width / height, safezone, area.source, area.left, area.bottom, area.unitW, area.unitH, st.left, st.bottom))
    end
  end
  return area
end

function Layout.resend()
  sentKey = nil
  if Layout.current then Layout.update(true) end
end
