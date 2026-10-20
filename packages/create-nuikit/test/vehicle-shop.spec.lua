-- vehicle-shop template, server: purchases validated (vehicle, server price, hex colour, payment, position, money), all or nothing (spawn or Config.onBought fails or throws, failed refund), one at a time, unique plates, test drives (one at a time, cooldown, timed removal, cleanup on drop), OneSync.
-- Run by vehicle-shop.test.ts (test/harness.ts: check(), boot()).
local function P() end
json = { encode = function() return 'x' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function vector4(x, y, z, w) return { x = x, y = y, z = z, w = w } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
POS = { [1] = vector3(-56.5, -1096.6, 26.4), [2] = vector3(-55.0, -1095.0, 26.4), [3] = vector3(500, 500, 30) }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
local clock = 0
function GetGameTimer() return clock end
function Wait(ms) clock = clock + ms; coroutine.yield() end
local timers = {}
function SetTimeout(ms, fn) timers[#timers+1] = { at = clock + ms, fn = fn } end
local function runTimers(upTo) clock = upTo; local keep = {} for _, t in ipairs(timers) do if t.at <= clock then t.fn() else keep[#keep+1] = t end end timers = keep end
function GetHashKey(s) return #s end
local ents, nextEnt, spawns = {}, 100, 0
SPAWN = 'ok' -- 'ok' | 'never' | 'throw' | 'slow'
function CreateVehicleServerSetter(model, kind, x, y, z, w)
  spawns = spawns + 1
  if SPAWN == 'throw' then error('bad model') end
  if SPAWN == 'never' then return 0 end
  nextEnt = nextEnt + 1
  ents[nextEnt] = { model = model, at = { x = x, y = y }, ready = SPAWN == 'slow' and clock + 100 or 0, state = {} }
  return nextEnt
end
function DoesEntityExist(e) return ents[e] ~= nil and ents[e].ready <= clock end
function DeleteEntity(e) ents[e] = nil end
function SetVehicleNumberPlateText(e, p) ents[e].plate = p end
function NetworkGetNetworkIdFromEntity(e) return e end
function Entity(e) return { state = { set = function(_, k, v) ents[e].state[k] = v end } } end
local handler, dropped
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn end end
local answers, events = {}, {}
function TriggerClientEvent(name, to, id, result) if name == 'demo:res' then answers[id] = result else events[#events+1] = { name = name, to = to } end end
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
local function wallet(src) return req(src, 'open', { shop = 'pdm' }).shop.wallet end
local function count(t) local n = 0 for _ in pairs(t) do n = n + 1 end return n end
local function buy(src, id, colour, payment, extra)
  local d = { shop = 'pdm', id = id, colour = colour, payment = payment or 'bank' }
  for k, v in pairs(extra or {}) do d[k] = v end
  return req(src, 'buy', d)
end

-- open
local r = req(1, 'open', { shop = 'nowhere' }); check(not r.ok, 'open an unknown showroom: refused')
r = req(3, 'open', { shop = 'pdm' }); check(not r.ok and r.error == "You're not at the showroom.", 'open from across the map: refused')
r = req(1, 'open', { shop = 'pdm' })
check(r.ok and #r.shop.vehicles == 6 and r.shop.wallet.bank == 50000 and r.shop.wallet.cash == 5000 and r.shop.testDrive == 60 and #r.shop.colours == 8, 'open: 6 vehicles, bank 50,000, cash 5,000, 60 s test drives, 8 swatches')

-- bad purchases: nothing moves
local function same() local w = wallet(1); return w.bank == 50000 and w.cash == 5000 and spawns == 0 end
local bad = {
  { 'an unknown model', function() return buy(1, 'adder', '#c8102e') end },
  { 'an id that is a table', function() return buy(1, {}, '#c8102e') end },
  { 'colour "red"', function() return buy(1, 'sultan', 'red') end },
  { 'colour "#12345"', function() return buy(1, 'sultan', '#12345') end },
  { 'colour a table', function() return buy(1, 'sultan', {}) end },
  { 'no colour', function() return buy(1, 'sultan', nil) end },
  { 'payment "crypto"', function() return buy(1, 'sultan', '#c8102e', 'crypto') end },
  { 'payment a table', function() return buy(1, 'sultan', '#c8102e', {}) end },
  { 'a Banshee with 5,000 cash', function() return buy(1, 'banshee', '#c8102e', 'cash') end },
  { 'a Banshee for $1 (the page sends a price)', function() return buy(1, 'banshee', '#c8102e', 'cash', { price = 1 }) end },
}
for _, b in ipairs(bad) do
  r = b[2]()
  check(not r.ok and same(), 'buy ' .. b[1] .. ': refused, nothing moved (' .. tostring(r.error) .. ')')
end
r = req(3, 'buy', { shop = 'pdm', id = 'sultan', colour = '#c8102e', payment = 'bank' })
check(not r.ok and spawns == 0, 'buy from across the map: refused')

-- a good purchase
math.randomseed(7)
r = buy(1, 'sultan', '#C8102E')
local e = ents[r.net]
check(r.ok and wallet(1).bank == 38000 and e and e.plate == r.plate and r.plate:match('^NK[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]$') and e.state.nkColour == '#c8102e', 'buy a Sultan: bank 38,000, the server spawns it with plate ' .. tostring(r.plate) .. ' and the colour (lower-cased)')
local plates = { [r.plate] = true }
for i = 1, 5 do local x = buy(1, 'panto', '#0b0b0b'); plates[x.plate] = true end
check(count(plates) == 6, 'six purchases, six different plates')

-- all or nothing
local before = wallet(1).bank
SPAWN = 'never'
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and wallet(1).bank == before and r.error:find('refunded', 1, true), 'the car never spawns: refunded (' .. tostring(r.error) .. ')')
SPAWN = 'throw'
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and wallet(1).bank == before, 'the spawn throws: refunded')
SPAWN = 'ok'
local realHook = Config.onBought
Config.onBought = function() return false end
local alive = count(ents)
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and wallet(1).bank == before and count(ents) == alive, 'Config.onBought refuses: the car is removed, refunded')
Config.onBought = function() error('db down') end
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and wallet(1).bank == before and count(ents) == alive, 'Config.onBought throws: the car is removed, refunded')
Config.onBought = realHook
-- with a framework: the payment refused, then a refund that fails
local fw = { cash = 0, bank = 100000 }
Config.money = {
  get = function(src, a) return fw[a] end,
  remove = function(src, a, n) if fw[a] < n then return false end fw[a] = fw[a] - n return true end,
  add = function(src, a, n) fw[a] = fw[a] + n return true end,
}
local realRemove = Config.money.remove
Config.money.remove = function() return false end
spawns = 0
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and spawns == 0 and r.error == "The payment didn't go through. Nothing was taken.", 'the framework refuses the payment: no car spawned')
Config.money.remove = realRemove
Config.money.add = function() return false end
SPAWN = 'never'
PRINTED = {}
r = buy(1, 'blista', '#0b0b0b')
check(not r.ok and PRINTED[1] and PRINTED[1]:find('refund of 8000', 1, true), 'the spawn fails and the refund fails too: a red line (' .. tostring(PRINTED[1]) .. ')')
SPAWN = 'ok'
Config.money = nil

