-- nuikit_pause: the player's display settings, declared on nuikit's settings service (nk.settings,
-- docs/settings.md). Rows and presets live in the nuikit resource's store (versioned, merged over
-- defaults); any settings page shows them, the pause menu's Settings page included, which also shows
-- every other resource's section (the HUD's, a job's) the same way.
-- What the rows do (onChange, live while a page previews a draft): text size, contrast and reduced
-- motion are the UI prefs every nuikit page follows (NUI.prefs); streamer mode and HUD hide are
-- client-wide states other resources read (NUI.getState('streamer'), NUI.getState('hud:hidden')).

Settings = {}

local cfg = Config.settings or {}
local OLD_KVP = 'nuikit_pause:settings' -- 0.9's own store, moved into nk.settings once

local hide = {}
for _, k in ipairs(cfg.hide or {}) do hide[k] = true end

local function rows()
  local all = {
    { key = 'textSize', label = 'Text size', group = 'Display', default = 1,
      options = { { value = 0.9, label = 'Small' }, { value = 1, label = 'Standard' }, { value = 1.1, label = 'Large' }, { value = 1.2, label = 'Larger' } } },
    { key = 'contrast', label = 'High contrast', group = 'Display', toggle = true, default = false },
    { key = 'reducedMotion', label = 'Reduced motion', group = 'Display', toggle = true, default = false,
      description = 'Fades instead of slides, no camera moves' },
    { key = 'streamer', label = 'Streamer mode', group = 'Privacy', toggle = true, default = false, flag = 'streamer_mode',
      description = 'Hides names and money on screen' },
    { key = 'hud', label = 'Show the HUD', group = 'HUD', toggle = true, default = true },
  }
  local out = {}
  for _, r in ipairs(all) do
    if cfg.defaults and cfg.defaults[r.key] ~= nil then r.default = cfg.defaults[r.key] end
    if not hide[r.key] then out[#out + 1] = r end
  end
  return out
end

local PRESETS = cfg.presets or {
  { id = 'standard', label = 'Standard', patch = { textSize = 1, contrast = false, reducedMotion = false, streamer = false, hud = true } },
  { id = 'streamer', label = 'Streamer', patch = { streamer = true } },
  { id = 'performance', label = 'Performance', patch = { reducedMotion = true } },
  { id = 'cinema', label = 'Cinema', patch = { hud = false, reducedMotion = false } },
}

local DEFAULTS = {}
for _, r in ipairs(rows()) do DEFAULTS[r.key] = r.default end

local handle      -- the nk.settings handle (nil without the nuikit resource: defaults, nothing saved)
local fallback = {}
for k, v in pairs(DEFAULTS) do fallback[k] = v end

--- What the values mean: the UI prefs and the client-wide states.
local function apply(v)
  local prefs = NUI.prefs.get() or {}
  local want = { scale = v.textSize or 1, highContrast = v.contrast == true, reducedMotion = v.reducedMotion == true }
  if prefs.scale ~= want.scale or prefs.highContrast ~= want.highContrast or prefs.reducedMotion ~= want.reducedMotion then
    NUI.prefs.set(want)
  end
  NUI.state('streamer', v.streamer == true)
  NUI.state('hud:hidden', v.hud == false)
end

function Settings.values()
  return handle and handle.values() or fallback
end

function Settings.get(key)
  return Settings.values()[key]
end

--- Declare the section on nuikit's settings service and apply what's saved (once, at start).
function Settings.init()
  if handle then return end
  local api = NUI.settings
  if api and api.define then
    local ok, h = pcall(api.define, {
      label = cfg.label or 'Display',
      version = 1,
      rows = rows(),
      presets = PRESETS,
      onChange = function(values) apply(values) end,
    })
    if ok then handle = h else print(('^3[nuikit_pause] settings unavailable (%s): defaults only^7'):format(tostring(h))) end
  end
  -- 0.9 kept these in its own KVP: carried over once, then removed
  local raw = handle and GetResourceKvpString(OLD_KVP)
  if raw then
    local ok, old = pcall(json.decode, raw)
    if ok and type(old) == 'table' and type(old.values) == 'table' then
      local patch = {}
      for k, v in pairs(old.values) do if DEFAULTS[k] ~= nil then patch[k] = v end end
      if next(patch) then
        handle.draft(patch)
        handle.save()
      end
    end
    DeleteResourceKvp(OLD_KVP)
  end
  apply(Settings.values())
end

CreateThread(Settings.init)
