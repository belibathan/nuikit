--[[
  nuikit_qb_menu: qb-menu's public API on the `menu` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-menu.md (qb-menu's documentation only). Answers under qb-menu's own
  name (`provide 'qb-menu'` + the __cfx_export_qb-menu_* events, the pattern the (removed) spike proved
  under the harness) and the three events scripts trigger instead of the exports.

    exports['qb-menu']:openMenu(data, sort?, skipFirst?)   → nk.menu
    exports['qb-menu']:closeMenu()                          → cancel
    exports['qb-menu']:showHeader(data)                     → nk.menu with header rows only
    qb-menu:client:openMenu / closeMenu / showHeader        → the same

  What the caller gets back is exactly what qb-menu gives: nothing from the calls; on select, one of
  TriggerEvent(event, args) / TriggerServerEvent(event, args) / ExecuteCommand(event) /
  TriggerServerEvent('QBCore:CallCommand', event, args) / action() / event(args). On Escape: nothing.
]]

local LIB = 'qb-menu'
local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1

local function log(...)
  if debug then print('^5[nuikit-qb:menu]^7', ...) end
end

local current = nil -- { handle, data } while a menu is open

-- ───────────────────────────────── qb-menu → menu

--- Apply qb-menu's `sort` (by header; `skipFirst` keeps the first row where it is). Stable.
local function sorted(data, sort, skipFirst)
  if not sort then return data end
  local out, from = {}, 1
  if skipFirst and data[1] then out[1], from = data[1], 2 end
  local rest = {}
  for i = from, #data do rest[#rest + 1] = { i = i, item = data[i] } end
  table.sort(rest, function(a, b)
    local ha, hb = tostring(a.item.header or ''), tostring(b.item.header or '')
    if ha == hb then return a.i < b.i end
    return ha < hb
  end)
  for _, r in ipairs(rest) do out[#out + 1] = r.item end
  return out
end

--- Build the intent's props and the id → original item table the resolve dispatches from.
local function translate(data, headerOnly)
  local props = { title = '', items = {}, meta = { library = LIB } }
  local byId = {}
  local titleTaken = false
  for i, item in ipairs(data) do
    if type(item) == 'table' and not item.hidden and (not headerOnly or item.isMenuHeader) then
      if item.isMenuHeader and not titleTaken then
        -- The first header is the panel's title, as qb-menu draws it as a title bar.
        props.title = tostring(item.header or '')
        if item.txt and item.txt ~= '' then props.description = tostring(item.txt) end
        titleTaken = true
      else
        local id = tostring(i)
        local row = {
          id = id,
          label = item.header ~= nil and tostring(item.header) or nil,
          description = item.txt ~= nil and tostring(item.txt) or nil,
          icon = type(item.icon) == 'string' and item.icon ~= '' and item.icon or nil,
          disabled = item.disabled == true or nil,
        }
        if item.isMenuHeader then row.kind = 'header' end
        props.items[#props.items + 1] = row
        byId[id] = item
      end
    end
  end
  -- A header-only menu is valid in qb-menu (showHeader): keep it drawable with the title as its one row.
  if #props.items == 0 and titleTaken then
    props.items[1] = { id = 'title', kind = 'header', label = props.title, description = props.description }
    props.title, props.description = '', nil
  end
  return props, byId
end

-- ───────────────────────────────── the return path

local function dispatch(item)
  local p = item.params
  if type(item.action) == 'function' then
    item.action()
  elseif type(p) ~= 'table' then
    log('selected item has no params or action:', tostring(item.header))
  elseif p.isAction and type(p.event) == 'function' then
    p.event(p.args)
  elseif p.isServer then
    TriggerServerEvent(p.event, p.args)
  elseif p.isCommand then
    ExecuteCommand(p.event)
  elseif p.isQBCommand then
    TriggerServerEvent('QBCore:CallCommand', p.event, p.args)
  elseif type(p.event) == 'string' then
    TriggerEvent(p.event, p.args)
  elseif type(p.event) == 'function' then
    p.event(p.args)
  end
end

-- ───────────────────────────────── the library's API

local function closeMenu()
  if not current then return end
  local c = current
  current = nil
  c.handle:cancel('close')
end

local function show(data, headerOnly)
  if type(data) ~= 'table' then return end
  local props, byId = translate(data, headerOnly)
  if #props.items == 0 then
    log('openMenu with nothing to show (every item hidden)')
    closeMenu()
    return
  end
  -- One menu at a time: a new one replaces the open one (the previous caller gets nothing, as before).
  if current then
    local old = current
    current = nil
    old.handle:cancel('replaced')
  end
  local menu = { byId = byId }
  menu.handle = nk.menu(props, {
    cb = function(result, reason)
      if current ~= menu then
        -- Replaced or closed by closeMenu: nothing goes back to the caller.
        if result then log('late result for a replaced menu ignored') end
        return
      end
      current = nil
      if not result then
        log('menu closed:', tostring(reason))
        return
      end
      local item = byId[result.id]
      if item then dispatch(item) end
    end,
  })
  current = menu
  log('opened', #props.items, 'rows')
end

local function openMenu(data, sort, skipFirst)
  if type(data) ~= 'table' then return end
  show(sorted(data, sort == true, skipFirst == true), false)
end

local function showHeader(data)
  show(data, true)
end

local API = { openMenu = openMenu, closeMenu = closeMenu, showHeader = showHeader }

-- Under our own name …
for name, fn in pairs(API) do exports(name, fn) end
-- … and under qb-menu's: FiveM resolves exports['qb-menu']:x by this event; `provide` alone does not do it.
for name, fn in pairs(API) do
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end

-- The events (not in qb-menu's docs; used by scripts in the wild).
AddEventHandler('qb-menu:client:openMenu', function(data, sort, skipFirst) openMenu(data, sort, skipFirst) end)
AddEventHandler('qb-menu:client:closeMenu', function() closeMenu() end)
AddEventHandler('qb-menu:client:showHeader', function(data) showHeader(data) end)

AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE then closeMenu() end
end)

log('started · provide qb-menu · GetResourceState("qb-menu") =', GetResourceState(LIB))
