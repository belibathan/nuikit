--[[
  A mock of es_extended's ESX.UI.Menu for replay tests, written from the public docs
  (docs/adapters/esx-menu-default.md "Source"): RegisterType, Open, Close, CloseAll, GetOpened,
  GetOpenedMenus, IsOpen, and the menu object's close / update / refresh / setElement / setElements /
  setTitle / removeElement / submit / cancel / change. refresh() calls the type's open again with the
  menu's data (assumed; the spike confirms).
]]

ESX = { UI = { Menu = {} } }
local Menu = ESX.UI.Menu
local types = {}
local opened = {}

function Menu.RegisterType(kind, open, close)
  types[kind] = { open = open, close = close }
end

local function find(kind, namespace, name)
  for i, m in ipairs(opened) do
    if m.type == kind and m.namespace == namespace and m.name == name then return m, i end
  end
end

function Menu.Open(kind, namespace, name, data, submit, cancel, change, close)
  local t = types[kind]
  if not t then error(('no menu type %s'):format(tostring(kind))) end
  local existing = find(kind, namespace, name)
  if existing then existing.close() end
  local menu = { type = kind, namespace = namespace, name = name, data = data }
  menu.submit = function(d) if submit then submit(d, menu) end end
  menu.cancel = function(d) if cancel then cancel(d, menu) end end
  menu.change = function(d) if change then change(d, menu) end end
  menu.close = function()
    local m, i = find(kind, namespace, name)
    if not m then return end
    table.remove(opened, i)
    if t.close then t.close(namespace, name, m.data) end
    if close then close() end
  end
  menu.refresh = function() t.open(namespace, name, menu.data) end
  menu.update = function(query, newData)
    for _, el in ipairs(menu.data.elements or {}) do
      local match = true
      for k, v in pairs(query) do if el[k] ~= v then match = false end end
      if match then for k, v in pairs(newData) do el[k] = v end end
    end
    menu.refresh()
  end
  menu.setElement = function(i, key, val) menu.data.elements[i][key] = val menu.refresh() end
  menu.setElements = function(elements) menu.data.elements = elements menu.refresh() end
  menu.setTitle = function(title) menu.data.title = title menu.refresh() end
  menu.removeElement = function(query)
    for i, el in ipairs(menu.data.elements or {}) do
      local match = true
      for k, v in pairs(query) do if el[k] ~= v then match = false end end
      if match then table.remove(menu.data.elements, i) break end
    end
    menu.refresh()
  end
  opened[#opened + 1] = menu
  t.open(namespace, name, data)
  return menu
end

function Menu.Close(kind, namespace, name)
  local m = find(kind, namespace, name)
  if m then m.close() end
end

function Menu.CloseAll()
  while #opened > 0 do opened[#opened].close() end
end

function Menu.GetOpened(kind, namespace, name)
  return (find(kind, namespace, name))
end

function Menu.GetOpenedMenus() return opened end

function Menu.IsOpen(kind, namespace, name)
  return find(kind, namespace, name) ~= nil
end

-- Every call enters through an export (the harness clones export arguments, which is what lets a
-- callback from another engine be called back under wasmoon); ESX_IMPORT in _nk.mjs builds the
-- caller's ESX.UI.Menu table from these.
for name, fn in pairs(Menu) do exports('UI_Menu_' .. name, fn) end
