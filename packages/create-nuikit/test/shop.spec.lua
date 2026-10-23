-- shop template, server: every cart line validated, the server's prices and stock, the player at the shop, money and items all or nothing (refused or throwing give or payment, failed refund), one purchase at a time, OneSync.
-- Run by shop.test.ts (test/harness.ts: check(), boot()).
local function P() end
json = { encode = function() return 'x' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
POS = { [1] = vector3(25.7, -1347.3, 29.5), [2] = vector3(25.0, -1346.0, 29.5), [3] = vector3(400, 400, 30) }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
function Wait() coroutine.yield() end
NOW = 0
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
-- Each request comes a second after the last, so the rate limit stays out of the way unless tested.
local function start(src, name, data)
  NOW = NOW + 1000
  seq = seq + 1
  local id = seq
  local co = coroutine.create(function() source = src; handler(id, name, data) end)
  assert(coroutine.resume(co))
  return function() while coroutine.status(co) ~= 'dead' do assert(coroutine.resume(co)) end return answers[id] end
end
local function req(src, name, data) return start(src, name, data)() end
local SHOP = '247-innocence'
local function snap(src) return req(src, 'open', { shop = SHOP }).shop end
local function stockOf(id) for _, i in ipairs(snap(1).items) do if i.id == id then return i.stock end end end
local function wallet(src) return snap(src).wallet end
local function buy(src, items, payment) return req(src, 'buy', { shop = SHOP, items = items, payment = payment or 'cash' }) end

-- open
local r = req(1, 'open', { shop = 'nowhere' }); check(not r.ok, 'open an unknown shop: refused')
r = req(1, 'open', { shop = {} }); check(not r.ok, 'open with a table for the shop: refused')
r = req(3, 'open', { shop = SHOP }); check(not r.ok and r.error == "You're not at the shop.", 'open from across the map: refused')
r = req(1, 'open', { shop = SHOP }); check(r.ok and r.shop.wallet.cash == 500 and r.shop.wallet.bank == 2500 and #r.shop.items == 7, 'open at the shop: 7 items, cash 500, bank 2500')

-- bad carts: nothing moves
local before = { cash = wallet(1).cash, water = stockOf('water') }
local function same() local w = wallet(1); return w.cash == before.cash and stockOf('water') == before.water end
local bad = {
  { 'payment "crypto"', function() return buy(1, { { id = 'water', count = 1 } }, 'crypto') end },
  { 'payment a table', function() return buy(1, { { id = 'water', count = 1 } }, {}) end },
  { 'items nil', function() return req(1, 'buy', { shop = SHOP, payment = 'cash' }) end },
  { 'items empty', function() return buy(1, {}) end },
  { 'items a string', function() return buy(1, 'water') end },
  { '21 lines', function() local t = {} for i = 1, 21 do t[i] = { id = 'water', count = 1 } end return buy(1, t) end },
  { 'a line that is a string', function() return buy(1, { 'water' }) end },
  { 'an item this shop does not sell', function() return buy(1, { { id = 'lockpick', count = 1 } }) end },
  { 'an id that is a table', function() return buy(1, { { id = {}, count = 1 } }) end },
  { 'count 0', function() return buy(1, { { id = 'water', count = 0 } }) end },
  { 'count -1', function() return buy(1, { { id = 'water', count = -1 } }) end },
  { 'count 1.5', function() return buy(1, { { id = 'water', count = 1.5 } }) end },
  { 'count "2"', function() return buy(1, { { id = 'water', count = '2' } }) end },
  { 'count NaN', function() return buy(1, { { id = 'water', count = 0/0 } }) end },
  { 'count 1e9', function() return buy(1, { { id = 'water', count = 1e9 } }) end },
  { 'count 11 (max 10)', function() return buy(1, { { id = 'water', count = 11 } }) end },
  { 'water 6 + water 5 merged (max 10)', function() return buy(1, { { id = 'water', count = 6 }, { id = 'water', count = 5 } }) end },
  { 'flashlight 6 (stock 5)', function() return buy(1, { { id = 'flashlight', count = 6 } }) end },
  { 'a phone and a radio (700 > cash 500)', function() return buy(1, { { id = 'phone', count = 1 }, { id = 'radio', count = 1 } }) end },
  { 'a price of 0 sent by the page', function() return buy(1, { { id = 'phone', count = 1, price = 0 }, { id = 'radio', count = 1, price = 0 } }) end },
}
for _, b in ipairs(bad) do
  r = b[2]()
  check(not r.ok and same(), 'buy with ' .. b[1] .. ': refused, nothing moved (' .. tostring(r.error) .. ')')
end
r = req(3, 'buy', { shop = SHOP, items = { { id = 'water', count = 1 } }, payment = 'cash' })
check(not r.ok, 'buy from across the map: refused')

-- a good purchase: the server's prices, stock goes down
r = buy(1, { { id = 'water', count = 2 }, { id = 'sandwich', count = 1 }, { id = 'water', count = 1 } })
check(r.ok and wallet(1).cash == 500 - (3 * 2 + 6) and stockOf('water') == 47 and stockOf('sandwich') == 19, 'buy 3 water (two lines) and a sandwich: cash 488, stock 47 and 19')
r = buy(1, { { id = 'phone', count = 1 } }, 'bank')
check(r.ok and wallet(1).bank == 2050 and stockOf('phone') == 2, 'buy a phone from the bank: bank 2050, 2 left')
-- sell out the flashlights, then the next is refused
req(2, 'buy', { shop = SHOP, items = { { id = 'flashlight', count = 5 } }, payment = 'bank' })
r = buy(1, { { id = 'flashlight', count = 1 } }, 'bank')
check(not r.ok and r.error == 'Flashlight is sold out.' and stockOf('flashlight') == 0, 'flashlights sold out by player 2: refused for player 1')

-- all or nothing with a framework
local fw = { cash = 1000, bank = 0, bag = {} }
Config.money = {
  get = function(src, a) return fw[a] end,
  remove = function(src, a, n) if fw[a] < n then return false end fw[a] = fw[a] - n return true end,
  add = function(src, a, n) fw[a] = fw[a] + n return true end,
}
local giveMode = 'ok'
Config.items = {
  add = function(src, name, n)
    if giveMode == 'refuse-radio' and name == 'radio' then return false end
    if giveMode == 'throw-radio' and name == 'radio' then error('inventory exploded') end
    fw.bag[name] = (fw.bag[name] or 0) + n
    return true
  end,
  remove = function(src, name, n) fw.bag[name] = (fw.bag[name] or 0) - n return true end,
}
giveMode = 'refuse-radio'
local s1, s2 = stockOf('cola'), stockOf('radio')
r = buy(1, { { id = 'cola', count = 2 }, { id = 'radio', count = 1 } })
check(not r.ok and fw.cash == 1000 and (fw.bag.cola or 0) == 0 and (fw.bag.radio or 0) == 0 and stockOf('cola') == s1 and stockOf('radio') == s2, "can't carry the radio: cola taken back, 256 refunded, stock unchanged (" .. tostring(r.error) .. ')')
giveMode = 'throw-radio'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'radio', count = 1 } })
check(not r.ok and fw.cash == 1000 and (fw.bag.cola or 0) == 0 and stockOf('cola') == s1, 'the inventory throws on the radio: cola taken back, refunded, stock unchanged')
giveMode = 'ok'
local realRemove = Config.money.remove
Config.money.remove = function() return false end
r = buy(1, { { id = 'cola', count = 1 } })
check(not r.ok and r.error == "The payment didn't go through. Nothing was taken." and (fw.bag.cola or 0) == 0, 'the framework refuses the payment: no items')
Config.money.remove = function() error('money exploded') end
r = buy(1, { { id = 'cola', count = 1 } })
check(not r.ok and (fw.bag.cola or 0) == 0, 'the framework throws on the payment: no items')
Config.money.remove = realRemove
-- the refund itself fails: said loudly in the console
giveMode = 'refuse-radio'
Config.money.add = function() return false end
PRINTED = {}
r = buy(1, { { id = 'radio', count = 1 } })
check(not r.ok and PRINTED[1] and PRINTED[1]:find('refund of 250', 1, true) ~= nil, 'the refund fails too: a red line in the console (' .. tostring(PRINTED[1]) .. ')')
Config.money.add = function(src, a, n) fw[a] = fw[a] + n return true end
fw.cash = 1000
giveMode = 'ok'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'radio', count = 1 } })
check(r.ok and fw.cash == 744 and fw.bag.cola == 2 and fw.bag.radio == 1 and stockOf('cola') == s1 - 2 and stockOf('radio') == s2 - 1, 'with the framework: 2 cola and a radio for 256')

