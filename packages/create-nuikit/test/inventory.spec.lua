-- inventory template, server: only your own pockets or a stash you stand at, real slots and counts, stacking only the same plain item, whole-stack swaps, weight on both sides, use takes one first and is rate-limited, stash viewers refreshed, races at a shared stash, OneSync, other inventories warned.
-- Run by inventory.test.ts (test/harness.ts: check(), boot()).
local function P() end
json = { encode = function() return 'x' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
STARTED = {}
function GetResourceState(n) return STARTED[n] and 'started' or 'missing' end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
NAMES = { 'Alex', 'Riley', 'Sam' }
function GetPlayerName(s) return NAMES[s] end
-- 1 and 2 at the locker, 3 across town
POS = { vector3(452.1, -980.0, 30.7), vector3(452.5, -980.5, 30.7), vector3(0, 0, 0) }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
local clock = 0
function GetGameTimer() return clock end
local handler, commands, onStart = nil, {}, nil
function RegisterNetEvent(_, fn) handler = fn end
function RegisterCommand(name, fn) commands[name] = fn end
function AddEventHandler(name, fn) if name == 'onResourceStart' then onStart = fn end end
local last, events = nil, {}
function TriggerClientEvent(name, to, a, b)
  if name == 'demo:res' then last = b else events[#events+1] = { name = name, to = to, a = a, b = b } end
end
local function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  assert(load(SERVER, 'server.lua', 't'))()
end
boot()
check(#PRINTED == 0, 'no other inventory running, OneSync on: nothing printed at start')
local function req(src, name, data) clock = clock + 150; source = src; handler(1, name, data); return last end
local function inv(src, stash) local r = req(src, 'open', { stash = stash }); return r end
local function slots(c) local t = {} for _, i in ipairs(c.items) do t[i.slot] = i end return t end
local function mine(src) return slots(inv(src).data.player) end
local function locker(src) return slots(inv(src, 'locker').data.other) end
local function mv(src, fc, fs, tc, ts, n) return req(src, 'move', { from = { container = fc, slot = fs }, to = { container = tc, slot = ts }, count = n }) end
local function weightOf(c) local w = 0 for _, i in ipairs(c.items) do w = w + (i.weight or 0) * i.count end return w end
local function snapshot(src) local t = {} for s, i in pairs(mine(src)) do t[#t+1] = s .. i.name .. i.count end table.sort(t) return table.concat(t, ',') end

-- open: the starter items, a stash when at it
local r = inv(1)
local p = slots(r.data.player)
check(r.ok and p[1].name == 'phone' and p[2].name == 'water' and p[2].count == 3 and p[3].count == 2 and p[4].count == 2 and r.data.other == nil, 'open: starter items (phone, 3 water, 2 sandwiches, 2 bandages), no stash')
check(p[2].usable == true and p[1].usable == nil and p[2].label == 'Water' and p[2].weight == 500, 'items carry label, weight and usable from the server config')
r = inv(1, 'locker')
check(r.ok and r.data.other and r.data.other.id == 'stash:locker' and r.data.other.slots == 20, 'open at the locker: the stash next to the pockets')
r = inv(3, 'locker')
check(not r.ok and r.error == "You're not at the stash.", 'open the locker from across town: refused')
r = inv(1, {})
check(r.ok and r.data.other == nil, 'open with a table for the stash: pockets only')

-- bad moves: nothing changes
local before = snapshot(1)
local bad = {
  { 'from nil', function() return req(1, 'move', { to = { container = 'player', slot = 5 }, count = 1 }) end },
  { 'from a string', function() return req(1, 'move', { from = 'player:2', to = { container = 'player', slot = 5 }, count = 1 }) end },
  { "another player's pockets by license", function() return mv(1, 'license:2', 2, 'player', 10, 1) end },
  { "'player:2'", function() return mv(1, 'player:2', 2, 'player', 10, 1) end },
  { 'a stash that does not exist', function() return mv(1, 'player', 2, 'stash:vault', 1, 1) end },
  { 'the locker from across town', function() return mv(3, 'player', 2, 'stash:locker', 1, 1) end },
  { 'slot 0', function() return mv(1, 'player', 0, 'player', 10, 1) end },
  { 'slot 26 (25 slots)', function() return mv(1, 'player', 2, 'player', 26, 1) end },
  { 'slot 1.5', function() return mv(1, 'player', 1.5, 'player', 10, 1) end },
  { 'slot "2"', function() return mv(1, 'player', '2', 'player', 10, 1) end },
  { 'the same slot', function() return mv(1, 'player', 2, 'player', 2, 1) end },
  { 'an empty slot', function() return mv(1, 'player', 20, 'player', 21, 1) end },
  { 'count 0', function() return mv(1, 'player', 2, 'player', 10, 0) end },
  { 'count -1', function() return mv(1, 'player', 2, 'player', 10, -1) end },
  { 'count 1.5', function() return mv(1, 'player', 2, 'player', 10, 1.5) end },
  { 'count 4 (has 3)', function() return mv(1, 'player', 2, 'player', 10, 4) end },
  { 'count "1"', function() return mv(1, 'player', 2, 'player', 10, '1') end },
  { 'count NaN', function() return mv(1, 'player', 2, 'player', 10, 0/0) end },
  { 'part of a stack onto another item (swap needs the whole stack)', function() return mv(1, 'player', 2, 'player', 3, 1) end },
}
for _, b in ipairs(bad) do
  r = b[2]()
  check(not r.ok and snapshot(1) == before, 'move with ' .. b[1] .. ': refused, nothing changed (' .. tostring(r.error) .. ')')
end

-- good moves in the pockets
r = mv(1, 'player', 2, 'player', 10, 1); p = mine(1)
check(r.ok and p[2].count == 2 and p[10].name == 'water' and p[10].count == 1, 'split 1 water to slot 10')
r = mv(1, 'player', 10, 'player', 2, 1); p = mine(1)
check(r.ok and p[2].count == 3 and p[10] == nil, 'stack it back')
r = mv(1, 'player', 2, 'player', 3, 3); p = mine(1)
check(r.ok and p[2].name == 'sandwich' and p[3].name == 'water' and p[3].count == 3, 'swap the water and sandwich stacks')
commands.demo_give(0, { '1', 'phone', '1' })
p = mine(1)
local second; for s, i in pairs(p) do if i.name == 'phone' and s ~= 1 then second = s end end
r = mv(1, 'player', second, 'player', 1, 1); p = mine(1)
check(r.ok and p[1].name == 'phone' and p[1].count == 1 and p[second].count == 1, 'phone onto phone (stack = false): swapped, never stacked into 2')

-- the stash: viewers, weight, races
inv(2, 'locker') -- Riley watches the locker
inv(1, 'locker')
events = {}
r = mv(1, 'player', 3, 'stash:locker', 1, 2)
local l = locker(1)
local told = false; for _, e in ipairs(events) do if e.name == 'demo:refresh' and e.to == 2 then told = true end end
check(r.ok and l[1].name == 'water' and l[1].count == 2 and mine(1)[3].count == 1, 'move 2 water into the locker')
check(told, "Riley, watching the locker, is told to refresh")
inv(2, 'locker') -- Riley re-reads (her client would on the event)
r = mv(2, 'stash:locker', 1, 'player', 10, 2)
check(r.ok and mine(2)[10].name == 'water' and mine(2)[10].count == 2, 'Riley takes both waters')
r = mv(1, 'stash:locker', 1, 'player', 11, 2)
check(not r.ok and r.error == "There's nothing there.", 'Alex, a moment late, takes the same slot: nothing there, nothing duplicated')
req(1, 'close')
events = {}
r = mv(2, 'player', 10, 'stash:locker', 2, 1)
told = false; for _, e in ipairs(events) do if e.to == 1 then told = true end end
check(r.ok and not told, 'after Alex closes, his view is no longer refreshed')
-- weight: pockets 30 kg
commands.demo_give(0, { '1', 'toolbox', '4' })      -- 24 kg on top of Alex's things
commands.demo_give(0, { '2', 'toolbox', '1' })
local tb; for s, i in pairs(mine(2)) do if i.name == 'toolbox' then tb = s end end
r = mv(2, 'player', tb, 'stash:locker', 5, 1)
check(r.ok and locker(2)[5].name == 'toolbox', 'Riley puts a toolbox in the locker')
inv(1, 'locker')
local w = weightOf(inv(1).data.player)
r = mv(1, 'stash:locker', 5, 'player', 20, 1)
check(not r.ok and r.error == "That's too heavy for there." and locker(1)[5] ~= nil, 'Alex (' .. w .. ' g) taking the 6 kg toolbox: too heavy, it stays')
local waterSlot; for s, i in pairs(mine(1)) do if i.name == 'water' then waterSlot = s end end
r = mv(1, 'player', waterSlot, 'stash:locker', 5, mine(1)[waterSlot].count)
check(not r.ok and r.error == "That's too heavy to swap.", 'swapping his water for the toolbox: too heavy to swap')
local hisTb; for s, i in pairs(mine(1)) do if i.name == 'toolbox' then hisTb = s end end
r = mv(1, 'player', hisTb, 'stash:locker', 5, 1)
check(r.ok and mine(1)[hisTb].name == 'toolbox', 'swapping a toolbox for the toolbox (same weight): fine')

-- use
r = req(1, 'use', { slot = 1 })
check(not r.ok and r.error == "That can't be used.", 'use the phone: refused')
r = req(1, 'use', { slot = 25 })
check(not r.ok, 'use an empty slot: refused')
r = req(1, 'use', { slot = {} })
check(not r.ok, 'use with a table for the slot: refused')
local sw; for s, i in pairs(mine(1)) do if i.name == 'sandwich' then sw = s end end
local n = mine(1)[sw].count
events = {}
r = req(1, 'use', { slot = sw })
check(r.ok and mine(1)[sw].count == n - 1 and events[1] and events[1].name == 'demo:effect' and events[1].a == 'eat', 'eat a sandwich: one taken, the eat effect sent')
r = req(1, 'use', { slot = sw })
check(not r.ok and r.error == 'Not so fast.' and mine(1)[sw].count == n - 1, 'eat again at once: not so fast')
clock = clock + 1100
r = req(1, 'use', { slot = sw })
check(r.ok and mine(1)[sw] == nil, 'a second later: the last sandwich, and the slot empties')

-- rate limit: a client spamming moves (each one saves the whole file and refreshes the viewers)
clock = clock + 5000
local refused = 0
for i = 1, 30 do source = 1; handler(1, 'move', { from = { container = 'player', slot = 1 }, to = { container = 'player', slot = 24 + (i % 2) }, count = 1 }); if last.error == 'Not so fast.' then refused = refused + 1 end end
check(refused == 20, '30 moves in the same instant: 10 go through, 20 refused (' .. refused .. ')')
clock = clock + 1000
check(req(1, 'open', {}).ok, 'a second later: requests go through again')

-- the give command
PRINTED = {}
commands.demo_give(0, { '9', 'water', '1' })
check(PRINTED[1] and PRINTED[1]:find('Usage', 1, true), 'give to an offline player: usage')
PRINTED = {}
local waterBefore = 0
for _, it in pairs(mine(1)) do if it.name == 'water' then waterBefore = waterBefore + it.count end end
commands.demo_give(0, { '1.5', 'water', '1' }) -- a native would read 1.5 as player 1 (atoi)
local waterAfter = 0
for _, it in pairs(mine(1)) do if it.name == 'water' then waterAfter = waterAfter + it.count end end
check(PRINTED[1] and PRINTED[1]:find('Usage', 1, true) and waterAfter == waterBefore, 'give to "1.5": usage, player 1 got nothing (ids are whole numbers)')
commands.demo_give(0, { '1', 'gold', '1' })
check(PRINTED[2] and PRINTED[2]:find('Usage', 1, true), 'give an unknown item: usage')

-- OneSync off, another inventory running
ONESYNC_CONVAR = 'off'
STARTED = { ox_inventory = true }
PRINTED = {}
boot()
local warnedOne, warnedOx = false, false
for _, m in ipairs(PRINTED) do
  if m:find('OneSync is off', 1, true) then warnedOne = true end
  if m:find('ox_inventory is running', 1, true) then warnedOx = true end
end
check(warnedOne and warnedOx, 'start with OneSync off and ox_inventory running: both warnings')
r = inv(1, 'locker')
check(not r.ok and r.error == 'Stashes need OneSync on the server.', 'OneSync off: the locker is refused')
r = inv(1)
check(r.ok, 'OneSync off: the pockets still open')
r = mv(1, 'player', 1, 'stash:locker', 1, 1)
check(not r.ok, 'OneSync off: moving into the locker is refused')
PRINTED = {}
STARTED['qb-inventory'] = true
onStart('qb-inventory')
check(#PRINTED == 1 and PRINTED[1]:find('qb-inventory is running', 1, true), 'qb-inventory starting later: one warning')

