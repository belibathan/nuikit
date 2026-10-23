-- npc-dialogue template, server: the tree stays on the server; only ids the current node offers are taken; requirements (job, money, item) re-checked; the player at the NPC; actions all or nothing (refused or throwing step, failed undo); rate limit; one choice at a time; OneSync.
-- Run by npc-dialogue.test.ts (test/harness.ts: check(), boot()).
function vector3(x, y, z) return { x = x, y = y, z = z } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
POS = { [1] = vector3(128.4, -1297.6, 29.2), [2] = vector3(129.0, -1297.0, 29.2), [3] = vector3(400, 400, 30) }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
NOW = 10000
function GetGameTimer() return NOW end
local handler, dropped
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn end end
local answers = {}
function TriggerClientEvent(_, _, id, result) answers[id] = result end
local function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  assert(load(SERVER, 'server.lua', 't'))()
end
boot()
local seq = 0
local function start(src, name, data)
  seq = seq + 1
  local id = seq
  local co = coroutine.create(function() source = src; handler(id, name, data) end)
  assert(coroutine.resume(co))
  return function() while coroutine.status(co) ~= 'dead' do assert(coroutine.resume(co)) end return answers[id] end
end
local function req(src, name, data) return start(src, name, data)() end
-- every choice is a separate "click": time passes between them (the rate limit has its own check)
local function choose(src, id) NOW = NOW + 1000; return req(src, 'choose', { choice = id }) end
local function open(src) return req(src, 'open', { npc = 'marty' }) end
local function byId(r, id) for _, c in ipairs(r.data.choices) do if c.id == id then return c end end end

