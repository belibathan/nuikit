-- storefront template, server: open/closed, every cart line validated, the server's prices and stock, the player at the counter, money and items all or nothing (refused or throwing payment, give or business account, failed refund), one request at a time and rate limits, and the staff-only Manage actions (job and grade, price range, restock only from what the employee carries), OneSync.
-- Run by storefront.test.ts (test/harness.ts: check(), boot()).
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
local AT = vector3(-1194.7, -892.7, 13.9)
-- 1 buyer, 2 employee (grade 1), 3 far away, 4 employee below the manage grade, 5 mechanic (another business), 6 employee far away
POS = { [1] = AT, [2] = vector3(-1194.0, -892.0, 13.9), [3] = vector3(400, 400, 30), [4] = AT, [5] = AT, [6] = vector3(400, 400, 30) }
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
Config.staff = {
  ['license:2'] = { job = 'burgershot', grade = 1 },
  ['license:4'] = { job = 'burgershot', grade = 0 },
  ['license:5'] = { job = 'mechanic', grade = 3 },
  ['license:6'] = { job = 'burgershot', grade = 2 },
}
local seq = 0
local function start(src, name, data)
  seq = seq + 1
  local id = seq
  local co = coroutine.create(function() source = src; handler(id, name, data) end)
  assert(coroutine.resume(co))
  return function() while coroutine.status(co) ~= 'dead' do assert(coroutine.resume(co)) end return answers[id] end
end
-- Each request comes a second after the last, so the rate limit stays out of the way unless tested.
local function req(src, name, data) NOW = NOW + 1000; return start(src, name, data)() end
local BIZ = 'burgershot'
local function snap(src) return req(src, 'open', { business = BIZ }).store end
local function find(s, id) for _, p in ipairs(s.products) do if p.id == id then return p end end end
local function stockOf(id) return find(snap(2), id).stock end
local function priceOf(id) return find(snap(2), id).price end
local function wallet(src) return snap(src).wallet end
local function buy(src, items, payment) return req(src, 'buy', { business = BIZ, items = items, payment = payment or 'cash' }) end
local function manage(src, d) d.business = BIZ; return req(src, 'manage', d) end

