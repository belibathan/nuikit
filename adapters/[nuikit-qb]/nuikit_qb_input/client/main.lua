--[[
  nuikit_qb_input: qb-input's public API on the `input` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-input.md. Answers under qb-input's own name (`provide` + the
  __cfx_export_qb-input_* events).

    exports['qb-input']:ShowInput(data)  → nk.input, blocks the caller's thread, returns { [name] = value } or nil
    exports['qb-input']:CloseMenu()      → cancel: the pending ShowInput returns nil

  Unknowns (the spec's "to confirm"; change Config if a recording shows otherwise):
    number fields come back as numbers; a checkbox group comes back as the list of checked option values.
]]

local LIB = 'qb-input'
local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1

Config = {
  numbersAsStrings = false, -- true: `number` fields return the typed text (qb-input's page may have)
}

local function log(...)
  if debug then print('^5[nuikit-qb:input]^7', ...) end
end

local current = nil -- the open handle

local TYPES = { text = 'text', password = 'password', number = 'number', radio = 'radio', select = 'select', checkbox = 'checkbox-group', color = 'color' }

local function options(list)
  if type(list) ~= 'table' then return nil end
  local out, checked = {}, {}
  for _, o in ipairs(list) do
    if type(o) == 'table' then
      local value = o.value ~= nil and tostring(o.value) or tostring(o.text or '')
      out[#out + 1] = { value = value, label = o.text ~= nil and tostring(o.text) or value }
      if o.checked == true then checked[#checked + 1] = value end
    end
  end
  return out, checked
end

local function translate(data)
  local props = { title = tostring(data.header or ''), fields = {}, meta = { library = LIB } }
  if data.submitText then props.submitLabel = tostring(data.submitText) end
  for i, f in ipairs(data.inputs or {}) do
    if type(f) == 'table' then
      local kind = TYPES[f.type] or 'text'
      local field = {
        id = f.name ~= nil and tostring(f.name) or tostring(i),
        type = kind,
        label = f.text ~= nil and tostring(f.text) or nil,
        required = f.isRequired == true or nil,
      }
      if kind == 'radio' or kind == 'select' or kind == 'checkbox-group' then
        local opts, checked = options(f.options)
        field.options = opts
        if kind == 'checkbox-group' then
          if #checked > 0 then field.default = checked end
        elseif f.default ~= nil then
          field.default = tostring(f.default)
        elseif #checked > 0 then
          field.default = checked[1]
        end
      elseif f.default ~= nil then
        field.default = kind == 'number' and tonumber(f.default) or tostring(f.default)
      end
      props.fields[#props.fields + 1] = field
    end
  end
  return props
end

local function coerce(field, value)
  if value == nil then return nil end
  if field.type == 'number' then
    if Config.numbersAsStrings then return tostring(value) end
    return tonumber(value) or value
  end
  return value
end

-- ───────────────────────────────── the library's API

local function CloseMenu()
  if not current then return end
  local h = current
  current = nil
  h:cancel('close')
end

local function ShowInput(data)
  if type(data) ~= 'table' or type(data.inputs) ~= 'table' or #data.inputs == 0 then return nil end
  CloseMenu() -- one form at a time: the previous caller gets nil
  local props = translate(data)
  local handle = nk.input(props, { async = true })
  current = handle
  local result, reason = handle:await()
  if current == handle then current = nil end
  if not result then
    log('closed:', tostring(reason))
    return nil
  end
  local out = {}
  for _, field in ipairs(props.fields) do
    local v = result.byId and result.byId[field.id]
    if v == nil and result.values then
      for i, f in ipairs(props.fields) do if f == field then v = result.values[i] end end
    end
    out[field.id] = coerce(field, v)
  end
  return out
end

local API = { ShowInput = ShowInput, CloseMenu = CloseMenu }
for name, fn in pairs(API) do exports(name, fn) end
for name, fn in pairs(API) do
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end

AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE then CloseMenu() end
end)

log('started · provide qb-input · GetResourceState("qb-input") =', GetResourceState(LIB))