-- open
local r = req(1, 'open', { npc = 'nobody' }); check(not r.ok, 'open an unknown person: refused')
r = req(1, 'open', { npc = {} }); check(not r.ok, 'open with a table for the person: refused')
r = req(3, 'open', { npc = 'marty' }); check(not r.ok, 'open from across the map: refused')
r = open(1)
check(r.ok and r.data.speaker == 'Marty' and #r.data.choices == 4, 'open at Marty: his first line, 4 choices')
check(r.data.choices[1].next == nil and r.data.choices[1].take == nil and r.data.choices[1].requires == nil, 'the page gets ids and labels, never the tree (next, take, give, requires)')
check(byId(r, 'backroom').locked == nil, 'a choice that costs $500 is open to a player with $800')

-- not talking to anyone, and ids that are not on offer
r = choose(2, 'drink'); check(not r.ok and r.error == "You're not talking to anyone.", 'choose without opening: refused')
r = choose(1, 'pay'); check(not r.ok and r.error == "That's not an option.", 'a choice from another node ("pay" while on the greeting): refused')
r = choose(1, 'tip'); check(not r.ok, 'a choice from a node not reached ("tip"): refused')
for _, bad in ipairs({ 5, {}, true, '', 'nope' }) do
  r = choose(1, bad); check(not r.ok and r.error == "That's not an option.", 'choice ' .. tostring(type(bad) == 'table' and 'a table' or bad) .. ': refused')
end
r = req(1, 'choose', {}) ; check(not r.ok, 'choose with no choice: refused')
r = req(1, 'choose', 'drink'); check(not r.ok, 'choose with a string for the data: refused')
r = req(1, 'nothing', {}); check(r == nil or not r.ok, 'an unknown request: nothing happens')

-- a conversation: goto, give item, take money
r = choose(1, 'drink'); check(r.ok and r.data.text:find('Two dollars', 1, true) ~= nil, 'drink: moves to the next node, which says its line')
r = choose(1, 'pay'); check(r.ok and r.data.speaker == 'Marty' and r.data.text:find('Evening', 1, true) ~= nil, 'pay $2: back to the greeting')
r = choose(1, 'backroom')
check(r.ok and r.data.text:find('keycard', 1, true) ~= nil, 'back room: $500 taken, the keycard given, on to the next line')
r = choose(1, 'leave'); check(r.ok and r.ended == true, 'a choice with no next: the conversation ends')
r = choose(1, 'leave'); check(not r.ok and r.error == "You're not talking to anyone.", 'after the end, nothing is on offer')

-- money was taken as the server says: 800 - 2 - 500 = 298 -> back room needs 500, so it is locked now
r = open(1)
local back = byId(r, 'backroom')
check(back.locked and back.lockedReason == 'Needs $500', 'with $298 left the back room is locked: "Needs $500"')
r = choose(1, 'backroom')
check(not r.ok and r.error == "You can't choose that: needs $500." , 'sending a locked choice anyway: refused (' .. tostring(r.error) .. ')')
check(byId(open(1), 'backroom').locked == true, 'and nothing moved: still locked')

-- job requirement: a civilian is refused, the lock reason is the server's
choose(1, 'rumours')
r = req(1, 'open', { npc = 'marty' }); r = choose(1, 'rumours')
check(r.ok and byId(r, 'tip').locked and byId(r, 'tip').lockedReason == 'Police only', 'the tip is locked for a civilian: "Police only"')
r = choose(1, 'tip'); check(not r.ok and r.error == "You can't choose that: police only.", 'sending the police-only choice as a civilian: refused')

-- the page cannot raise its own job: only the server's source counts. A police officer gets the tip.
Config.job = function(src) return src == 2 and 'police' or 'civilian' end
open(2); r = choose(2, 'rumours')
check(r.ok and not byId(r, 'tip').locked, 'a police officer sees the tip unlocked')
r = choose(2, 'tip'); check(r.ok, 'and takes it (+$100)')
r = open(2); r = choose(2, 'drink'); r = choose(2, 'pay'); check(r.ok, 'player 2 keeps their own state (a separate conversation)')
-- the tip pays and the tree leads back to it: its cooldown stops a money loop
local paid, t0 = 0, NOW
Config.money = { get = function() return 1000 end, remove = function() return true end, add = function(_, _, n) paid = paid + n return true end }
r = choose(2, 'rumours'); r = choose(2, 'tip')
check(r.ok == false and r.error == 'Not again so soon.' and paid == 0, 'the tip again right away (greet, rumours, tip): refused, nothing paid (' .. tostring(r.error) .. ')')
source = 2; dropped(); open(2); r = choose(2, 'rumours'); r = choose(2, 'tip')
check(not r.ok and paid == 0, 'a reconnect does not reset the cooldown')
NOW = NOW + 30 * 60 * 1000
r = choose(2, 'tip'); check(r.ok and paid == 100, 'after the cooldown the tip is paid again')
Config.money = nil
source = 2; dropped(); NOW = t0 -- back to the spec's clock for what follows
Config.job = nil

-- far away: the conversation is dropped
open(1)
POS[1] = vector3(400, 400, 30)
r = choose(1, 'drink'); check(not r.ok and r.error == 'You walked away.', 'walking away mid-conversation: refused')
POS[1] = vector3(128.4, -1297.6, 29.2)
r = choose(1, 'drink'); check(not r.ok and r.error == "You're not talking to anyone.", 'and coming back does not resume it')

-- leave
open(1); r = req(1, 'leave', {}); check(r.ok, 'leave: ok')
r = choose(1, 'drink'); check(not r.ok, 'after leaving, a choice is refused')

-- rate limit: two choices within the gap
open(1)
NOW = 50000
r = req(1, 'choose', { choice = 'drink' }); check(r.ok, 'first choice goes through')
NOW = NOW + 100
r = req(1, 'choose', { choice = 'back' }); check(not r.ok and r.error == 'Slow down a moment.', 'a second choice 100 ms later: refused')
NOW = NOW + 1000
r = req(1, 'choose', { choice = 'back' }); check(r.ok, 'and a second later it goes through')

-- all or nothing with a framework
local fw = { cash = 1000, bag = { }, throwOn = nil }
Config.money = {
  get = function(src, a) return fw[a] or 0 end,
  remove = function(src, a, n) if fw.throwOn == 'remove' then error('money exploded') end if fw[a] < n then return false end fw[a] = fw[a] - n return true end,
  add = function(src, a, n) fw[a] = fw[a] + n return true end,
}
local giveMode = 'ok'
Config.items = {
  count = function(src, name) return fw.bag[name] or 0 end,
  add = function(src, name, n)
    if giveMode == 'refuse' and name == 'gem' then return false end
    if giveMode == 'throw' and name == 'gem' then error('inventory exploded') end
    fw.bag[name] = (fw.bag[name] or 0) + n
    return true
  end,
  remove = function(src, name, n) if (fw.bag[name] or 0) < n then return false end fw.bag[name] = fw.bag[name] - n return true end,
}
-- a tree with a choice that takes an item and money and gives two things
Config.dialogues.bartender.nodes.greet.choices[#Config.dialogues.bartender.nodes.greet.choices + 1] =
  { id = 'swap', label = 'Swap', take = { money = 100, items = { { name = 'junk', count = 2 } } }, give = { items = { { name = 'gem', count = 1 }, { name = 'ring', count = 1 } }, money = 10 } }
Config.dialogues.bartender.nodes.greet.choices[#Config.dialogues.bartender.nodes.greet.choices + 1] = { id = 'broken', label = 'Broken', next = 'ghost' }
Config.dialogues.bartender.nodes.greet.choices[#Config.dialogues.bartender.nodes.greet.choices + 1] = { id = 'ask', label = 'Ask for a lockpick', requires = { item = { name = 'lockpick', count = 1 } } }
local function reopen() NOW = NOW + 1000; return open(1) end

fw.bag.junk = 1
r = reopen(); check(byId(r, 'swap').locked and byId(r, 'swap').lockedReason == 'Needs Junk', 'taking 2 junk with 1 in the bag: locked "Needs Junk"')
r = choose(1, 'swap'); check(not r.ok and fw.cash == 1000 and fw.bag.junk == 1 and not fw.bag.gem, 'sending it anyway: refused, nothing moved')
fw.bag.junk = 2

giveMode = 'refuse'
r = reopen(); r = choose(1, 'swap')
check(not r.ok and fw.cash == 1000 and fw.bag.junk == 2, "can't carry the gem: the junk and the $100 come back (" .. tostring(r.error) .. ')')
giveMode = 'throw'
r = reopen(); r = choose(1, 'swap')
check(not r.ok and fw.cash == 1000 and fw.bag.junk == 2, 'the inventory throws on the gem: everything taken is given back')
giveMode = 'ok'
fw.throwOn = 'remove'
r = reopen(); r = choose(1, 'swap')
check(not r.ok and fw.cash == 1000 and fw.bag.junk == 2 and not fw.bag.gem, 'the framework throws on the payment: nothing given, nothing taken')
fw.throwOn = nil
-- the undo itself fails: said loudly in the console
giveMode = 'ok'
local realAdd = Config.money.add
local realGive = Config.items.add
Config.items.add = function(src, name, n) if name == 'ring' then return false end return realGive(src, name, n) end
Config.money.add = function() return false end
PRINTED = {}
r = reopen(); r = choose(1, 'swap')
check(not r.ok and PRINTED[1] and PRINTED[1]:find('could not undo', 1, true) ~= nil, 'the undo fails too: a red line in the console (' .. tostring(PRINTED[1]) .. ')')
Config.money.add = realAdd
Config.items.add = realGive
fw.cash, fw.bag = 1000, { junk = 2 }
r = reopen(); r = choose(1, 'swap')
check(r.ok and fw.cash == 910 and fw.bag.junk == 0 and fw.bag.gem == 1 and fw.bag.ring == 1, 'with everything in order: $100 and 2 junk taken, a gem and a ring given, $10 paid (cash ' .. fw.cash .. ')')

-- an item requirement, a next that does not exist
r = reopen(); check(byId(r, 'ask').locked and byId(r, 'ask').lockedReason == 'Needs Lockpick', 'a lockpick requirement: locked "Needs Lockpick"')
r = choose(1, 'ask'); check(not r.ok, 'sending it anyway: refused')
fw.bag.lockpick = 1
r = reopen(); check(not byId(r, 'ask').locked, 'with a lockpick it opens')
local before = fw.cash
r = choose(1, 'broken'); check(not r.ok and fw.cash == before, 'a choice leading to a node that does not exist: refused')
Config.money, Config.items = nil, nil

-- one choice at a time: the payment yields, a second arrives meanwhile
Config.money = {
  get = function() return 1000 end,
  remove = function() coroutine.yield() return true end,
  add = function() return true end,
}
Config.dialogues.bartender.nodes.greet.choices[#Config.dialogues.bartender.nodes.greet.choices + 1] = { id = 'pay', label = 'Pay', take = { money = 5 } }
open(1)
NOW = NOW + 1000
local a = start(1, 'choose', { choice = 'pay' })
NOW = NOW + 1000
local b = req(1, 'choose', { choice = 'pay' })
local ra = a()
check(ra.ok and not b.ok and b.error == 'Hold on, one moment.', 'two choices at once: the second is refused (' .. tostring(b.error) .. ')')
Config.money = nil

-- a player who drops loses their place
open(2); source = 2; dropped()
r = choose(2, 'drink'); check(not r.ok and r.error == "You're not talking to anyone.", 'a player who dropped has no conversation left')

-- a broken tree is said at start
Config.dialogues.bartender.nodes.drink.choices[2].next = 'nowhere'
PRINTED = {}
assert(load(SERVER, 'server.lua', 't'))()
check(PRINTED[1] and PRINTED[1]:find('does not exist', 1, true) ~= nil, 'a choice leading nowhere: a red error at start')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'open', { npc = 'marty' })
check(not r.ok and r.error == 'This dialogue needs OneSync on the server.', 'OneSync off: refused')