-- open
local r = req(1, 'open', { business = 'nowhere' }); check(not r.ok, 'open an unknown business: refused')
r = req(1, 'open', { business = {} }); check(not r.ok, 'open with a table for the business: refused')
r = req(3, 'open', { business = BIZ }); check(not r.ok and r.error == "You're not at the counter.", 'open from across the map: refused')
r = req(1, 'open', { business = BIZ })
check(r.ok and r.store.open and r.store.wallet.cash == 500 and r.store.wallet.bank == 2500 and #r.store.products == 4 and not r.store.staff, 'open at the counter: 4 products, cash 500, bank 2500, no staff flag')
check(find(r.store, 'burger').minPrice == nil and find(r.store, 'burger').have == nil, 'customers are not sent the price range or what anyone carries')
check(snap(2).staff == true and find(snap(2), 'burger').minPrice == 5 and find(snap(2), 'burger').maxPrice == 18, 'an employee gets the staff flag and the price range')

-- bad carts: nothing moves
local before = { cash = wallet(1).cash, burger = stockOf('burger') }
local function same() local w = wallet(1); return w.cash == before.cash and stockOf('burger') == before.burger end
local bad = {
  { 'payment "crypto"', function() return buy(1, { { id = 'burger', count = 1 } }, 'crypto') end },
  { 'payment a table', function() return buy(1, { { id = 'burger', count = 1 } }, {}) end },
  { 'items nil', function() return req(1, 'buy', { business = BIZ, payment = 'cash' }) end },
  { 'items empty', function() return buy(1, {}) end },
  { 'items a string', function() return buy(1, 'burger') end },
  { '21 lines', function() local t = {} for i = 1, 21 do t[i] = { id = 'burger', count = 1 } end return buy(1, t) end },
  { 'a line that is a string', function() return buy(1, { 'burger' }) end },
  { 'a product this business does not sell', function() return buy(1, { { id = 'repairkit', count = 1 } }) end },
  { 'an id that is a table', function() return buy(1, { { id = {}, count = 1 } }) end },
  { 'count 0', function() return buy(1, { { id = 'burger', count = 0 } }) end },
  { 'count -1', function() return buy(1, { { id = 'burger', count = -1 } }) end },
  { 'count 1.5', function() return buy(1, { { id = 'burger', count = 1.5 } }) end },
  { 'count "2"', function() return buy(1, { { id = 'burger', count = '2' } }) end },
  { 'count NaN', function() return buy(1, { { id = 'burger', count = 0/0 } }) end },
  { 'count 1e9', function() return buy(1, { { id = 'burger', count = 1e9 } }) end },
  { 'count 11 (max 10)', function() return buy(1, { { id = 'burger', count = 11 } }) end },
  { 'burger 6 + burger 5 merged (max 10)', function() return buy(1, { { id = 'burger', count = 6 }, { id = 'burger', count = 5 } }) end },
  { 'a sold-out milkshake', function() return buy(1, { { id = 'shake', count = 1 } }) end },
  { 'a price of 0 sent by the page', function() return buy(1, { { id = 'burger', count = 1, price = 0 } }) end },
}
for _, b in ipairs(bad) do
  r = b[2]()
  if b[1] == 'a price of 0 sent by the page' then
    check(r.ok and wallet(1).cash == before.cash - 9, 'buy with ' .. b[1] .. ': the server charges its own price (9)')
    before.cash = wallet(1).cash; before.burger = stockOf('burger')
  else
    check(not r.ok and same(), 'buy with ' .. b[1] .. ': refused, nothing moved (' .. tostring(r.error) .. ')')
  end
end
r = req(3, 'buy', { business = BIZ, items = { { id = 'burger', count = 1 } }, payment = 'cash' })
check(not r.ok, 'buy from across the map: refused')
r = req(1, 'buy', { business = BIZ, items = { { id = 'burger', count = 10 }, { id = 'fries', count = 10 }, { id = 'cola', count = 10 } }, payment = 'cash' })
check(r.ok and wallet(1).cash == before.cash - (90 + 40 + 30), 'a full order of 30 products: 160 charged')

-- good purchase: the server's prices, stock down, the business is credited
before.cash = wallet(1).cash
local stock0 = stockOf('burger')
r = buy(1, { { id = 'cola', count = 2 }, { id = 'cola', count = 1 } })
check(r.ok and wallet(1).cash == before.cash - 9 and stockOf('cola') == 40 - 10 - 3, 'buy 3 cola (two lines): cash down 9, stock down 3')
r = buy(1, { { id = 'burger', count = 1 } }, 'bank')
check(r.ok and wallet(1).bank == 2500 - 9 and stockOf('burger') == stock0 - 1, 'buy a burger from the bank: bank 2491')

-- closed: staff close it, every purchase is refused
r = manage(2, { action = 'open', open = false })
check(r.ok and snap(1).open == false, 'staff close the business')
before.cash = wallet(1).cash
r = buy(1, { { id = 'cola', count = 1 } })
check(not r.ok and r.error:find('closed', 1, true) ~= nil and wallet(1).cash == before.cash, 'buy while closed: refused, nothing moved (' .. tostring(r.error) .. ')')
r = manage(2, { action = 'open', open = 'yes' }); check(not r.ok, 'open = "yes": refused')
manage(2, { action = 'open', open = true })
r = buy(1, { { id = 'cola', count = 1 } }); check(r.ok, 'open again: the purchase goes through')

-- manage: who may
r = manage(1, { action = 'price', product = 'burger', price = 10 })
check(not r.ok and r.error == "You don't work here." and priceOf('burger') == 9, 'a customer sets a price: refused')
r = manage(4, { action = 'price', product = 'burger', price = 10 })
check(not r.ok and priceOf('burger') == 9, 'an employee below the manage grade: refused')
r = manage(5, { action = 'price', product = 'burger', price = 10 })
check(not r.ok and priceOf('burger') == 9, "another business's mechanic: refused")
r = manage(6, { action = 'price', product = 'burger', price = 10 })
check(not r.ok and r.error == "You're not at the counter." and priceOf('burger') == 9, 'an employee across the map: refused')
r = manage(1, { action = 'open', open = false })
check(not r.ok and snap(1).open, 'a customer closes the business: refused')
r = manage(1, { action = 'restock', product = 'burger', count = 1 }); check(not r.ok, 'a customer restocks: refused')
r = manage(1, { action = 'enabled', product = 'burger', enabled = false }); check(not r.ok and find(snap(1), 'burger') ~= nil, 'a customer hides a product: refused')

-- manage: prices stay in the range (burger 5 to 18)
local badPrice = { 4, 19, 0, -5, 10.5, '12', 0/0, 1e9, {}, true }
for _, v in ipairs(badPrice) do
  r = manage(2, { action = 'price', product = 'burger', price = v })
  check(not r.ok and priceOf('burger') == 9, 'set the price to ' .. type(v) .. ' ' .. tostring(v) .. ': refused')
end
r = manage(2, { action = 'price', product = 'nothing', price = 10 }); check(not r.ok, 'price of an unknown product: refused')
r = manage(2, { action = 'price', product = {}, price = 10 }); check(not r.ok, 'price of a table: refused')
r = manage(2, { action = 'frobnicate', product = 'burger' }); check(not r.ok and r.error == 'Unknown action.', 'an unknown action: refused')
r = manage(2, { action = {}, product = 'burger' }); check(not r.ok, 'an action that is a table: refused')
r = manage(2, { action = 'price', product = 'burger', price = 5 }); check(r.ok and priceOf('burger') == 5, 'the lowest price in the range: set')
r = manage(2, { action = 'price', product = 'burger', price = 18 }); check(r.ok and priceOf('burger') == 18, 'the highest price in the range: set')
before.cash = wallet(1).cash
r = buy(1, { { id = 'burger', count = 2 } })
check(r.ok and wallet(1).cash == before.cash - 36, 'customers pay the new price (2 burgers at 18)')
manage(2, { action = 'price', product = 'burger', price = 9 })

-- manage: switch a product off, it disappears and can't be bought; back on
r = manage(2, { action = 'enabled', product = 'fries', enabled = 'no' }); check(not r.ok, 'enabled = "no": refused')
r = manage(2, { action = 'enabled', product = 'fries', enabled = false })
check(r.ok and find(snap(1), 'fries') == nil and find(snap(2), 'fries').enabled == false, 'fries switched off: hidden from customers, shown to staff as off')
before.cash = wallet(1).cash
r = buy(1, { { id = 'fries', count = 1 } })
check(not r.ok and wallet(1).cash == before.cash, 'buying fries while off: refused (a page that kept the old menu)')
r = manage(2, { action = 'enabled', product = 'fries', enabled = true }); check(r.ok and find(snap(1), 'fries') ~= nil, 'fries back on')

-- restock: only from what the employee carries (the example bag: 30 burgers)
local s0 = stockOf('burger')
local bad2 = {
  { 'count 0', 0 }, { 'count -3', -3 }, { 'count 2.5', 2.5 }, { 'count "5"', '5' }, { 'count NaN', 0/0 }, { 'count 1e9', 1e9 },
  { 'more than carried (31 of 30)', 31 }, { 'past the most the business holds (500)', 600 },
}
for _, b in ipairs(bad2) do
  r = manage(2, { action = 'restock', product = 'burger', count = b[2] })
  check(not r.ok and stockOf('burger') == s0, 'restock with ' .. b[1] .. ': refused, stock unchanged (' .. tostring(r.error) .. ')')
end
r = manage(2, { action = 'restock', product = 'milk', count = 1 }); check(not r.ok, 'restock an unknown product: refused')
r = manage(2, { action = 'restock', product = 'shake', count = 5 })
check(not r.ok and r.error == "You don't have 5 Milkshake." and stockOf('shake') == 0, 'restock an item the employee does not carry: refused')
r = manage(2, { action = 'restock', product = 'burger', count = 20 })
check(r.ok and stockOf('burger') == s0 + 20 and find(snap(2), 'burger').have == 10, 'restock 20 burgers: stock up 20, the employee has 10 left')
r = manage(2, { action = 'restock', product = 'burger', count = 20 })
check(not r.ok and stockOf('burger') == s0 + 20, 'restock 20 more with 10 carried: refused')
r = manage(2, { action = 'restock', product = 'burger', count = 10 })
check(r.ok and stockOf('burger') == s0 + 30 and find(snap(2), 'burger').have == 0, 'restock the last 10: the employee has none left')
r = manage(2, { action = 'restock', product = 'burger', count = 1 }); check(not r.ok, 'restock with nothing carried: refused')

-- all or nothing with a framework
local fw = { cash = 1000, bank = 0, bag = {}, till = 0 }
Config.money = {
  get = function(src, a) return fw[a] end,
  remove = function(src, a, n) if fw[a] < n then return false end fw[a] = fw[a] - n return true end,
  add = function(src, a, n) fw[a] = fw[a] + n return true end,
}
local accountMode = 'ok'
Config.account = {
  add = function(id, n) if accountMode == 'refuse' then return false end if accountMode == 'throw' then error('bank exploded') end fw.till = fw.till + n return true end,
  remove = function(id, n) fw.till = fw.till - n return true end,
}
local giveMode = 'ok'
Config.items = {
  add = function(src, name, n)
    if giveMode == 'refuse-fries' and name == 'fries' then return false end
    if giveMode == 'throw-fries' and name == 'fries' then error('inventory exploded') end
    fw.bag[name] = (fw.bag[name] or 0) + n
    return true
  end,
  remove = function(src, name, n) if (fw.bag[name] or 0) < n then return false end fw.bag[name] = fw.bag[name] - n return true end,
  count = function(src, name) return fw.bag[name] or 0 end,
}
fw.cash = 5
r = buy(1, { { id = 'cola', count = 2 } })
check(not r.ok and r.error == "You don't have enough cash." and fw.cash == 5 and fw.till == 0, "can't afford it (6 > 5): refused, nothing moved")
fw.cash = 1000
giveMode = 'refuse-fries'
local s1, s2 = stockOf('cola'), stockOf('fries')
r = buy(1, { { id = 'cola', count = 2 }, { id = 'fries', count = 1 } })
check(not r.ok and fw.cash == 1000 and fw.till == 0 and (fw.bag.cola or 0) == 0 and stockOf('cola') == s1 and stockOf('fries') == s2, "can't carry the fries: cola taken back, 10 refunded, nothing in the till, stock unchanged (" .. tostring(r.error) .. ')')
giveMode = 'throw-fries'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'fries', count = 1 } })
check(not r.ok and fw.cash == 1000 and fw.till == 0 and (fw.bag.cola or 0) == 0 and stockOf('cola') == s1, 'the inventory throws on the fries: cola taken back, refunded, stock unchanged')
giveMode = 'ok'
accountMode = 'refuse'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'fries', count = 1 } })
check(not r.ok and fw.cash == 1000 and fw.till == 0 and (fw.bag.cola or 0) == 0 and (fw.bag.fries or 0) == 0 and stockOf('cola') == s1, 'the business account refuses: items taken back, buyer refunded, stock unchanged (' .. tostring(r.error) .. ')')
accountMode = 'throw'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'fries', count = 1 } })
check(not r.ok and fw.cash == 1000 and fw.till == 0 and (fw.bag.cola or 0) == 0 and (fw.bag.fries or 0) == 0, 'the business account throws: items taken back, buyer refunded')
accountMode = 'ok'
local realRemove = Config.money.remove
Config.money.remove = function() return false end
r = buy(1, { { id = 'cola', count = 1 } })
check(not r.ok and r.error == "The payment didn't go through. Nothing was taken." and (fw.bag.cola or 0) == 0 and fw.till == 0, 'the framework refuses the payment: no items, nothing in the till')
Config.money.remove = function() error('money exploded') end
r = buy(1, { { id = 'cola', count = 1 } })
check(not r.ok and (fw.bag.cola or 0) == 0 and fw.till == 0, 'the framework throws on the payment: no items, nothing in the till')
Config.money.remove = realRemove
-- the refund itself fails: said loudly in the console
giveMode = 'refuse-fries'
Config.money.add = function() return false end
PRINTED = {}
r = buy(1, { { id = 'fries', count = 1 } })
check(not r.ok and PRINTED[1] and PRINTED[1]:find('refund of 4', 1, true) ~= nil, 'the refund fails too: a red line in the console (' .. tostring(PRINTED[1]) .. ')')
Config.money.add = function(src, a, n) fw[a] = fw[a] + n return true end
fw.cash = 1000
giveMode = 'ok'
r = buy(1, { { id = 'cola', count = 2 }, { id = 'fries', count = 1 } })
check(r.ok and fw.cash == 990 and fw.till == 10 and fw.bag.cola == 2 and fw.bag.fries == 1 and stockOf('cola') == s1 - 2 and stockOf('fries') == s2 - 1, 'with the framework: 2 cola and fries for 10, all in the till')

