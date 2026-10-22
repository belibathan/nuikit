-- nuikit_pause: the Settings page (docs/design/foundation.md, the settings service). Settings are rows
-- (key, label, kind, options or range) the page draws without knowing them; presets are patch bundles.
-- Until nuikit's own settings service (nk.settings) lands, this file is that service for the pause
-- menu: the UI prefs go through NUI.prefs (saved by the nuikit resource, applied to every UI); the
-- rest are saved here per player in KVP, merged over the defaults with a schema version, so an
-- update never wipes them. Streamer mode and HUD hide are published as client-wide states
-- (NUI.state 'streamer' / 'hud:hidden') for any resource to read.

Settings = {}

local KVP, VERSION = 'nuikit_pause:settings', 1
local cfg = Config.settings or {}

--- The rows, in order. kind: 'toggle' | 'choice' (options) | 'range' (min, max, step).
--- pref = the NUI.prefs key it maps to (the nuikit resource stores those).
local ROWS = {
  { key = 'textSize', label = 'Text size', kind = 'choice', group = 'Display', pref = 'scale',
    options = { { value = 0.9, label = 'Small' }, { value = 1, label = 'Standard' }, { value = 1.1, label = 'Large' }, { value = 1.2, label = 'Larger' } } },
  { key = 'contrast', label = 'High contrast', kind = 'toggle', group = 'Display', pref = 'highContrast' },
  { key = 'reducedMotion', label = 'Reduced motion', kind = 'toggle', group = 'Display', pref = 'reducedMotion',
    description = 'Fades instead of slides, no camera moves' },
  { key = 'streamer', label = 'Streamer mode', kind = 'toggle', group = 'Privacy',
    description = 'Hides names and money on screen' },
  { key = 'hud', label = 'Show the HUD', kind = 'toggle', group = 'HUD' },
}

--- Presets: patch bundles over the rows. A server can add or replace them (Config.settings.presets).
local PRESETS = cfg.presets or {
  { id = 'standard', label = 'Standard', patch = { textSize = 1, contrast = false, reducedMotion = false, streamer = false, hud = true } },
  { id = 'streamer', label = 'Streamer', patch = { streamer = true } },
  { id = 'performance', label = 'Performance', patch = { reducedMotion = true } },
  { id = 'cinema', label = 'Cinema', patch = { hud = false, reducedMotion = false } },
}

local DEFAULTS = { streamer = false, hud = true }
for k, v in pairs(cfg.defaults or {}) do DEFAULTS[k] = v end

local own -- the values this file stores (not the prefs)

local function load()
  local saved = {}
  local raw = GetResourceKvpString(KVP)
  if raw then
    local ok, v = pcall(json.decode, raw)
    if ok and type(v) == 'table' and type(v.values) == 'table' then saved = v.values end
  end
  local values = {}
  for k, v in pairs(DEFAULTS) do values[k] = v end
  -- merged over the defaults: a newer version adds keys without losing the player's
  for k, v in pairs(saved) do if DEFAULTS[k] ~= nil and type(v) == type(DEFAULTS[k]) then values[k] = v end end
  return values
end

local function save()
  SetResourceKvp(KVP, json.encode({ version = VERSION, values = own }))
end

local function publish()
  NUI.state('streamer', own.streamer == true)
  NUI.state('hud:hidden', own.hud == false)
end

local function row(key)
  for _, r in ipairs(ROWS) do if r.key == key then return r end end
end

--- The current value of every row.
function Settings.values()
  own = own or load()
  local prefs = NUI.prefs.get() or {}
  local out = {}
  for _, r in ipairs(ROWS) do
    if r.pref then out[r.key] = prefs[r.pref] else out[r.key] = own[r.key] end
  end
  return out
end

--- What the page draws: rows (hidden ones left out: Config.settings.hide), presets, values.
function Settings.snapshot()
  local hide = {}
  for _, k in ipairs(cfg.hide or {}) do hide[k] = true end
  local rows = {}
  for _, r in ipairs(ROWS) do if not hide[r.key] then rows[#rows + 1] = r end end
  local presets = {}
  for _, p in ipairs(PRESETS) do presets[#presets + 1] = { id = p.id, label = p.label } end
  return { rows = rows, presets = presets, values = Settings.values() }
end

--- Apply a patch { key = value }: prefs go to the nuikit resource, the rest are saved here. Applied
--- at once (the UI is the live preview).
function Settings.set(patch)
  own = own or load()
  local prefs, changed = {}, false
  for k, v in pairs(type(patch) == 'table' and patch or {}) do
    local r = row(k)
    if r then
      if r.pref then
        prefs[r.pref] = v
      elseif type(v) == type(DEFAULTS[k]) then
        own[k] = v
        changed = true
      end
    end
  end
  if next(prefs) then NUI.prefs.set(prefs) end
  if changed then
    save()
    publish()
  end
  -- with the nuikit resource the prefs land a moment later (an event): answer with them applied
  local values = Settings.values()
  for k, v in pairs(type(patch) == 'table' and patch or {}) do
    local r = row(k)
    if r and r.pref then values[k] = v end
  end
  return values
end

function Settings.preset(id)
  for _, p in ipairs(PRESETS) do
    if p.id == id then return Settings.set(p.patch) end
  end
  return nil
end

function Settings.reset()
  local patch = {}
  for k, v in pairs(DEFAULTS) do patch[k] = v end
  for _, r in ipairs(ROWS) do
    if r.key == 'textSize' then patch[r.key] = 1 elseif r.pref then patch[r.key] = false end
  end
  return Settings.set(patch)
end

function Settings.get(key)
  return Settings.values()[key]
end

CreateThread(function()
  own = load()
  publish()
end)
