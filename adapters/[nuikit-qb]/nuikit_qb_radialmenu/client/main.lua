--[[
  nuikit_qb_radialmenu: qb-radialmenu on the `radial` intent.  MIT · https://github.com/belibathan/nuikit

  Clean-room, from docs/adapters/qb-radialmenu.md. Answers under qb-radialmenu's own name (`provide` +
  the __cfx_export_qb-radialmenu_* events):

    AddOption(data, id?) → id     RemoveOption(id)     (undocumented but widely used)
    the open key (Config.OpenKey, F1) opens nk.intent.radial with Config.MenuItems + Config.JobInteractions[job]
    + the added options; selecting dispatches by `type`; shouldClose = false keeps it open.

  UI only: vehicle doors, extras and seats (gameplay qb-radialmenu did itself) are not translated; the
  owner decides later whether they come back here or move to a vehicle script. Selection args: the item
  table is passed as the first argument to client/server events (a guess; see the spec).
]]

local LIB = 'qb-radialmenu'
local RESOURCE = GetCurrentResourceName()
local debug = GetConvarInt('nuikit_debug', 0) == 1

local function log(...)
  if debug then print('^5[nuikit-qb:radial]^7', ...) end
end

local added = {}   -- id → item (AddOption)
local order = {}   -- ids in the order added
local counter = 0
local current = nil -- { handle, byId }

-- ───────────────────────────────── building the list

local function clean(item)
  -- What crosses to the caller on select: the item without functions or submenus.
  local out = {}
  for k, v in pairs(item) do
    if k ~= 'items' and type(v) ~= 'function' then out[k] = v end
  end
  return out
end

local function translate(list, byId, path)
  local out = {}
  for i, item in ipairs(list) do
    if type(item) == 'table' and item.title then
      local id = tostring(item.id or (path .. i))
      local row = { id = id, label = tostring(item.title), icon = item.icon ~= nil and tostring(item.icon) or nil }
      if type(item.items) == 'table' and #item.items > 0 then
        row.items = translate(item.items, byId, id .. '.')
      else
        if item.shouldClose == false then row.keepOpen = true end
        byId[id] = item
      end
      out[#out + 1] = row
    end
  end
  return out
end

local function job()
  local ok, p = pcall(function() return nk.player.get() end)
  return ok and type(p) == 'table' and type(p.job) == 'table' and p.job.name or nil
end

local function build()
  local list = {}
  for _, item in ipairs(Config.MenuItems or {}) do list[#list + 1] = item end
  local j = job()
  if j and type(Config.JobInteractions) == 'table' and type(Config.JobInteractions[j]) == 'table' then
    for _, item in ipairs(Config.JobInteractions[j]) do list[#list + 1] = item end
  end
  for _, id in ipairs(order) do if added[id] then list[#list + 1] = added[id] end end
  local byId = {}
  return translate(list, byId, ''), byId
end

-- ───────────────────────────────── the return path

local function dispatch(item)
  local t, event = item.type, item.event
  if type(event) ~= 'string' then return end
  local arg = clean(item)
  if t == 'server' then TriggerServerEvent(event, arg)
  elseif t == 'command' then ExecuteCommand(event)
  elseif t == 'qbcommand' then TriggerServerEvent('QBCore:CallCommand', event, arg)
  else TriggerEvent(event, arg) end
end

local function close()
  if not current then return end
  local c = current
  current = nil
  c.handle:cancel('close')
end

local function open()
  if current then return close() end
  local items, byId = build()
  if #items == 0 then log('nothing to show') return end
  local menu = { byId = byId }
  menu.handle = nk.intent.radial({ id = 'radial', label = Config.Label, items = items, meta = { library = LIB } }, {
    cb = function(result, reason)
      if current ~= menu then return end
      current = nil
      if not result then log('closed:', tostring(reason)) return end
      local item = byId[result.id]
      if item then dispatch(item) end
    end,
    onSelect = function(data)
      -- keepOpen items (shouldClose = false): dispatch and stay open
      local item = data and byId[data.id]
      if item then dispatch(item) end
    end,
  })
  current = menu
end

local function refresh()
  if not current then return end
  local items, byId = build()
  current.byId = byId
  current.handle:update({ items = items })
end

-- ───────────────────────────────── the library's API

local function AddOption(data, id)
  if type(data) ~= 'table' then return nil end
  if id == nil then
    counter = counter + 1
    id = ('nk-%d'):format(counter)
  end
  id = tostring(id)
  if not added[id] then order[#order + 1] = id end
  local item = {}
  for k, v in pairs(data) do item[k] = v end
  item.id = id
  added[id] = item
  refresh()
  return id
end

local function RemoveOption(id)
  id = tostring(id)
  if not added[id] then return end
  added[id] = nil
  for i, v in ipairs(order) do if v == id then table.remove(order, i) break end end
  refresh()
end

local API = { AddOption = AddOption, RemoveOption = RemoveOption }
for name, fn in pairs(API) do exports(name, fn) end
for name, fn in pairs(API) do
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB) setCB(fn) end)
end
exports('open', open)
exports('close', close)

RegisterCommand('nuikit_radial', function() open() end, false)
RegisterKeyMapping('nuikit_radial', 'Open the radial menu', 'keyboard', Config.OpenKey or 'F1')

AddEventHandler('onClientResourceStop', function(resource)
  if resource == RESOURCE then close() end
end)

log('started · provide qb-radialmenu · GetResourceState("qb-radialmenu") =', GetResourceState(LIB))