-- restock with the framework: the inventory refuses or throws on the removal, nothing is added
fw.bag.shake = 10
local realTake = Config.items.remove
Config.items.remove = function() return false end
r = manage(2, { action = 'restock', product = 'shake', count = 5 })
check(not r.ok and stockOf('shake') == 0, 'the inventory refuses to take the items: nothing restocked')
Config.items.remove = function() error('inventory exploded') end
r = manage(2, { action = 'restock', product = 'shake', count = 5 })
check(not r.ok and stockOf('shake') == 0, 'the inventory throws on the removal: nothing restocked')
Config.items.remove = realTake
r = manage(2, { action = 'restock', product = 'shake', count = 5 })
check(r.ok and stockOf('shake') == 5 and fw.bag.shake == 5, 'with the framework: 5 milkshakes moved from the employee into the stock')
-- a framework job: grade comes from Config.job, and a thrown job lookup is no job
Config.job = function(src) if src == 1 then return 'burgershot', 3 end if src == 4 then error('job exploded') end end
r = manage(1, { action = 'price', product = 'burger', price = 10 }); check(r.ok, 'a framework job at the right grade: allowed')
r = manage(4, { action = 'price', product = 'burger', price = 11 }); check(not r.ok and priceOf('burger') == 10, 'the job lookup throws: refused')
Config.job = function(src) if src == 1 then return 'burgershot', 'boss' end if src == 4 then return 'burgershot' end end
r = manage(1, { action = 'price', product = 'burger', price = 11 }); check(not r.ok and priceOf('burger') == 10, 'a grade that is not a number: refused')
r = manage(4, { action = 'price', product = 'burger', price = 11 }); check(not r.ok and priceOf('burger') == 10, 'no grade at all: refused')
Config.job = nil

