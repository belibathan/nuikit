--[[
  nuikit_esx_context: esx_context's public API, drawn by nk.intent.menu (docs/adapters/esx-context.md).

  Mechanism: stand-in. `provide 'esx_context'` plus the four exports registered under esx_context's name
  (`Open`, `Preview`, `Close`, `Refresh`: the calls `ESX.OpenContext` / `PreviewContext` / `CloseContext` /
  `RefreshContext` are documented as esx_context's functions), so they land here whatever asked.

  One context at a time, as the library. Elements become menu rows: `unselectable` rows are headers (the
  first one, when there are others, is the panel's title), `input` rows are inline fields whose values the
  renderer keeps across Refresh. Rows never close the menu on their own: `onSelect(menu, element)` runs with
  every input's current value in `menu.eles`, and the script closes with ESX.CloseContext() as it always
  did (`onClose()` runs then, and on Escape). PreviewContext draws without taking the cursor.
]]

local LIB = 'esx_context'
local POSITIONS = { left = 'center-left', center = 'center', right = 'center-right' }
local FIELD = { text = 'text', number = 'number', radio = 'select' }

local ctx = nil -- { handle, position, canClose, elements, rows, onSelect, onClose }

local function call(fn, ...)
  if type(fn) ~= 'function' then return end
  local ok, err = pcall(fn, ...)
  if not ok then print(('^1[nuikit_esx_context] callback failed:^7 %s'):format(tostring(err))) end
end

local function options(el)
  local out = {}
  for i, o in ipairs(type(el.options) == 'table' and el.options or {}) do
    if type(o) == 'table' then
      out[#out + 1] = { value = tostring(o.value ~= nil and o.value or i), label = o.label and tostring(o.label) or nil }
    else
      out[#out + 1] = { value = tostring(o), label = tostring(o) }
    end
  end
  return out
end

--- Elements → the menu's title/description and rows. rows[itemIndex] = elementIndex.
local function build(elements)
  local items, rows = {}, {}
  local title, description = '', nil
  local first = elements[1]
  local lifted = #elements > 1 and type(first) == 'table' and first.unselectable and not first.input and type(first.title) == 'string'
  if lifted then title, description = first.title, first.description end
  for i, el in ipairs(elements) do
    if not (lifted and i == 1) and type(el) == 'table' then
      local item = {
        id = type(el.name) == 'string' and el.name or tostring(i),
        label = el.title ~= nil and tostring(el.title) or nil,
        description = el.description ~= nil and tostring(el.description) or nil,
        icon = type(el.icon) == 'string' and el.icon ~= '' and el.icon or nil,
        disabled = el.disabled == true or nil,
        close = false,
      }
      if el.unselectable then item.kind = 'header' end
      if el.input then
        local kind = FIELD[el.inputType] or 'text'
        local field = { type = kind, placeholder = el.inputPlaceholder, min = tonumber(el.inputMin), max = tonumber(el.inputMax) }
        if kind == 'select' then
          field.options = options(el)
          if #field.options == 0 then field.type = 'text' kind = 'text' end
        end
        if el.inputValue ~= nil then
          if kind == 'number' then field.default = tonumber(el.inputValue)
          else field.default = tostring(el.inputValue) end
        end
        item.field = field
      end
      items[#items + 1] = item
      rows[#items] = i
    end
  end
  if #items == 0 then items[1] = { label = title ~= '' and title or ' ', readOnly = true } rows[1] = 1 end
  return title, description, items, rows
end

--- Write the renderer's field values back into the elements (menu.eles carries inputValue).
local function sync(c, fields)
  if type(fields) ~= 'table' then return end
  local _, _, items, rows = build(c.elements)
  for i, item in ipairs(items) do
    if item.field and fields[item.id] ~= nil then
      local el = c.elements[rows[i]]
      if el then el.inputValue = fields[item.id] end
    end
  end
end

local function menuOf(c)
  return { position = c.position, canClose = c.canClose, eles = c.elements }
end

local function open(position, elements, canClose, onSelect, onClose, preview)
  if type(elements) ~= 'table' then return end
  if canClose == nil then canClose = true end
  local c = { position = position, canClose = canClose, elements = elements, onSelect = onSelect, onClose = onClose }
  local title, description, items, rows = build(elements)
  c.rows = rows
  local closable = canClose ~= false
  c.handle = nk.intent.menu({
    id = 'context',
    title = title,
    description = description,
    position = POSITIONS[position] or 'center-right',
    input = 'cursor',
    focus = not preview,
    canClose = closable,
    dismissable = closable,
    items = items,
  }, {
    cb = function(_, reason)
      if ctx ~= c then return end -- replaced by a newer Open, or already closed by code
      ctx = nil
      if reason ~= 'replaced' then call(c.onClose) end
    end,
    onSelect = function(data)
      if ctx ~= c or type(data) ~= 'table' then return end
      sync(c, data.fields)
      local el = c.elements[c.rows[data.index] or -1]
      if el then call(c.onSelect, menuOf(c), el) end
    end,
    onField = function(data)
      if ctx ~= c or type(data) ~= 'table' then return end
      sync(c, { [data.id] = data.value })
    end,
  })
  if not c.handle then return end
  ctx = c
end

-- ───────────────────────────────── the library's API, by name

local function Open(position, elements, canClose, onSelect, onClose)
  open(position, elements, canClose, onSelect, onClose, false)
end

local function Preview(position, elements, canClose, onSelect, onClose)
  open(position, elements, canClose, onSelect, onClose, true)
end

local function Close()
  local c = ctx
  if not c then return end
  ctx = nil
  if c.handle:isOpen() then c.handle:cancel('close') end
  call(c.onClose)
end

local function Refresh(position, elements)
  local c = ctx
  if not c or type(elements) ~= 'table' then return end
  c.position = position or c.position
  c.elements = elements
  local title, description, items, rows = build(elements)
  c.rows = rows
  c.handle:update({ title = title, description = description, position = POSITIONS[c.position] or 'center-right', items = items })
end

local API = { Open = Open, Preview = Preview, Close = Close, Refresh = Refresh }
for name, fn in pairs(API) do
  exports(name, fn)
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end
