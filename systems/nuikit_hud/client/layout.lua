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

--- Where each part goes in each preset (Config.parts puts any of them elsewhere). `at` is a corner
--- ('top-left', 'top-right', 'bottom-left', 'bottom-right'), 'map' (compact: the column under or over
--- the map; classic: the location above the map, the vitals beside it, both falling back to the
--- bottom-left stack when the map isn't in that corner) or false (hidden). `order` is top to bottom
--- within a corner. The map itself is the minimap's anchor.
Layout.PARTS = {
  compact = {
    map = 'top-right',
    location = { at = 'map', order = 1 },
    wallet = { at = 'map', order = 2 },
    vitals = { at = 'bottom-left', order = 1 },
    ammo = { at = 'bottom-right', order = 1 },
    vehicle = { at = 'bottom-right', order = 2 },
  },
  classic = {
    map = 'bottom-left',
    location = { at = 'map', order = 1 },
    vitals = { at = 'map', order = 2 },
    wallet = { at = 'top-right', order = 1 },
    ammo = { at = 'top-right', order = 2 },
    vehicle = { at = 'bottom-right', order = 1 },
  },
}

local CORNERS = { ['top-left'] = true, ['top-right'] = true, ['bottom-left'] = true, ['bottom-right'] = true }

--- The parts in the order they are listed (the editor, the export).
Layout.PART_NAMES = { 'map', 'location', 'wallet', 'vitals', 'ammo', 'vehicle' }

--- Put an override (Config.parts, or a player's layout) on top of a resolved placement. A part's
--- value is a corner, 'map', false, or { at = …, order = … } (either key may be left out); anything
--- else keeps what was there.
local function overlay(out, over)
  if type(over) ~= 'table' then return end
  if CORNERS[over.map] then out.map = over.map end
  for _, name in ipairs(Layout.PART_NAMES) do
    if name ~= 'map' then
      local v = over[name]
      local at, order = out[name].at, out[name].order
      if v == false then at = false
      elseif type(v) == 'string' then at = v
      elseif type(v) == 'table' then
        if v.at ~= nil then at = v.at end
        if type(v.order) == 'number' then order = v.order end
      end
      if at ~= false and at ~= 'map' and not CORNERS[at] then at = out[name].at end
      out[name] = { at = at, order = order }
    end
  end
end

--- The player's own layout (/hud edit), per preset, kept between sessions. nil: none.
local PLAYER_KVP = 'nuikit_hud:parts:'
Layout.player = nil

function Layout.loadPlayer()
  Layout.player = nil
  if Config.playerLayout == false or not GetResourceKvpString then return end
  local s = GetResourceKvpString(PLAYER_KVP .. Layout.preset())
  local ok, t = pcall(function() return s and json.decode(s) end)
  if ok then Layout.player = Layout.clean(t) end
end

--- What a page sends back, made safe: known parts only, a corner / 'map' / false, an order 1-20.
function Layout.clean(t)
  if type(t) ~= 'table' then return nil end
  local out = {}
  if CORNERS[t.map] then out.map = t.map end
  for _, name in ipairs(Layout.PART_NAMES) do
    local v = t[name]
    if name ~= 'map' and type(v) == 'table' and (v.at == false or v.at == 'map' or CORNERS[v.at]) then
      local order = tonumber(v.order) or 1
      out[name] = { at = v.at, order = math.max(1, math.min(20, math.floor(order))) }
    end
  end
  return out
end

function Layout.savePlayer(t)
  local clean = Layout.clean(t)
  if not clean then return false end
  SetResourceKvp(PLAYER_KVP .. Layout.preset(), json.encode(clean))
  Layout.player = clean
  return true
end

function Layout.resetPlayer()
  DeleteResourceKvp(PLAYER_KVP .. Layout.preset())
  Layout.player = nil
end

--- The preset's placement, Config.parts on top, then the player's own layout (Config.playerLayout).
function Layout.parts()
  local base = Layout.PARTS[Layout.preset()]
  local out = { map = base.map }
  for name, p in pairs(base) do
    if name ~= 'map' then out[name] = { at = p.at, order = p.order } end
  end
  overlay(out, Config.parts)
  if Config.playerLayout ~= false then overlay(out, Layout.player) end
  return out
end

--- A placement as the `parts = { … }` block of config.lua (/hud export).
function Layout.export(parts)
  local q = function(v) return v == false and 'false' or ("'%s'"):format(v) end
  local lines = { '  parts = {', ('    map = %s,'):format(q(parts.map)) }
  for _, name in ipairs(Layout.PART_NAMES) do
    local p = parts[name]
    if name ~= 'map' and p then
      lines[#lines + 1] = ('    %s = { at = %s, order = %d },'):format(name, q(p.at), p.order)
    end
  end
  lines[#lines + 1] = '  },'
  return table.concat(lines, '\n')
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

--- The width of one minimap component unit: a 16:9 width at this height, on every screen (the
--- minimap components never use the wider HUD area GetScriptGfxPosition reports).
function Layout.unit16(height) return height * 16.0 / 9.0 end

--- GTA's own minimap component placements (frontend.xml), 'L','B': x, y, w, h. Restored whenever
--- nuikit stops placing the radar.
Layout.STOCK = {
  minimap = { -0.0045, 0.002, 0.150, 0.188888 },
  minimap_mask = { 0.020, 0.032, 0.111, 0.159 },
  minimap_blur = { -0.03, 0.022, 0.266, 0.237 },
}

--- GTA's stock minimap rectangle in px (frontend.xml: x -0.0045, y 0.002, w 0.150, h 0.188888 in
--- component units from the area's left and bottom). Where the radar is when nuikit doesn't place it.
function Layout.stockMinimap(area)
  local x, y, w, h = Layout.STOCK.minimap[1], Layout.STOCK.minimap[2], Layout.STOCK.minimap[3], Layout.STOCK.minimap[4]
  local unitW = Layout.unit16(area.height or area.unitH)
  local px = area.left + x * unitW
  local bottom = area.bottom + y * area.unitH
  return { x = px, y = bottom - h * area.unitH, w = w * unitW, h = h * area.unitH }
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

-- ───────────────────────────────── named zones (Foundation 2)

--- Where each named zone sits by default, in fractions of the screen inside GTA's safe area (x, y
--- from the area's top-left, w, h of the area). The HUD's own zones (status, map, vitals, vehicle)
--- are replaced by what the page measures once it shows; prompts, interaction and toasts are boxes
--- for the resources that draw them. Config.zones overrides any of them.
Layout.ZONES = {
  status = { x = 0.80, y = 0.30, w = 0.20, h = 0.12 },
  map = { x = 0.84, y = 0.00, w = 0.16, h = 0.29 },
  vitals = { x = 0.00, y = 0.92, w = 0.30, h = 0.08 },
  vehicle = { x = 0.80, y = 0.70, w = 0.20, h = 0.30 },
  prompts = { x = 0.35, y = 0.80, w = 0.30, h = 0.10 },
  interaction = { x = 0.60, y = 0.35, w = 0.20, h = 0.30 },
  toasts = { x = 0.00, y = 0.00, w = 0.28, h = 0.40 },
}

Layout.measured = {} -- zone name → { x, y, w, h } (screen fractions), from the page's hud:zones

--- Keep what the page measured, one box per zone (the union of its parts).
function Layout.setMeasured(rects)
  local out = {}
  for _, r in ipairs(type(rects) == 'table' and rects or {}) do
    local z = type(r.zone) == 'string' and r.zone or nil
    if z and type(r.x) == 'number' and type(r.y) == 'number' and type(r.w) == 'number' and type(r.h) == 'number' then
      local b = out[z]
      if b then
        local x2, y2 = math.max(b.x + b.w, r.x + r.w), math.max(b.y + b.h, r.y + r.h)
        b.x, b.y = math.min(b.x, r.x), math.min(b.y, r.y)
        b.w, b.h = x2 - b.x, y2 - b.y
      else
        out[z] = { x = r.x, y = r.y, w = r.w, h = r.h }
      end
    end
  end
  Layout.measured = out
end

--- Every named zone as a box in screen fractions, with where it came from: 'hud' (measured on
--- screen), 'config' (Config.zones) or 'default'. exports.nuikit_hud:zones().
function Layout.zones()
  local msg = Layout.current and Layout.message(Layout.current.width, Layout.current.height, Layout.current)
    or { l = 0, r = 0, t = 0, b = 0 }
  local aw, ah = 1 - msg.l - msg.r, 1 - msg.t - msg.b
  local over = type(Config.zones) == 'table' and Config.zones or {}
  local out = {}
  for name, d in pairs(Layout.ZONES) do
    local o = over[name]
    if type(o) == 'table' and type(o.x) == 'number' and type(o.y) == 'number' and type(o.w) == 'number' and type(o.h) == 'number' then
      d = o
    end
    out[name] = { x = msg.l + d.x * aw, y = msg.t + d.y * ah, w = d.w * aw, h = d.h * ah, source = d == o and 'config' or 'default' }
    if Layout.measured[name] then
      local m = Layout.measured[name]
      out[name] = { x = m.x, y = m.y, w = m.w, h = m.h, source = 'hud' }
    end
  end
  return out
end