-- one request at a time: the payment yields, a second purchase arrives meanwhile
Config.money.remove = function(src, a, n) Wait(); return realRemove(src, a, n) end
fw.cash = 1000
NOW = NOW + 1000
local a = start(1, 'buy', { business = BIZ, items = { { id = 'cola', count = 1 } }, payment = 'cash' })
NOW = NOW + 1000
local b = start(1, 'buy', { business = BIZ, items = { { id = 'cola', count = 1 } }, payment = 'cash' })()
local ra = a()
check(ra.ok and not b.ok and fw.cash == 997, 'two purchases at once: the second is refused, charged once (' .. tostring(b.error) .. ')')
Config.money.remove = realRemove
r = buy(1, { { id = 'cola', count = 1 } })
check(r.ok, 'and the next one goes through')

-- the stock is held while the payment waits: another buyer can't get the same last items
Config.money.remove = function(src, a, n) Wait(); return realRemove(src, a, n) end
local left = stockOf('shake')
NOW = NOW + 1000
a = start(1, 'buy', { business = BIZ, items = { { id = 'shake', count = left } }, payment = 'cash' })
NOW = NOW + 1000
b = start(2, 'buy', { business = BIZ, items = { { id = 'shake', count = 1 } }, payment = 'cash' })()
ra = a()
Config.money.remove = realRemove
check(left > 0 and ra.ok and not b.ok and stockOf('shake') == 0, 'the last ' .. left .. ' milkshakes, paying: a second buyer meanwhile is refused, never oversold (' .. tostring(b.error) .. ')')

