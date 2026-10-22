--[[
  nk.settings: settings a resource declares as rows, shown by any page as a live-preview draft, then saved or
  reset (docs/settings.md). Saved per player in the nuikit resource's KVP, merged over the defaults with the
  schema's version, so an update never wipes a player's choices.

    local hud = nk.settings.define({
      label = 'HUD', version = 2,
      rows = {
        { key = 'layout', label = 'Layout', options = { { value = 'compact', label = 'Compact' }, { value = 'classic', label = 'Classic' } }, default = 'compact' },
        { key = 'scale', label = 'Size', range = { 0.8, 1.2, 0.05 }, default = 1.0 },
        { key = 'minimap', label = 'Minimap', toggle = true, default = true, flag = 'hud_minimap' },
      },
      presets = { { id = 'streamer', label = 'Streamer', patch = { minimap = false } } },
      migrate = function(old, from) return old end,          -- optional, runs when the saved version differs
      onChange = function(values, changed, draft) … end,     -- draft = true while a page previews
    })
    hud.get('layout'); hud.values()

  Feature flags: `setr nuikit_flag_<name> 0` hides a row with `flag = '<name>'` from every settings page (its
  value is kept) and makes nk.settings.flag('<name>') false, so a resource hides that part. Flags default on.

  The store lives in the nuikit resource (exports settingsDefine…, NUI callbacks https://nuikit/settings*);
  every other resource's copy of this file is the client API over those exports.
]]

local RUNTIME = 'nuikit'
local RESOURCE = GetCurrentResourceName()
local settings = {}

-- ───────────────────────────────── pure: rows, values, merge (used by the store and the tests)

local function kind(row)
  if row.options then return 'options' end
  if row.range then return 'range' end
  return 'toggle'
end

--- A value a row accepts, or nil. Ranges clamp and snap to their step; options must be listed.
function settings.normalize(row, value)
  local k = kind(row)
  if k == 'toggle' then
    if type(value) == 'boolean' then return value end
    return nil
  elseif k == 'range' then
    local n = tonumber(value)
    if not n then return nil end
    local lo, hi, step = tonumber(row.range[1]) or 0, tonumber(row.range[2]) or 1, tonumber(row.range[3])
    if n < lo then n = lo elseif n > hi then n = hi end
    if step and step > 0 then n = lo + math.floor((n - lo) / step + 0.5) * step end
    return math.floor(n * 1e6 + 0.5) / 1e6
  else
    for _, o in ipairs(row.options) do
      -- not `and o.value or o`: an option whose value is false must still match
      local v = o
      if type(o) == 'table' then v = o.value end
      if v == value then return v end
    end
    return nil
  end
end

--- A schema with its rows checked: unique string keys, a default the row accepts. Returns schema, problems.
function settings.validate(schema)
  local problems, rows, seen = {}, {}, {}
  for i, row in ipairs(type(schema.rows) == 'table' and schema.rows or {}) do
    if type(row) ~= 'table' or type(row.key) ~= 'string' or row.key == '' then
      problems[#problems + 1] = ('row %d has no key'):format(i)
    elseif seen[row.key] then
      problems[#problems + 1] = ('row %s is declared twice'):format(row.key)
    else
      seen[row.key] = true
      local d = settings.normalize(row, row.default)
      -- a default outside its own range is a schema mistake, not something to clamp quietly
      if d ~= nil and row.range and math.abs(d - tonumber(row.default)) > 1e-6 then d = nil end
      if d == nil then
        problems[#problems + 1] = ('row %s: its default %s isn\'t a value it accepts'):format(row.key, tostring(row.default))
      else
        rows[#rows + 1] = { key = row.key, label = row.label or row.key, description = row.description, options = row.options, range = row.range, toggle = kind(row) == 'toggle' or nil, default = d, flag = row.flag, group = row.group }
      end
    end
  end
  local presets = {}
  for _, p in ipairs(type(schema.presets) == 'table' and schema.presets or {}) do
    if type(p) == 'table' and type(p.id) == 'string' and type(p.patch) == 'table' then presets[#presets + 1] = { id = p.id, label = p.label or p.id, patch = p.patch } end
  end
  return { label = schema.label, version = tonumber(schema.version) or 1, rows = rows, presets = presets }, problems
end

--- Only what the rows accept, from `patch` (unknown keys and invalid values dropped).
function settings.clean(schema, patch)
  local out = {}
  if type(patch) ~= 'table' then return out end
  for _, row in ipairs(schema.rows) do
    if patch[row.key] ~= nil then
      local v = settings.normalize(row, patch[row.key])
      if v ~= nil then out[row.key] = v end
    end
  end
  return out
end

--- Defaults, then saved, then draft.
function settings.merge(schema, saved, draft)
  local out = {}
  for _, row in ipairs(schema.rows) do out[row.key] = row.default end
  for k, v in pairs(settings.clean(schema, saved)) do out[k] = v end
  for k, v in pairs(settings.clean(schema, draft)) do out[k] = v end
  return out
end

--- Is a feature flag on? `setr nuikit_flag_<name> 0` (or false/off) turns it off; unset is on.
function settings.flag(name)
  local v = GetConvar('nuikit_flag_' .. tostring(name), '1')
  return not (v == '0' or v == 'false' or v == 'off')
end

local function diff(a, b)
  local changed = {}
  for k, v in pairs(b) do if a[k] ~= v then changed[#changed + 1] = k end end
  table.sort(changed)
  return changed
end

-- ───────────────────────────────── the store (the nuikit resource)

if RESOURCE == RUNTIME then
  local sections = {} -- resource → { schema, saved, draft, values }
  local order = {}

  local function kvpKey(res) return 'nuikit:settings:' .. res end

  local function readSaved(res)
    local raw = GetResourceKvpString(kvpKey(res))
    if not raw or raw == '' then return nil end
    local ok, data = pcall(json.decode, raw)
    return ok and type(data) == 'table' and data or nil
  end

  local function writeSaved(res, s)
    -- only what differs from the default: a new default reaches players who never chose
    local values = {}
    for _, row in ipairs(s.schema.rows) do
      local v = s.saved[row.key]
      if v ~= nil and v ~= row.default then values[row.key] = v end
    end
    SetResourceKvp(kvpKey(res), json.encode({ v = s.schema.version, values = values }))
  end

  local function publish(res, before, draft)
    local s = sections[res]
    s.values = settings.merge(s.schema, s.saved, s.draft)
    local changed = diff(before, s.values)
    TriggerEvent('nuikit:settings:changed', res, s.values, changed, draft == true)
    return s.values
  end

  local function visibleRows(s)
    local rows = {}
    for _, row in ipairs(s.schema.rows) do
      if not row.flag or settings.flag(row.flag) then rows[#rows + 1] = row end
    end
    return rows
  end

  local function view(res)
    local s = sections[res]
    local presets = {}
    for _, p in ipairs(s.schema.presets) do presets[#presets + 1] = { id = p.id, label = p.label } end
    return { resource = res, label = s.schema.label or res, version = s.schema.version, rows = visibleRows(s), presets = presets, values = s.values, draft = s.draft ~= nil }
  end

  --- What a resource saved last: { v = version, values = {…} } or nil (its migrate runs on it).
  function settings.saved(res) return readSaved(res) end

  --- Register (or re-register) a resource's schema; `saved` is what its migrate made of the stored values.
  function settings.store(res, schema, saved)
    local clean, problems = settings.validate(schema)
    for _, p in ipairs(problems) do print(('^3[nuikit] settings for %s: %s^7'):format(res, p)) end
    local stored = saved
    if stored == nil then
      local raw = readSaved(res)
      stored = raw and raw.values or {}
    end
    if not sections[res] then order[#order + 1] = res end
    sections[res] = { schema = clean, saved = settings.clean(clean, stored), draft = nil }
    sections[res].values = settings.merge(clean, sections[res].saved)
    -- the version moved on: write what survived, under the new version
    local raw = readSaved(res)
    if raw and raw.v ~= clean.version then writeSaved(res, sections[res]) end
    return sections[res].values
  end

  function settings.values(res)
    local s = sections[res]
    return s and s.values or nil
  end

  function settings.draft(res, patch)
    local s = sections[res]
    if not s then return nil end
    local before = s.values
    s.draft = s.draft or {}
    for k, v in pairs(settings.clean(s.schema, patch)) do s.draft[k] = v end
    return publish(res, before, true)
  end

  function settings.preset(res, id)
    local s = sections[res]
    if not s then return nil end
    for _, p in ipairs(s.schema.presets) do
      if p.id == id then return settings.draft(res, p.patch) end
    end
    return nil
  end

  function settings.cancel(res)
    local s = sections[res]
    if not s then return nil end
    local before = s.values
    s.draft = nil
    return publish(res, before, false)
  end

  function settings.save(res)
    local s = sections[res]
    if not s then return nil end
    local before = s.values
    for k, v in pairs(s.draft or {}) do s.saved[k] = v end
    s.draft = nil
    writeSaved(res, s)
    return publish(res, before, false)
  end

  --- Back to the defaults (every row, or the listed keys), saved at once.
  function settings.reset(res, keys)
    local s = sections[res]
    if not s then return nil end
    local before = s.values
    if type(keys) == 'table' and #keys > 0 then
      for _, k in ipairs(keys) do
        s.saved[k] = nil
        if s.draft then s.draft[k] = nil end
      end
    else
      s.saved, s.draft = {}, nil
    end
    writeSaved(res, s)
    return publish(res, before, false)
  end

  function settings.list(res)
    local out = {}
    for _, r in ipairs(order) do
      if sections[r] and (res == nil or res == r) then out[#out + 1] = view(r) end
    end
    return out
  end

  -- a stopped resource leaves the list (what it saved stays in KVP); an open draft is dropped
  AddEventHandler('onClientResourceStop', function(res)
    if not sections[res] then return end
    sections[res] = nil
    for i, r in ipairs(order) do if r == res then table.remove(order, i) break end end
  end)

  exports('settingsSaved', settings.saved)
  exports('settingsDefine', settings.store)
  exports('settingsValues', settings.values)
  exports('settingsDraft', settings.draft)
  exports('settingsSave', settings.save)
  exports('settingsCancel', settings.cancel)
  exports('settingsReset', settings.reset)
  exports('settingsPreset', settings.preset)
  exports('settingsList', settings.list)

  -- Pages (any resource's): https://nuikit/settings { resource? } → { sections }; the rest take { resource, … }
  -- and answer the section's new values.
  local function answer(fn)
    return function(data, cb)
      data = type(data) == 'table' and data or {}
      if type(data.resource) ~= 'string' then cb({ error = 'resource' }) return end
      local values = fn(data)
      cb(values and { values = values } or { error = 'unknown resource' })
    end
  end
  RegisterNUICallback('settings', function(data, cb)
    data = type(data) == 'table' and data or {}
    cb({ sections = settings.list(type(data.resource) == 'string' and data.resource or nil) })
  end)
  RegisterNUICallback('settings:draft', answer(function(d) return settings.draft(d.resource, d.patch) end))
  RegisterNUICallback('settings:preset', answer(function(d) return settings.preset(d.resource, d.preset) end))
  RegisterNUICallback('settings:cancel', answer(function(d) return settings.cancel(d.resource) end))
  RegisterNUICallback('settings:save', answer(function(d) return settings.save(d.resource) end))
  RegisterNUICallback('settings:reset', answer(function(d) return settings.reset(d.resource, d.keys) end))
end

-- ───────────────────────────────── the client API (every resource, the nuikit one included)

-- the store's export → its function here, for the nuikit resource's own calls (no export round trip)
local LOCAL = { settingsSaved = 'saved', settingsDefine = 'store', settingsDraft = 'draft', settingsSave = 'save', settingsCancel = 'cancel', settingsReset = 'reset', settingsPreset = 'preset' }

local function store(name, ...)
  if RESOURCE == RUNTIME then return settings[LOCAL[name]](...) end
  return exports[RUNTIME][name](exports[RUNTIME], ...)
end

--- Declare this resource's settings. Returns a handle: get(key), values(), and the store's ops for this resource.
function settings.define(schema)
  assert(type(schema) == 'table', 'nk.settings.define(schema)')
  local saved = store('settingsSaved', RESOURCE)
  local values = saved and saved.values or {}
  if saved and type(schema.migrate) == 'function' and saved.v ~= (tonumber(schema.version) or 1) then
    local ok, migrated = pcall(schema.migrate, values, saved.v)
    if ok and type(migrated) == 'table' then values = migrated
    else print(('^3[nuikit] settings migrate failed for %s: %s^7'):format(RESOURCE, tostring(migrated))) end
  end
  local plain = { label = schema.label, version = schema.version, rows = schema.rows, presets = schema.presets }
  local current = store('settingsDefine', RESOURCE, plain, values) or {}
  local onChange = schema.onChange

  AddEventHandler('nuikit:settings:changed', function(res, v, changed, draft)
    if res ~= RESOURCE then return end
    current = v
    if NUI and NUI.send then NUI.send('nuikit:settings', { values = v, changed = changed, draft = draft }) end
    if onChange then onChange(v, changed, draft) end
  end)

  local handle = {}
  function handle.get(key) return current[key] end
  function handle.values() return current end
  function handle.draft(patch) return store('settingsDraft', RESOURCE, patch) end
  function handle.save() return store('settingsSave', RESOURCE) end
  function handle.cancel() return store('settingsCancel', RESOURCE) end
  function handle.reset(keys) return store('settingsReset', RESOURCE, keys) end
  function handle.preset(id) return store('settingsPreset', RESOURCE, id) end
  return handle
end

if NUI then NUI.settings = settings end
return settings
