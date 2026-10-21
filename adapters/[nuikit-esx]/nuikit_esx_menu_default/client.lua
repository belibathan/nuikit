--[[
  nuikit_esx_menu_default: the ESX.UI.Menu "default" type, drawn by nk.menu (docs/adapters/esx-menu-default.md).

  Mechanism: stand-in as a menu type. `provide 'esx_menu_default'` stands in for the resource, and the
  type is registered through the documented ESX.UI.Menu.RegisterType('default', open, close), so every
  ESX.UI.Menu.Open('default', namespace, name, data, submit, cancel, change, close) lands here. The menu
  object the script holds is es_extended's; its submit / cancel / change callbacks are reached through it.

  One keyboard menu per (namespace, name), stacked as the library stacks them. Elements are rows; a
  `slider` (min/max/value) or an `options` list is a stepper row (←/→ change the value and run `change`,
  Enter submits with it). Opening the same menu again (refresh, setElements, setTitle…) updates the drawn
  one in place. Escape runs `cancel`; the script closes with menu.close() as it always did. If it does not,
  the menu is drawn again so screen and es_extended agree.
]]

local TYPE = 'default'
local MAX_STEPS = 500 -- a numeric slider wider than this becomes an inline slider field instead of a stepper row

local ALIGN = {
  ['top-left'] = 'top-left', ['top-right'] = 'top-right', ['bottom-left'] = 'bottom-left', ['bottom-right'] = 'bottom-right',
  center = 'center', ['top-center'] = 'top', ['bottom-center'] = 'bottom', top = 'top', bottom = 'bottom',
}

ESX = ESX or exports['es_extended']:getSharedObject()

local opened = {} -- key → m = { key, namespace, name, data, handle, steps[i], base[i], closing }

local function key(namespace, name) return ('%s:%s'):format(tostring(namespace), tostring(name)) end

local function call(fn, ...)
  if type(fn) ~= 'function' then return end
  local ok, err = pcall(fn, ...)
  if not ok then print(('^1[nuikit_esx_menu_default] callback failed:^7 %s'):format(tostring(err))) end
end

local function menuObject(m)
  return ESX.UI.Menu.GetOpened(TYPE, m.namespace, m.name)
end

--- A stepper row's value as the script sees it: the slider number, or the option index (0- or 1-based as given).
local function valueOf(m, i, el, step)
  if el.type == 'slider' and type(el.options) ~= 'table' then
    local min = tonumber(el.min) or 0
    return min + step - 1
  end
  if type(el.options) == 'table' and #el.options > 0 then
    return step - 1 + (m.base[i] or 1)
  end
  return el.value
end

--- Elements as they are now (sliders carry the value on screen); `current` for one index.
local function snapshot(m, index)
  local elements, current = {}, nil
  for i, el in ipairs(m.data.elements or {}) do
    local copy = {}
    for k, v in pairs(el) do copy[k] = v end
    if m.steps[i] then copy.value = valueOf(m, i, el, m.steps[i]) end
    elements[i] = copy
    if i == index then current = copy end
  end
  return elements, current
end