-- the same player twice within Config.rateMs
NOW = NOW + 1000
local x = start(1, 'open', { business = BIZ })()
NOW = NOW + 50
local y = start(1, 'open', { business = BIZ })()
check(x.ok and not y.ok and y.error == 'Slow down.', 'two requests 50 ms apart: the second is refused (' .. tostring(y.error) .. ')')
NOW = NOW + 50
local z = start(2, 'open', { business = BIZ })()
check(z.ok, 'the rate limit is per player: another player is not slowed down')
NOW = NOW + 300
check(start(1, 'open', { business = BIZ })().ok, 'after the interval the player can ask again')
NOW = NOW + 1000
x = start(1, 'buy', { business = BIZ, items = { { id = 'cola', count = 1 } }, payment = 'cash' })()
NOW = NOW + 50
y = start(1, 'open', { business = BIZ })()
check(x.ok and y.ok, 'a purchase and the snapshot 50 ms after it: both answered (' .. tostring(y.error) .. ')')
NOW = NOW + 50
y = start(1, 'buy', { business = BIZ, items = { { id = 'cola', count = 1 } }, payment = 'cash' })()
check(not y.ok and y.error == 'Slow down.', 'two purchases 100 ms apart: the second is refused')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'open', { business = BIZ })
check(not r.ok and r.error == 'This storefront needs OneSync on the server.', 'OneSync off: refused')
