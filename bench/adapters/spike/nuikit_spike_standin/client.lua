--[[
  nuikit adapter spike: stand-in for qb-menu.

  Answers qb-menu's public API under qb-menu's own name, logs every call it intercepts, draws
  nothing. The point is the mechanism, not the menu:

    1. `provide 'qb-menu'` (fxmanifest): does `dependency 'qb-menu'` resolve to us, and does the
       caller start after us?
    2. exports['qb-menu']:openMenu(...) from another resource: does it land here? FiveM resolves an
       export by triggering the event `__cfx_export_<resource>_<export>` with a setter callback,
       so we register those events under qb-menu's name (provide alone does not do this; see
       README). The handler runs once per call site, then the caller holds the function.
    3. TriggerEvent('qb-menu:client:openMenu', data): plain event handlers.
    4. The original qb-menu started as well (conflict case): who answers?

  Every intercepted call is printed as one JSON line prefixed `[nuikit-spike:standin]` so the F8
  console can be pasted into results.md, and kept in memory: /spike_standin dump.

  Picking an item: the stand-in has no UI, so /spike_standin pick <n> plays the player choosing
  item n of the last menu, dispatching `params` the way qb-menu's docs describe (event / server
  event / command / QB command / function), so the caller's return path is exercised too.
]]

local LIB = 'qb-menu'
local TAG = '[nuikit-spike:standin]'
local log = {}
local lastMenu = nil
local menuOpenedAt = nil

local function now() return GetGameTimer() end

local function record(kind, name, args)
  local entry = {
    t = now(),
    kind = kind,            -- "export" | "event"
    name = name,            -- "openMenu", "qb-menu:client:openMenu", …
    from = GetInvokingResource() or 'unknown',
    args = args,
  }
  log[#log + 1] = entry
  print(('%s %s'):format(TAG, json.encode(entry)))
end

-- ───────────────────────────────── the library's API, by name

local function openMenu(data, sort, skipFirst)
  local items = {}
  if type(data) == 'table' then
    for i, item in ipairs(data) do
      items[i] = {
        header = item.header, txt = item.txt, icon = item.icon,
        isMenuHeader = item.isMenuHeader, disabled = item.disabled, hidden = item.hidden,
        hasAction = type(item.action) == 'function',
        params = item.params and {
          event = type(item.params.event) == 'string' and item.params.event or (item.params.event and 'function' or nil),
          isServer = item.params.isServer, isCommand = item.params.isCommand,
          isQBCommand = item.params.isQBCommand, isAction = item.params.isAction,
          hasArgs = item.params.args ~= nil,
        } or nil,
      }
    end
  end
  lastMenu = data
  menuOpenedAt = now()
  record('export', 'openMenu', { items = items, count = #items, sort = sort, skipFirst = skipFirst })
end

local function closeMenu()
  record('export', 'closeMenu', { openFor = menuOpenedAt and (now() - menuOpenedAt) or nil })
  lastMenu = nil
end

local function showHeader(data)
  record('export', 'showHeader', { count = type(data) == 'table' and #data or 0 })
  lastMenu = data
  menuOpenedAt = now()
end

local API = { openMenu = openMenu, closeMenu = closeMenu, showHeader = showHeader }

-- Under our own name (what `exports('x', fn)` does) …
for name, fn in pairs(API) do exports(name, fn) end
-- … and under the library's name. This is the part `provide` does not do.
for name, fn in pairs(API) do
  AddEventHandler(('__cfx_export_%s_%s'):format(LIB, name), function(setCB)
    record('export-bind', name, {})
    setCB(fn)
  end)
end

-- The events scripts trigger instead of the exports (not in qb-menu's docs; widely used).
AddEventHandler('qb-menu:client:openMenu', function(data, sort, skipFirst)
  record('event', 'qb-menu:client:openMenu', { count = type(data) == 'table' and #data or 0 })
  openMenu(data, sort, skipFirst)
end)
AddEventHandler('qb-menu:client:closeMenu', function()
  record('event', 'qb-menu:client:closeMenu', {})
  closeMenu()
end)
AddEventHandler('qb-menu:client:showHeader', function(data)
  record('event', 'qb-menu:client:showHeader', {})
  showHeader(data)
end)

-- ───────────────────────────────── playing the player: pick item n

local function pick(n)
  if not lastMenu then print(TAG .. ' no menu open') return end
  local item = lastMenu[n]
  if not item then print(TAG .. ' no item ' .. tostring(n)) return end
  if item.disabled or item.isMenuHeader then print(TAG .. ' item ' .. n .. ' is not selectable') return end
  local p = item.params
  local outcome
  if type(item.action) == 'function' then
    item.action()
    outcome = 'action()'
  elseif p and p.isAction and type(p.event) == 'function' then
    p.event(p.args)
    outcome = 'params.event(args)'
  elseif p and p.isServer then
    TriggerServerEvent(p.event, p.args)
    outcome = 'TriggerServerEvent ' .. tostring(p.event)
  elseif p and p.isCommand then
    ExecuteCommand(p.event)
    outcome = 'ExecuteCommand ' .. tostring(p.event)
  elseif p and p.isQBCommand then
    TriggerServerEvent('QBCore:CallCommand', p.event, p.args)
    outcome = 'QBCore:CallCommand ' .. tostring(p.event)
  elseif p and p.event then
    TriggerEvent(p.event, p.args)
    outcome = 'TriggerEvent ' .. tostring(p.event)
  else
    outcome = 'nothing to dispatch'
  end
  record('pick', tostring(n), { outcome = outcome, header = item.header })
  lastMenu = nil
end

RegisterCommand('spike_standin', function(_, args)
  local sub = args[1]
  if sub == 'pick' then
    pick(tonumber(args[2]) or 1)
  elseif sub == 'dump' then
    print(TAG .. ' ' .. #log .. ' entries')
    for _, e in ipairs(log) do print(TAG .. ' ' .. json.encode(e)) end
  elseif sub == 'clear' then
    log = {}
    print(TAG .. ' cleared')
  elseif sub == 'state' then
    print(('%s qb-menu state: %s · nuikit_spike_standin state: %s'):format(
      TAG, GetResourceState('qb-menu'), GetResourceState('nuikit_spike_standin')))
  else
    print(TAG .. ' usage: /spike_standin pick <n> | dump | clear | state')
  end
end, false)

exports('spikeLog', function() return log end)

print(('%s started · provide qb-menu · GetResourceState("qb-menu") = %s'):format(TAG, GetResourceState('qb-menu')))
