-- garage template, server: ids and plates from the client, store reads the game, take-out spawns once, release charges then acts or refunds, OneSync.
-- Run by garage.test.ts (test/harness.ts: check(), boot()).
local function P() end
local saved
json = { encode = function(t) saved = t return 'x' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function vector4(x, y, z, w) return { x = x, y = y, z = z, w = w } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
SAVE_FAILS = false
function SaveResourceFile() if SAVE_FAILS then error('disk full') end end
function GetPlayerIdentifierByType(src) return 'license:' .. src end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end

-- the world: players stand at Legion Square unless moved; entities by handle
local clock = 0
function GetGameTimer() return clock end
function Wait(ms) clock = clock + ms; coroutine.yield() end
local timers = {}
function SetTimeout(ms, fn) timers[#timers+1] = fn end
POS = { [1] = vector3(215.8, -810.1, 30.7), [2] = vector3(215.8, -810.1, 30.7) }
function GetPlayerPed(src) return 1000 + src end
function GetEntityCoords(e) return POS[e - 1000] end
local ents, nextEnt, spawns = {}, 1, 0
SPAWN_MODE = 'ok' -- 'ok' | 'never' (the entity never appears) | 'slow' (appears after 2 ticks)
local function newVeh(t) local h = nextEnt; nextEnt = nextEnt + 1; ents[h] = t; return h end
function DoesEntityExist(e) local t = ents[e]; return t ~= nil and (t.ready or 0) <= clock end
function NetworkGetEntityFromNetworkId(n) return ents[n] and n or 0 end
function NetworkGetNetworkIdFromEntity(e) return e end
function GetPedInVehicleSeat(e, seat) return ents[e] and ents[e].driver or 0 end
function GetVehicleNumberPlateText(e) return ents[e].plate end
function SetVehicleNumberPlateText(e, p) ents[e].plate = p end
function GetEntityModel(e) return ents[e].model end
function GetVehicleType(e) return 'automobile' end
function GetVehicleEngineHealth(e) return ents[e].engine end
function GetVehicleBodyHealth(e) return ents[e].body end
function DeleteEntity(e) ents[e] = nil end
function Entity(e) return { state = setmetatable({ set = function() end }, { __index = function(_, k) return ents[e] and ents[e].fuel end }) } end
function CreateVehicleServerSetter(model, kind, x, y, z, w)
  spawns = spawns + 1
  if SPAWN_MODE == 'never' then return 0 end
  return newVeh({ model = model, plate = 'TEMP', engine = 1000, body = 1000, ready = SPAWN_MODE == 'slow' and clock + 100 or 0 })
end

local handler
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler() end
local exportsT = {}
function exports(name, fn) exportsT[name] = fn end
local answers = {}
function TriggerClientEvent(_, to, id, result) answers[id] = result end
assert(load(CONFIG, 'config.lua', 't'))()
assert(load(SERVER, 'server.lua', 't'))()

local seq = 0
--- Start a request in its own coroutine; returns a function that runs it to the end and gives the answer.
local function start(src, name, data)
  seq = seq + 1
  clock = clock + 150
  local id = seq
  local co = coroutine.create(function() source = src; handler(id, name, data) end)
  assert(coroutine.resume(co))
  return function()
    while coroutine.status(co) ~= 'dead' do assert(coroutine.resume(co)) end
    return answers[id]
  end
end
local function req(src, name, data) return start(src, name, data)() end
local function runTimers() local t = timers; timers = {}; for _, fn in ipairs(t) do fn() end end
local function rec(src, id) local r = req(src, 'list', { garage = 'legion' }); for _, v in ipairs(r.vehicles) do if v.id == id then return v end end end
local function count(t) local n = 0 for _ in pairs(t) do n = n + 1 end return n end

-- set up: player 1 drives a Zentorno in and stores it; player 2 stores a Banshee
local zen = newVeh({ model = 111, plate = 'ZEN 01  ', engine = 900, body = 700, fuel = 80, driver = 1001 })
local r = req(1, 'store', { garage = 'legion', net = zen, label = 'Zentorno', class = 'Super', fuel = 999, plate = 'HACKED', model = 666, engine = 100 })
check(r.ok, 'store: player 1 stores the car they drive')
local v = rec(1, 'ZEN 01')
check(v and v.plate == 'ZEN 01' and v.engine == 90 and v.body == 70 and v.fuel == 80, 'store: plate, health and fuel read from the game, not the page (plate HACKED, engine 100, fuel 999 ignored)')
check(DoesEntityExist(zen), 'store: the car is still there until the player is out')
runTimers()
check(not DoesEntityExist(zen), 'store: the server deletes it after 1.5 s')
local ban = newVeh({ model = 222, plate = 'BAN 02', engine = 1000, body = 1000, fuel = 50, driver = 1002 })
check(req(2, 'store', { garage = 'legion', net = ban, label = 'Banshee' }).ok, 'store: player 2 stores theirs')
runTimers()

-- 1. ids and plates from the client
local badIds = { { 'a table', {} }, { 'a number', 1 }, { 'nil', nil }, { 'true', true }, { 'too long', 'ABCDEFGHIJ' }, { 'pattern chars', 'ZEN%01' }, { 'empty', '' } }
for _, b in ipairs(badIds) do
  for _, action in ipairs({ 'take', 'release' }) do
    local before = spawns
    r = req(1, action, { id = b[2], garage = 'legion' })
    check(not r.ok and spawns == before, action .. ' with id ' .. b[1] .. ' refused (' .. tostring(r.error) .. ')')
  end
end
local before = spawns
r = req(1, 'take', { id = 'BAN 02', garage = 'legion' })
check(not r.ok and spawns == before and rec(2, 'BAN 02').state == 'stored', "take: player 2's car by plate refused (" .. tostring(r.error) .. ')')
exportsT.impound('BAN 02', 100)
local charged = 0
Config.charge = function(src, n) charged = charged + n return true end
r = req(1, 'release', { id = 'BAN 02', garage = 'legion' })
check(not r.ok and charged == 0 and rec(2, 'BAN 02').state == 'impounded', "release: player 2's car refused, nothing charged")
r = req(1, 'take', { id = 'ZEN 01', garage = { 'legion' } })
check(not r.ok and spawns == before, 'take with a table for the garage refused')
r = req(1, 'take', { id = 'ZEN 01', garage = 'nowhere' })
check(not r.ok, 'take at an unknown garage refused')
POS[1] = vector3(0, 0, 0)
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok and spawns == before, "take from across the map refused (" .. tostring(r.error) .. ')')
POS[1] = vector3(215.8, -810.1, 30.7)
r = req(1, 'bogus', {}); check(r and r.ok == false, 'unknown request refused')
r = req(1, {}, {}); check(r and r.ok == false, 'a table as the request name refused')

-- 2. store: someone else's vehicle, a fake net id, not driving
local stolen = newVeh({ model = 222, plate = 'BAN 02', engine = 1000, body = 1000, driver = 1001 })
r = req(1, 'store', { garage = 'legion', net = stolen, label = 'Banshee' })
check(not r.ok and rec(1, 'BAN 02') == nil and rec(2, 'BAN 02').state == 'impounded', "store: player 2's plate refused (" .. tostring(r.error) .. ')')
DeleteEntity(stolen)
for _, n in ipairs({ { 'a table', {} }, { 'a string', '5' }, { 'a missing entity', 9999 } }) do
  r = req(1, 'store', { garage = 'legion', net = n[2] })
  check(not r.ok, 'store with net = ' .. n[1] .. ' refused')
end
local parked = newVeh({ model = 333, plate = 'NEW 1', engine = 1000, body = 1000, driver = 0 })
r = req(1, 'store', { garage = 'legion', net = parked })
check(not r.ok and rec(1, 'NEW 1') == nil, "store: a car you're not driving refused")
DeleteEntity(parked)

-- 3. take out: once only
spawns = 0
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
local first = r.net
check(r.ok and spawns == 1 and DoesEntityExist(first) and GetVehicleNumberPlateText(first) == 'ZEN 01', 'take: the server spawns it with its plate')
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok and spawns == 1, "take again: refused, still one spawn (" .. tostring(r.error) .. ')')
-- a copy with the same plate can't be stored while the real one is out
local copy = newVeh({ model = 111, plate = 'ZEN 01', engine = 1000, body = 1000, driver = 1001 })
r = req(1, 'store', { garage = 'legion', net = copy })
check(not r.ok and rec(1, 'ZEN 01').state == 'out', 'store: a same-plate copy refused while the real one is out (' .. tostring(r.error) .. ')')
DeleteEntity(copy)
-- player 2 can't store player 1's spawned car (the plate is player 1's too)
ents[first].driver = 1002
r = req(2, 'store', { garage = 'legion', net = first })
check(not r.ok and rec(1, 'ZEN 01').state == 'out', "store: player 2 can't store player 1's car")
-- store it back properly, then concurrent take-outs while the spawn is slow
ents[first].driver = 1001
check(req(1, 'store', { garage = 'legion', net = first }).ok, 'store the spawned car back')
runTimers()
spawns = 0
SPAWN_MODE = 'slow'
local a = start(1, 'take', { id = 'ZEN 01', garage = 'legion' })   -- yields while the entity streams in
local b = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })      -- arrives meanwhile
local ra = a()
check(ra.ok and not b.ok and spawns == 1, 'concurrent take-outs: one spawn, the second refused (' .. tostring(b.error) .. ')')
local c = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(not c.ok and spawns == 1, 'and a third after it finished is refused too')
SPAWN_MODE = 'ok'
-- the car is destroyed in the world: the record can come out again
DeleteEntity(ra.net)
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(r.ok and spawns == 2, 'destroyed while out: it can come out again')
ents[r.net].driver = 1001
req(1, 'store', { garage = 'legion', net = r.net }); runTimers()
-- the spawn fails: nothing taken, it can be tried again
SPAWN_MODE = 'never'
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok and rec(1, 'ZEN 01').state == 'stored', "spawn fails: still stored (" .. tostring(r.error) .. ')')
SPAWN_MODE = 'ok'
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(r.ok, 'and the next try works')
local zenOut = r.net

