--[[
  nuikit_esx_menu_dialog: the ESX.UI.Menu "dialog" type, drawn by nk.input (docs/adapters/esx-menu-dialog.md).

  Mechanism: stand-in as a menu type (`provide 'esx_menu_dialog'` + ESX.UI.Menu.RegisterType('dialog', …)),
  like nuikit_esx_menu_default. One text field under the title; submit runs `submit({ value = '<typed>' })`
  (a string, empty allowed), Escape runs `cancel`, menu.close() runs neither. The script closes the dialog
  itself in submit/cancel as it always did; if it does not, the form is drawn again.
]]

local TYPE = 'dialog'

ESX = ESX or exports['es_extended']:getSharedObject()

local opened = {} -- key → d = { key, namespace, name, data, handle, closing }

local function key(namespace, name) return ('%s:%s'):format(tostring(namespace), tostring(name)) end

local function call(fn, ...)
  if type(fn) ~= 'function' then return end
  local ok, err = pcall(fn, ...)
  if not ok then print(('^1[nuikit_esx_menu_dialog] callback failed:^7 %s'):format(tostring(err))) end
end

local function draw(d)
  d.handle = nk.input({
    id = d.key,
    title = d.data.title ~= nil and tostring(d.data.title) or '',
    fields = { { id = 'value', type = 'text', required = false } },
  }, {
    cb = function(result, reason)
      if opened[d.key] ~= d or reason == 'replaced' then return end
      opened[d.key] = nil
      local menu = ESX.UI.Menu.GetOpened(TYPE, d.namespace, d.name)
      if d.closing or not menu then return end
      if result then
        local v = type(result.byId) == 'table' and result.byId.value or nil
        call(menu.submit, { value = v ~= nil and tostring(v) or '' })
      else
        call(menu.cancel, {})
      end
      if ESX.UI.Menu.IsOpen(TYPE, d.namespace, d.name) and not opened[d.key] then
        opened[d.key] = d
        draw(d)
      end
    end,
  })
  if not d.handle then opened[d.key] = nil end
end

local function open(namespace, name, data)
  if type(data) ~= 'table' then data = {} end
  local k = key(namespace, name)
  local d = opened[k]
  if d then -- a refresh: an input cannot update, so draw it again
    d.data = data
    if d.handle and d.handle:isOpen() then d.handle:cancel('replaced') end
    draw(d)
    return
  end
  d = { key = k, namespace = namespace, name = name, data = data }
  opened[k] = d
  draw(d)
end

local function close(namespace, name)
  local d = opened[key(namespace, name)]
  if not d then return end
  opened[d.key] = nil
  d.closing = true
  if d.handle and d.handle:isOpen() then d.handle:cancel('close') end
end

ESX.UI.Menu.RegisterType(TYPE, open, close)
