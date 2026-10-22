-- nuikit_hud: the player's HUD on nk.settings (docs/settings.md). Every style (Layout.STYLE_KEYS) and,
-- with Config.playerLayout, where each part goes are settings rows, so /hud edit, the pause menu's
-- settings and any settings page show the same values, with presets and feature flags:
--   setr nuikit_flag_hud_layout 0   no player layouts (the server's Config.parts for everyone)
--   setr nuikit_flag_hud_style 0    no player styles (Config.styles' defaults for everyone)
-- Saved by the nuikit resource, merged over the defaults with a version. The KVP the HUD used before
-- (nuikit_hud:parts:<preset>, nuikit_hud:styles) is moved over once and deleted.

Prefs = {}
Prefs.defaults = {} -- row key → default, from the last Prefs.rows()

local VERSION = 1
local PLACES = { 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'map', 'hidden' }
local CORNERS = { 'top-left', 'top-right', 'bottom-left', 'bottom-right' }
local PART_LABEL = { map = 'Map', location = 'Location', wallet = 'Money', vitals = 'Vitals', ammo = 'Ammo', vehicle = 'Vehicle' }
local PLACE_LABEL = {
  ['top-left'] = 'Top left', ['top-right'] = 'Top right', ['bottom-left'] = 'Bottom left',
  ['bottom-right'] = 'Bottom right', map = 'With the map', hidden = 'Hidden',
}
local STYLE_GROUP = { vitals = 'Vitals', vehicle = 'Speedometer', map = 'Map', column = 'Location and money', scale = 'Size' }
local STYLE_LABEL = {
  ['vitals.display'] = 'Vitals', ['vitals.voice'] = 'While talking', ['vehicle.gauge'] = 'Gauge',
  ['map.radar'] = 'Radar', ['map.shape'] = 'Shape', ['map.size'] = 'Size', ['map.halo'] = 'Halo',
  ['map.compass'] = 'Compass ring', ['map.column'] = 'Info', ['column.street'] = 'Street',
  ['column.area'] = 'Area', ['column.money'] = 'Money', ['column.job'] = 'Job', ['column.align'] = 'Alignment',
  ['scale.top-left'] = 'Top left', ['scale.top-right'] = 'Top right', ['scale.bottom-left'] = 'Bottom left',
  ['scale.bottom-right'] = 'Bottom right', ['scale.map'] = 'By the map',
}
local OPTION_LABEL = {
  icons = 'Icons', value = 'Icon and value', pill = 'Label and value', expand = 'Expand on change',
  beside = 'Keep vitals', collapse = 'Tuck behind voice', theme = 'Theme', arc = 'Arc', bar = 'Bar',
  digital = 'Digital', circle = 'Circle', square = 'Square', [12] = 'Small', [15] = 'Medium', [18] = 'Large',
  always = 'Always', vehicle = 'In a vehicle', never = 'Never', auto = 'Auto', below = 'Below', above = 'Above',
  center = 'Center', start = 'Left', ['end'] = 'Right',
}

local function has(list, v)
  for _, x in ipairs(list) do if x == v then return true end end
  return false
end

local function option(v)
  local label = OPTION_LABEL[v]
  if label == nil and type(v) == 'number' and v < 2 then label = ('%d%%'):format(math.floor(v * 100 + 0.5)) end
  if label == nil then label = v == true and 'On' or v == false and 'Off' or tostring(v) end
  return { value = v, label = label }
end

--- The server's placement (preset + Config.parts), without the player's.
local function serverParts()
  local player = Layout.player
  Layout.player = nil
  local parts = Layout.parts()
  Layout.player = player
  return parts
end

--- A style's default as a row needs it (the map's shape and size fall back to the preset's).
local function styleDefault(key)
  local d = Layout.styleDefault(key)
  if d ~= nil then return d end
  if key == 'map.shape' then return Layout.preset() == 'compact' and 'circle' or 'square' end
  if key == 'map.size' then return 15 end
end

--- The rows: layout (place + order per part) and styles (what players may pick, the default always
--- among them so the row is kept).
function Prefs.rows()
  local rows = {}
  Prefs.defaults = {}
  if Config.playerLayout ~= false then
    local parts = serverParts()
    rows[#rows + 1] = { key = 'place.map', label = 'Map', group = 'Layout', flag = 'hud_layout', default = parts.map,
      options = (function() local o = {} for _, c in ipairs(CORNERS) do o[#o + 1] = { value = c, label = PLACE_LABEL[c] } end return o end)() }
    for _, name in ipairs(Layout.PART_NAMES) do
      if name ~= 'map' then
        local p = parts[name]
        local o = {}
        for _, pl in ipairs(PLACES) do o[#o + 1] = { value = pl, label = PLACE_LABEL[pl] } end
        rows[#rows + 1] = { key = 'place.' .. name, label = PART_LABEL[name], group = 'Layout', flag = 'hud_layout',
          default = p.at == false and 'hidden' or p.at, options = o }
        rows[#rows + 1] = { key = 'order.' .. name, label = PART_LABEL[name] .. ' order', group = 'Layout order',
          flag = 'hud_layout', default = math.max(1, math.min(9, p.order)), range = { 1, 9, 1 } }
      end
    end
  end
  for _, key in ipairs(Layout.STYLE_KEYS) do
    local allowed = Layout.styleAllowed(key)
    local d = styleDefault(key)
    if #allowed > 1 or (#allowed == 1 and allowed[1] ~= d) then
      if not has(allowed, d) then table.insert(allowed, 1, d) end
      local row = { key = key, label = STYLE_LABEL[key], group = STYLE_GROUP[key:match('^(%w+)')], flag = 'hud_style', default = d }
      if type(d) == 'boolean' then
        row.toggle = true -- on / off (both allowed: a one-way allow-list leaves no choice, so no row)
      else
        row.options = {}
        for _, v in ipairs(allowed) do row.options[#row.options + 1] = option(v) end
      end
      rows[#rows + 1] = row
    end
  end
  for _, r in ipairs(rows) do Prefs.defaults[r.key] = r.default end
  return rows
end

--- The presets: patch bundles over the rows (keys a server's rows lack are dropped by nk.settings).
function Prefs.presets(rows)
  local defaults = {}
  for _, r in ipairs(rows) do defaults[r.key] = r.default end
  local hideAll = {}
  for _, name in ipairs(Layout.PART_NAMES) do
    if name ~= 'map' then hideAll['place.' .. name] = 'hidden' end
  end
  hideAll['map.radar'] = 'never'
  return {
    { id = 'standard', label = 'Standard', patch = defaults },
    { id = 'minimal', label = 'Minimal', patch = { ['vitals.display'] = 'icons', ['place.location'] = 'hidden', ['place.wallet'] = 'hidden' } },
    { id = 'cinema', label = 'Cinema', patch = hideAll },
    { id = 'streamer', label = 'Streamer', patch = { ['column.money'] = false, ['column.street'] = false, ['column.job'] = false } },
  }
end

--- Settings values → the placement and styles the HUD reads (Layout.player, Layout.playerStyles).
--- A value equal to its row's default is no pick: the server's config stays the authority for it.
function Prefs.apply(values)
  local picks = {}
  for k, v in pairs(values or {}) do
    if Prefs.defaults[k] == nil or Prefs.defaults[k] ~= v then picks[k] = v end
  end
  values = picks
  local layoutOn = Config.playerLayout ~= false and (not nk or not nk.settings or not nk.settings.flag or nk.settings.flag('hud_layout'))
  local styleOn = not nk or not nk.settings or not nk.settings.flag or nk.settings.flag('hud_style')
  if layoutOn then
    local p = { map = values['place.map'] }
    for _, name in ipairs(Layout.PART_NAMES) do
      local at = values['place.' .. name]
      local order = tonumber(values['order.' .. name])
      if name ~= 'map' and (at ~= nil or order) then
        -- a part moved, or reordered in place: the other half from the server's placement
        local base = serverParts()[name]
        if at == nil then at = base.at == false and 'hidden' or base.at end
        if at == 'hidden' then at = false end -- (not `and false or`: that gives back 'hidden')
        p[name] = { at = at, order = order or base.order }
      end
    end
    Layout.player = Layout.clean(p)
  else
    Layout.player = nil
  end
  local st = {}
  if styleOn then
    for _, key in ipairs(Layout.STYLE_KEYS) do st[key] = values[key] end
  end
  Layout.playerStyles = Layout.cleanStyles(st)
end

--- A placement (the editor's parts) → settings values.
function Prefs.fromParts(parts)
  local clean = Layout.clean(parts) or {}
  local v = { ['place.map'] = clean.map }
  for _, name in ipairs(Layout.PART_NAMES) do
    local p = clean[name]
    if name ~= 'map' and p then
      v['place.' .. name] = p.at == false and 'hidden' or p.at
      v['order.' .. name] = math.max(1, math.min(9, p.order))
    end
  end
  return v
end

--- The keys of one side of the editor, for a reset.
function Prefs.keys(which)
  local out = {}
  for _, r in ipairs(Prefs.rows()) do
    local layout = r.key:find('^place%.') or r.key:find('^order%.')
    if (which == 'layout') == (layout ~= nil) then out[#out + 1] = r.key end
  end
  return out
end

-- an in-memory stand-in when the nuikit runtime (and its settings store) isn't there
local function shim(schema)
  local saved, draft = {}, nil
  local function values()
    local v = {}
    for _, r in ipairs(schema.rows) do v[r.key] = r.default end
    for k, x in pairs(saved) do v[k] = x end
    for k, x in pairs(draft or {}) do v[k] = x end
    return v
  end
  local function changed(isDraft) schema.onChange(values(), {}, isDraft) return values() end
  return {
    get = function(k) return values()[k] end,
    values = values,
    draft = function(patch) draft = draft or {} for k, x in pairs(patch or {}) do draft[k] = x end return changed(true) end,
    save = function() for k, x in pairs(draft or {}) do saved[k] = x end draft = nil return changed(false) end,
    cancel = function() draft = nil return changed(false) end,
    reset = function(keys)
      if keys then for _, k in ipairs(keys) do saved[k] = nil end else saved = {} end
      draft = nil
      return changed(false)
    end,
    preset = function(id)
      for _, p in ipairs(schema.presets) do if p.id == id then draft = p.patch end end
      return changed(true)
    end,
  }
end

--- The old KVP, moved onto the settings once (nobody loses a layout).
local function migrateKvp(handle)
  if not GetResourceKvpString then return end
  local patch, found = {}, {}
  for _, preset in ipairs({ 'compact', 'classic' }) do
    local key = 'nuikit_hud:parts:' .. preset
    local s = GetResourceKvpString(key)
    if s then
      found[#found + 1] = key
      if preset == Layout.preset() then
        local ok, t = pcall(json.decode, s)
        if ok then for k, v in pairs(Prefs.fromParts(t)) do patch[k] = v end end
      end
    end
  end
  local s = GetResourceKvpString('nuikit_hud:styles')
  if s then
    found[#found + 1] = 'nuikit_hud:styles'
    local ok, t = pcall(json.decode, s)
    if ok and type(t) == 'table' then for k, v in pairs(Layout.cleanStyles(t) or {}) do patch[k] = v end end
  end
  if #found == 0 then return end
  if next(patch) then handle.draft(patch) handle.save() end
  if DeleteResourceKvp then for _, key in ipairs(found) do DeleteResourceKvp(key) end end
  print(('[nuikit_hud] moved your saved HUD layout onto nuikit settings (%d)'):format(#found))
end

--- Declare the settings. `onChange(values, draft)` runs on every change (a draft while a page previews).
function Prefs.define(onChange)
  local rows = Prefs.rows()
  local schema = {
    label = 'HUD', version = VERSION, rows = rows, presets = Prefs.presets(rows),
    onChange = function(values, _, draft)
      Prefs.apply(values)
      onChange(values, draft)
    end,
  }
  local S = (nk and nk.settings) or (NUI and NUI.settings)
  local ok, handle = false, nil
  if S and S.define and GetResourceState and GetResourceState('nuikit') == 'started' then
    ok, handle = pcall(S.define, schema)
  end
  if not ok or not handle then handle = shim(schema) end
  Prefs.handle = handle
  Prefs.apply(handle.values())
  migrateKvp(handle)
  return handle
end
