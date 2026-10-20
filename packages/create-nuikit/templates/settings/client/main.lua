-- {{name}}: client
-- The settings panel lives in web/ (the settings block); this file builds what it shows from
-- config.lua, saves every change on the player's PC (KVP) and tells your scripts about it.
-- The Accessibility section is nuikit's own player preferences (nk.prefs): every nuikit UI follows it.
-- Lua → UI: surfaces nk.surface(name, opts) · UI → Lua: nk.on(callback, fn) ↔ fetchNui()

local panel = nk.surface('settings', { layer = 'panel', exclusive = true })

local KVP = 'settings:'
local defs = {} -- id → item definition from config.lua

for _, section in ipairs(Config.sections or {}) do
  for _, item in ipairs(section.items or {}) do defs[item.id] = item end
end

--- A saved setting, or its default.
local function get(id)
  local item = defs[id]
  if not item then return nil end
  local raw = GetResourceKvpString(KVP .. id)
  if raw == nil then return item.default end
  local ok, value = pcall(json.decode, raw)
  if ok and value ~= nil then return value end
  return item.default
end

--- Whether `value` is allowed for `item`; returns the value to keep (clamped), or nil.
local function accept(item, value)
  if item.type == 'toggle' then
    if type(value) == 'boolean' then return value end
    return nil
  end
  if item.type == 'choice' then
    for _, o in ipairs(item.options or {}) do
      if o.value == value then return value end
    end
    return nil
  end
  if item.type == 'slider' then
    value = tonumber(value)
    if not value then return nil end
    return math.max(item.min, math.min(item.max, value))
  end
end

-- Accessibility: nuikit's preferences, shown in percent / on-off.
local ACCESS = {
  scale = { type = 'slider', label = 'UI size', description = 'Every nuikit screen', min = 85, max = 125, step = 5, unit = '%' },
  reducedMotion = { type = 'toggle', label = 'Reduce motion', description = 'No animations or transitions' },
  highContrast = { type = 'toggle', label = 'High contrast', description = 'Stronger text and borders' },
}

local function accessibility()
  local p = nk.prefs.get()
  local function item(id, value)
    local d = ACCESS[id]
    return { id = id, type = d.type, label = d.label, description = d.description, min = d.min, max = d.max, step = d.step, unit = d.unit, value = value }
  end
  return {
    id = 'accessibility',
    title = 'Accessibility',
    items = {
      item('scale', math.floor((p.scale or 1) * 100 + 0.5)),
      item('reducedMotion', p.reducedMotion == true),
      item('highContrast', p.highContrast == true),
    },
  }
end

--- What the panel shows (web/src/components/blocks/settings/nui.ts: SettingsData).
local function sections()
  local out = {}
  for _, section in ipairs(Config.sections or {}) do
    local items = {}
    for _, d in ipairs(section.items or {}) do
      items[#items + 1] = {
        id = d.id, type = d.type, label = d.label, description = d.description,
        options = d.options, min = d.min, max = d.max, step = d.step, unit = d.unit,
        value = get(d.id),
      }
    end
    out[#out + 1] = { id = section.id, title = section.title, items = items }
  end
  if Config.accessibility ~= false then out[#out + 1] = accessibility() end
  if Config.keys and #Config.keys > 0 then
    local items = {
      { id = 'key:open', type = 'key', label = 'Open settings', description = 'Change any key in Settings → Key Bindings → FiveM', key = Config.key },
    }
    for i, k in ipairs(Config.keys) do items[#items + 1] = { id = 'key:' .. i, type = 'key', label = k.label, key = k.key } end
    out[#out + 1] = { id = 'keys', title = 'Keys', items = items }
  end
  return out
end

local function payload()
  return { title = Config.title, sections = sections(), resettable = true }
end

-- /{{name}} or F10 opens it (players can rebind it in Settings → Key Bindings → FiveM).
RegisterCommand('{{name}}', function() panel:toggle(payload()) end, false)
RegisterKeyMapping('{{name}}', 'Open settings', 'keyboard', Config.key or 'F10')

-- Whatever you return is what the row shows: Lua has the last word.
nk.on('settings:change', function(data)
  local id = data.id
  if ACCESS[id] and Config.accessibility ~= false then
    if id == 'scale' then
      local pct = math.max(85, math.min(125, tonumber(data.value) or 100))
      nk.prefs.set({ scale = pct / 100 })
      return { ok = true, value = pct }
    end
    nk.prefs.set({ [id] = data.value == true })
    return { ok = true, value = data.value == true }
  end

  local item = defs[id]
  local value = item and accept(item, data.value)
  if value == nil then return { ok = false, value = item and get(id) or nil } end
  SetResourceKvp(KVP .. id, json.encode(value))
  TriggerEvent('{{name}}:changed', id, value) -- your scripts react here
  return { ok = true, value = value }
end)

nk.on('settings:reset', function()
  for id in pairs(defs) do
    DeleteResourceKvp(KVP .. id)
    TriggerEvent('{{name}}:changed', id, defs[id].default)
  end
  local out = sections()
  if Config.accessibility ~= false then
    nk.prefs.set({ scale = 1.0, reducedMotion = false, highContrast = false })
    -- the preferences arrive back from the nuikit resource a moment later: answer with them already reset
    local defaults = { scale = 100, reducedMotion = false, highContrast = false }
    for _, section in ipairs(out) do
      if section.id == 'accessibility' then
        for _, item in ipairs(section.items) do item.value = defaults[item.id] end
      end
    end
  end
  return { ok = true, sections = out }
end)

-- Other resources read a setting: exports['{{name}}']:get('units')
exports('get', get)