local function items(m)
  local out = {}
  for i, el in ipairs(m.data.elements or {}) do
    if type(el) ~= 'table' then el = { label = tostring(el) } end
    local item = {
      id = type(el.name) == 'string' and el.name or tostring(i),
      label = el.label ~= nil and tostring(el.label) or '',
      description = el.description ~= nil and tostring(el.description) or nil,
      icon = type(el.icon) == 'string' and el.icon ~= '' and el.icon or nil,
      disabled = el.disabled == true or nil,
    }
    local opts = type(el.options) == 'table' and #el.options > 0 and el.options or nil
    if opts then
      local values = {}
      for j, o in ipairs(opts) do values[j] = type(o) == 'table' and tostring(o.label or o.value or j) or tostring(o) end
      item.values = values
      local v = tonumber(el.value)
      m.base[i] = (v == 0) and 0 or 1 -- a script that starts at 0 counts options from 0
      local idx = (v or m.base[i]) - m.base[i] + 1
      item.defaultIndex = math.max(1, math.min(#values, math.floor(idx)))
      m.steps[i] = m.steps[i] or item.defaultIndex
    elseif el.type == 'slider' then
      local min, max = math.floor(tonumber(el.min) or 0), math.floor(tonumber(el.max) or 100)
      if max < min then max = min end
      local v = math.floor(tonumber(el.value) or min)
      if max - min + 1 <= MAX_STEPS then
        local values = {}
        for n = min, max do values[#values + 1] = tostring(n) end
        item.values = values
        item.defaultIndex = math.max(1, math.min(#values, v - min + 1))
        m.steps[i] = m.steps[i] or item.defaultIndex
      else
        item.field = { type = 'slider', min = min, max = max, default = v }
      end
    end
    out[i] = item
  end
  if #out == 0 then out[1] = { label = ' ', readOnly = true } end
  return out
end

local function props(m)
  return {
    id = m.key,
    title = m.data.title ~= nil and tostring(m.data.title) or '',
    position = ALIGN[m.data.align] or 'top-left',
    input = 'keyboard',
    items = items(m),
  }
end

local function redraw(m)
  if m.handle and m.handle:isOpen() then
    local p = props(m)
    m.handle:update({ title = p.title, position = p.position, items = p.items })
    return
  end
  m.handle = nk.menu(props(m), {
    cb = function(result, reason)
      if opened[m.key] ~= m then return end
      if reason == 'replaced' then return end -- the same menu opened again: the new handle owns it
      opened[m.key] = nil
      local menu = menuObject(m)
      if m.closing or not menu then return end
      if result then
        local elements, current = snapshot(m, result.index)
        if result.value and current then m.steps[result.index] = result.value; elements, current = snapshot(m, result.index) end
        call(menu.submit, { current = current, elements = elements })
      else
        local elements, current = snapshot(m, m.active)
        call(menu.cancel, { current = current, elements = elements })
      end
      -- The script did not close it: es_extended still lists it, so draw it again.
      if ESX.UI.Menu.IsOpen(TYPE, m.namespace, m.name) and not opened[m.key] then
        opened[m.key] = m
        m.handle = nil
        redraw(m)
      end
    end,
    onChange = function(data)
      if opened[m.key] ~= m or type(data) ~= 'table' then return end
      m.active = data.index
      if data.value then m.steps[data.index] = data.value end
      local menu = menuObject(m)
      if not menu then return end
      local elements, current = snapshot(m, data.index)
      call(menu.change, { current = current, elements = elements })
    end,
    onScroll = function(data)
      if opened[m.key] ~= m or type(data) ~= 'table' then return end
      m.active = data.index
      m.steps[data.index] = data.value
      local menu = menuObject(m)
      if not menu then return end
      local elements, current = snapshot(m, data.index)
      call(menu.change, { current = current, elements = elements })
    end,
  })
  if not m.handle then opened[m.key] = nil end
end

-- ───────────────────────────────── the menu type

local function open(namespace, name, data)
  if type(data) ~= 'table' then data = {} end
  local k = key(namespace, name)
  local m = opened[k]
  if m then
    m.data = data -- refresh / setElements / setTitle / removeElement: the same menu, new data
    m.steps = {}
    redraw(m)
    return
  end
  m = { key = k, namespace = namespace, name = name, data = data, steps = {}, base = {}, active = 1 }
  opened[k] = m
  redraw(m)
end

local function close(namespace, name)
  local m = opened[key(namespace, name)]
  if not m then return end
  opened[m.key] = nil
  m.closing = true
  if m.handle and m.handle:isOpen() then m.handle:cancel('close') end
end

ESX.UI.Menu.RegisterType(TYPE, open, close)
