-- interaction template, server: every server = true option and point checked again (exists, right entity, reach by the server's own position, cooldowns), keys for the lock, OneSync, the ox_target / qb-target warning.
-- Run by interaction.test.ts (test/harness.ts: check(), boot()).
local function P() end
function vector3(x, y, z) return { x = x, y = y, z = z } end
function GetCurrentResourceName() return 'demo' end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
function GetHashKey(s) local h = 0 for i = 1, #s do h = (h * 31 + s:byte(i)) % 2147483647 end return h end
local clock = 0
function GetGameTimer() return clock end
-- players: 1 at the 24/7 counter, 2 across the store (8 m), 3 far away
POS = { [1] = vector3(24.4, -1346.6, 29.5), [2] = vector3(30.0, -1340.0, 29.5), [3] = vector3(500, 500, 30) }
function GetPlayers() return { '1', '2', '3' } end
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
-- entities: 50 a car next to player 1, 51 a car far away, 52 player 2's ped, 53 an ATM next to player 1
ENTS = {
  [50] = { kind = 2, model = 7, plate = 'ZEN 01  ', at = vector3(25.5, -1346.6, 29.5), state = {} },
  [51] = { kind = 2, model = 7, plate = 'FAR 99', at = vector3(300, 300, 30), state = {} },
  [52] = { kind = 1, model = 9, player = true, at = vector3(25.0, -1346.0, 29.5), state = {} },
  [53] = { kind = 3, model = GetHashKey('prop_atm_01'), at = vector3(25.0, -1347.0, 29.5), state = {} },
}
function GetEntityCoords(e) if e > 1000 then return POS[e - 1000] end return ENTS[e].at end
function NetworkGetEntityFromNetworkId(n) return ENTS[n] and n or 0 end
function DoesEntityExist(e) return ENTS[e] ~= nil end
function GetEntityType(e) return ENTS[e].kind end
function GetVehicleNumberPlateText(e) return ENTS[e].plate end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
function GetPlayerName(s) return POS[s] and ('Player' .. s) or nil end
local exportsT, commands = {}, {}
function exports(name, fn) exportsT[name] = fn end
function RegisterCommand(name, fn) commands[name] = fn end
function GetEntityModel(e) return ENTS[e].model end
function IsPedAPlayer(e) return ENTS[e].player == true end
function Entity(e) return { state = setmetatable({ set = function(_, k, v) ENTS[e].state[k] = v end }, { __index = function(_, k) return ENTS[e].state[k] end }) } end
LOCKS = {}
function SetVehicleDoorsLocked(e, v) LOCKS[e] = v end
local notices = {}
local handler, dropped
function RegisterNetEvent(_, fn) handler = fn end
STARTED = {}
function GetResourceState(n) return STARTED[n] and 'started' or 'missing' end
local onStart
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn elseif name == 'onResourceStart' then onStart = fn end end
local last
function TriggerClientEvent(name, to, a, b)
  if name == 'demo:res' then last = b else notices[#notices+1] = { to = to, text = a } end
end
local function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  assert(load(SERVER, 'server.lua', 't'))()
end
boot()
check(#PRINTED == 0, 'no other target running: no warning')
local function req(src, name, data) source = src; handler(1, name, data); return last end

-- points
local r
for _, bad in ipairs({ { 'a table', {} }, { 'a number', 1 }, { 'nil', nil }, { 'unknown', 'vault' }, { 'the fridge (client-only)', 'fridge' } }) do
  r = req(1, 'use', { id = bad[2] })
  check(not r.ok, 'use point ' .. bad[1] .. ': refused (' .. tostring(r.error) .. ')')
end
r = req(2, 'use', { id = 'bell' })
check(not r.ok and r.error == "You're too far away.", 'ring the bell from across the store (8 m): refused')
r = req(3, 'use', { id = 'bell' })
check(not r.ok, 'ring the bell from across the map: refused')
notices = {}
r = req(1, 'use', { id = 'bell' })
local heard = {} for _, n in ipairs(notices) do heard[n.to] = n.text end
check(r.ok and heard[1] and heard[2] and not heard[3], 'ring the bell at the counter: players 1 and 2 hear it, 3 (far) does not')
notices = {}
clock = clock + 10000
r = req(1, 'use', { id = 'bell' })
check(not r.ok and #notices == 0, 'ring again after 10 s (cooldown 30 s): refused (' .. tostring(r.error) .. ')')
clock = clock + 21000
r = req(1, 'use', { id = 'bell' })
check(r.ok, 'after 31 s: rings')
r = req(2, 'use', { id = 'bell' })
check(not r.ok, 'the cooldown is per player, the distance still applies to player 2')
-- a dropped player's cooldowns go
source = 1; dropped()
POS[1] = vector3(24.4, -1346.6, 29.5)
r = req(1, 'use', { id = 'bell' })
check(r.ok, 'after player 1 drops (and the id is reused), no stale cooldown')

-- options
for _, bad in ipairs({ { 'a table', {} }, { 'a string', '50' }, { 'nil', nil }, { 'a missing entity', 999 } }) do
  r = req(1, 'select', { id = 'lock', net = bad[2] })
  check(not r.ok, 'select with net ' .. bad[1] .. ': refused (' .. tostring(r.error) .. ')')
end
r = req(1, 'select', { id = 'lock', net = 51 })
check(not r.ok and r.error == "You're too far away." and LOCKS[51] == nil, 'lock a car 400 m away: refused')
r = req(1, 'select', { id = 'trunk', net = 50 })
check(not r.ok and r.error == "You can't do that.", 'trunk (a client-only option) asked of the server: refused')
r = req(1, 'select', { id = 'lock', net = 52 })
check(not r.ok and r.error == "You can't do that.", "'lock' on a player (only vehicles have it): refused")
r = req(1, 'select', { id = 'lock', net = 53 })
check(not r.ok, "'lock' on an ATM: refused")
r = req(1, 'select', { id = 'atm', net = 53 })
check(not r.ok, 'atm (client-only) asked of the server: refused')
r = req(1, 'select', { id = {}, net = 50 })
check(not r.ok, 'select with id a table: refused')
r = req(1, 'select', { id = 'lock', net = 50 })
check(not r.ok and r.error == "You don't have the keys." and ENTS[50].state.locked == nil and LOCKS[50] == nil, 'lock the car next to you without its keys: refused, nothing changed')
check(exportsT.giveKeys(1, 'FAR 99') == true, 'giveKeys for another plate')
clock = clock + 600
r = req(1, 'select', { id = 'lock', net = 50 })
check(not r.ok and LOCKS[50] == nil, "with the keys to another car: still refused")
check(exportsT.giveKeys(1, {}) == false and exportsT.giveKeys(1, 'TOO LONG PLATE') == false and exportsT.giveKeys(99, 'ZEN 01') == false, 'giveKeys refuses a table, a 14-character plate and an offline player')
check(exportsT.giveKeys(1, 'zen 01') == true, 'giveKeys for ZEN 01 (lower case, trimmed to match the plate the server reads)')
clock = clock + 600
r = req(1, 'select', { id = 'lock', net = 50 })
check(r.ok and ENTS[50].state.locked == true and LOCKS[50] == 2, 'lock the car next to you with its keys: locked (state bag and doors)')
r = req(1, 'select', { id = 'lock', net = 50 })
check(not r.ok and ENTS[50].state.locked == true, 'lock again at once: too soon, unchanged')
clock = clock + 600
r = req(1, 'select', { id = 'lock', net = 50 })
check(r.ok and ENTS[50].state.locked == false and LOCKS[50] == 1, 'after 0.6 s: unlocked')
r = req(3, 'select', { id = 'lock', net = 50 })
check(not r.ok, 'player 3 (far) unlocking it: refused')
POS[2] = vector3(25.0, -1347.5, 29.5) -- next to the car now
clock = clock + 600
r = req(2, 'select', { id = 'lock', net = 50 })
check(not r.ok and r.error == "You don't have the keys." and ENTS[50].state.locked == false, "player 2, next to it but without keys: refused (keys are per player)")
exportsT.removeKeys(1, 'ZEN 01')
clock = clock + 600
r = req(1, 'select', { id = 'lock', net = 50 })
check(not r.ok and ENTS[50].state.locked == false, 'after removeKeys: refused')
commands.demo_givekeys(0, { '2', 'zen 01' })
clock = clock + 600
r = req(2, 'select', { id = 'lock', net = 50 })
check(r.ok and ENTS[50].state.locked == true, 'keys given from the console to player 2: they can lock it')
PRINTED = {}
commands.demo_givekeys(0, { '99', 'ZEN 01' })
check(PRINTED[1] and PRINTED[1]:find('Usage', 1, true), 'the console command with an offline player: usage')
r = req(1, 'bogus', {})
check(r.ok == false, 'unknown request: refused')
GetPlayerPed = function() return 0 end
r = req(1, 'use', { id = 'bell' })
check(not r.ok, 'no server-side ped: refused, not waved through')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'select', { id = 'lock', net = 50 })
check(not r.ok and r.error == 'This needs OneSync on the server.', 'OneSync off: options refused')
r = req(1, 'use', { id = 'bell' })
check(not r.ok and r.error == 'This needs OneSync on the server.', 'OneSync off: points refused')

-- ox_target / qb-target on the same key: a warning at start, and when one starts later
ONESYNC_CONVAR = 'on'
STARTED = { ox_target = true }
PRINTED = {}
boot()
check(#PRINTED == 1 and PRINTED[1]:find('ox_target is running', 1, true) ~= nil, 'ox_target started: one warning at start (' .. tostring(PRINTED[1]) .. ')')
PRINTED = {}
STARTED['qb-target'] = true
onStart('qb-target')
check(#PRINTED == 1 and PRINTED[1]:find('qb-target is running', 1, true) ~= nil, 'qb-target starting later: one warning')
PRINTED = {}
onStart('some_other_resource')
check(#PRINTED == 0, 'another resource starting: no warning')