-- one purchase at a time: the spawn waits, a second click arrives meanwhile
SPAWN = 'slow'
before = wallet(2).bank
spawns = 0
local a = start(2, 'buy', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b', payment = 'bank' })
local b = req(2, 'buy', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b', payment = 'bank' })
local ra = a()
check(ra.ok and not b.ok and spawns == 1 and wallet(2).bank == before - 12000, 'a double click while the car arrives: one car, charged once (' .. tostring(b.error) .. ')')
SPAWN = 'ok'

-- test drives
spawns, events = 0, {}
r = req(1, 'test', { shop = 'pdm', id = 'adder', colour = '#0b0b0b' })
check(not r.ok and spawns == 0, 'test drive an unknown model: refused')
r = req(3, 'test', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b' })
check(not r.ok and spawns == 0, 'test drive from across the map: refused')
r = req(1, 'test', { shop = 'pdm', id = 'banshee', colour = 'not a colour' })
local car = r.net
check(r.ok and r.seconds == 60 and ents[car] and ents[car].plate == 'TEST1' and ents[car].state.nkColour == '#0b0b0b', 'test drive a Banshee: spawned as TEST1, a bad colour becomes black')
r = req(1, 'test', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b' })
check(not r.ok and r.error == "You're already on a test drive.", 'a second test drive at once: refused')
runTimers(clock + 60000)
local ended = false; for _, ev in ipairs(events) do if ev.name == 'demo:testEnd' and ev.to == 1 then ended = true end end
check(ents[car] == nil and ended, 'after 60 s: the car is removed and the player sent back')
r = req(1, 'test', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b' })
check(not r.ok and r.error == 'One test drive every two minutes.', 'another within two minutes: refused')
runTimers(clock + 61000)
SPAWN = 'never'
r = req(1, 'test', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b' })
check(not r.ok, 'two minutes on, the car never arrives: refused')
SPAWN = 'ok'
r = req(1, 'test', { shop = 'pdm', id = 'sultan', colour = '#0b0b0b' })
check(r.ok, 'right after a failed spawn the next one works (reservation and cooldown cleared)')
car = r.net
source = 1; dropped()
check(ents[car] == nil, 'the player leaves mid test drive: the car is removed')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'open', { shop = 'pdm' })
check(not r.ok and r.error == 'This showroom needs OneSync on the server.', 'OneSync off: refused')