-- 4. release: charge then act or refund
exportsT.impound('ZEN 01', 250)
check(rec(1, 'ZEN 01').state == 'impounded' and rec(1, 'ZEN 01').fee == 250, 'impound sets the fee')
ents[zenOut].driver = 1001
r = req(1, 'store', { garage = 'legion', net = zenOut })
check(not r.ok and rec(1, 'ZEN 01').state == 'impounded', 'store: an impounded car still in the world refused (no free release)')
DeleteEntity(zenOut)
local refunded = 0
Config.refund = function(src, n) refunded = refunded + n return true end
Config.charge = function() return false end
r = req(1, 'release', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok and rec(1, 'ZEN 01').state == 'impounded', "release, can't pay: still impounded")
charged = 0
Config.charge = function(src, n) charged = charged + n return true end
SAVE_FAILS = true
r = req(1, 'release', { id = 'ZEN 01', garage = 'legion' })
SAVE_FAILS = false
local z = rec(1, 'ZEN 01')
check(not r.ok and charged == 250 and refunded == 250 and z.state == 'impounded' and z.fee == 250, 'release fails after the charge: refunded 250, still impounded with its fee (' .. tostring(r.error) .. ')')
-- concurrent releases: the charge yields (a slow framework); the second request arrives meanwhile
charged = 0
Config.charge = function(src, n) Wait(10); charged = charged + n return true end
a = start(1, 'release', { id = 'ZEN 01', garage = 'legion' })
b = req(1, 'release', { id = 'ZEN 01', garage = 'legion' })
ra = a()
check(ra.ok and not b.ok and charged == 250 and rec(1, 'ZEN 01').state == 'stored', 'concurrent releases: charged once, released once (' .. tostring(b.error) .. ')')
r = req(1, 'release', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok and charged == 250, 'release again: refused, no second charge')
-- the export: bad fees become 0
exportsT.impound('ZEN 01', -500)
check(rec(1, 'ZEN 01').fee == nil or rec(1, 'ZEN 01').fee == 0, 'impound with a negative fee: free')
check(exportsT.impound({}, 10) == false, 'impound with a table plate: false')