-- one purchase at a time: the payment yields, a second arrives meanwhile
Config.money.remove = function(src, a, n) Wait(); return realRemove(src, a, n) end
local a = start(1, 'buy', { shop = SHOP, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
local b = req(1, 'buy', { shop = SHOP, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
local ra = a()
check(ra.ok and not b.ok and fw.cash == 741, 'two purchases at once: the second is refused, charged once (' .. tostring(b.error) .. ')')
Config.money.remove = realRemove
r = buy(1, { { id = 'cola', count = 1 } })
check(r.ok, 'and the next one goes through')

-- the stock is held while the payment waits: another player can't buy the same last items
Config.money.remove = function(src, a, n) Wait(); return realRemove(src, a, n) end
local left = stockOf('sandwich')
a = start(1, 'buy', { shop = SHOP, items = { { id = 'sandwich', count = left } }, payment = 'cash' })
b = req(2, 'buy', { shop = SHOP, items = { { id = 'sandwich', count = 1 } }, payment = 'cash' })
ra = a()
Config.money.remove = realRemove
check(ra.ok and not b.ok and stockOf('sandwich') == 0 and fw.bag.sandwich == left, 'the last ' .. left .. ' sandwiches, paying: a second buyer meanwhile is refused, never oversold (' .. tostring(b.error) .. ')')

-- rate limit, per player and request
local function at(src, name, d) return start(src, name, d)() end
local x = req(1, 'open', { shop = SHOP })
NOW = NOW - 950
local y = at(1, 'open', { shop = SHOP })
check(x.ok and not y.ok and y.error == 'Slow down.', 'two opens 50 ms apart: the second is refused (' .. tostring(y.error) .. ')')
NOW = NOW - 950
check(at(2, 'open', { shop = SHOP }).ok, 'the rate limit is per player: another player is not slowed down')
x = req(1, 'buy', { shop = SHOP, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
NOW = NOW - 950
y = at(1, 'open', { shop = SHOP })
check(x.ok and y.ok, 'a buy and the snapshot right after it: both answered')
x = req(1, 'buy', { shop = SHOP, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
local cash = fw.cash
NOW = NOW - 950
y = at(1, 'buy', { shop = SHOP, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
check(x.ok and not y.ok and fw.cash == cash, 'two buys 50 ms apart: the second is refused, charged once')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'open', { shop = SHOP })
check(not r.ok and r.error == 'This shop needs OneSync on the server.', 'OneSync off: refused')