-- no ped for the player (they're loading in): refused, not waved through
local realPed = GetPlayerPed
GetPlayerPed = function() return 0 end
r = req(1, 'take', { id = 'ZEN 01', garage = 'legion' })
check(not r.ok, "take with no server-side ped refused (" .. tostring(r.error) .. ')')
GetPlayerPed = realPed

-- rate limit: a client spamming the event (a list walks every record; a store or take saves)
clock = clock + 5000
local refused = 0
for i = 1, 30 do
  local co = coroutine.create(function() source = 1; handler(1000 + i, 'list', { garage = 'legion' }) end)
  assert(coroutine.resume(co))
  if answers[1000 + i] and answers[1000 + i].error == 'Not so fast.' then refused = refused + 1 end
end
check(refused == 20, '30 requests in the same instant: 10 answered, 20 refused (' .. refused .. ')')
clock = clock + 1000
check(req(1, 'list', { garage = 'legion' }).ok, 'a second later: requests go through again')

-- OneSync off: loud at start, every request refused
ONESYNC_CONVAR = 'off'
PRINTED = {}
assert(load(SERVER, 'server.lua', 't'))()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start (' .. tostring(PRINTED[1]) .. ')')
spawns = 0
for _, name in ipairs({ 'list', 'store', 'take', 'release' }) do
  r = req(1, name, { id = 'ZEN 01', garage = 'legion', net = 1 })
  check(r and r.ok == false and r.error == 'This garage needs OneSync on the server.' and spawns == 0, 'OneSync off: ' .. name .. ' refused')
end

