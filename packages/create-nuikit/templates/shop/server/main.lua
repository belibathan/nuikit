-- {{name}}: server
-- What's for sale, at what price, how many are left, and every purchase. The page's cart is only a
-- request: each line is checked here against Config.shops (the item, how many, the stock, the most
-- per purchase), the price is the server's, the player must be at the shop, and the money and the
-- items move all or nothing: if any item can't be given, everything given is taken back and the
-- money is refunded.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}

-- The shop checks where the player stands, which needs OneSync (server-side positions). Without it
-- the shop refuses to open; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^1[%s] OneSync is off. This shop needs it (set onesync on in server.cfg); every request will be refused.^0'):format(resource))
end

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function record(src)
  local id = owner(src)
  db[id] = db[id] or { cash = Config.startCash, bank = Config.startBank, items = {} }
  return db[id]
end

-- Money: the framework's (Config.money) or the example's.
local function balance(src, account)
  if Config.money then return Config.money.get(src, account) or 0 end
  return record(src)[account] or 0
end
local function pay(src, account, amount, why)
  if Config.money then return Config.money.remove(src, account, amount, why) ~= false end
  local r = record(src)
  if (r[account] or 0) < amount then return false end
  r[account] = r[account] - amount
  return true
end
local function refund(src, account, amount, why)
  if Config.money then return Config.money.add(src, account, amount, why) ~= false end
  local r = record(src)
  r[account] = (r[account] or 0) + amount
  return true
end

-- Items: the framework's (Config.items) or the example's bag.
local function give(src, name, count)
  if Config.items then return Config.items.add(src, name, count) == true end
  local bag = record(src).items
  bag[name] = (bag[name] or 0) + count
  return true
end
local function take(src, name, count)
  if Config.items then return Config.items.remove(src, name, count) end
  local bag = record(src).items
  bag[name] = math.max(0, (bag[name] or 0) - count)
  return true
end

-- Stock, in memory: it refills on restart.
local stock = {}
for _, shop in ipairs(Config.shops) do
  stock[shop.id] = {}
  for _, item in ipairs(shop.items) do stock[shop.id][item.id] = item.stock end
end

local function shopById(id)
  if type(id) ~= 'string' then return nil end
  for _, s in ipairs(Config.shops) do
    if s.id == id then return s end
  end
end

local function itemOf(shop, id)
  if type(id) ~= 'string' then return nil end
  for _, i in ipairs(shop.items) do
    if i.id == id then return i end
  end
end

local function near(src, shop)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return false end
  local p, c = GetEntityCoords(ped), shop.coords
  local dx, dy, dz = p.x - c.x, p.y - c.y, p.z - c.z
  return dx * dx + dy * dy + dz * dz <= (shop.radius + 2.0) ^ 2
end

local function accepts(shop, payment)
  for _, p in ipairs(shop.payment or { 'cash' }) do
    if p == payment then return true end
  end
  return false
end

--- What the page shows (web/src/components/blocks/shop/nui.ts: ShopData).
local function snapshot(src, shop)
  local items, wallet = {}, {}
  for i, item in ipairs(shop.items) do
    items[i] = { id = item.id, label = item.label, price = item.price, image = item.image, icon = item.icon,
      category = item.category, description = item.description, stock = stock[shop.id][item.id], max = item.max }
  end
  for _, p in ipairs(shop.payment or { 'cash' }) do wallet[p] = balance(src, p) end
  return { title = shop.label, description = shop.description, categories = shop.categories, items = items, wallet = wallet, payment = shop.payment or { 'cash' } }
end

local busy, last = {}, {}
AddEventHandler('playerDropped', function() busy[source] = nil; last[source] = nil end)

-- Per player and request: at most one every MIN_GAP ms (a buy and the snapshot after it are two
-- requests, so each has its own clock).
local MIN_GAP = 250
local function tooSoon(src, name)
  local now, mine = GetGameTimer(), last[src] or {}
  last[src] = mine
  if mine[name] and now - mine[name] < MIN_GAP then return true end
  mine[name] = now
  return false
end

local handlers = {}

handlers.open = function(src, data)
  local shop = shopById(data.shop)
  if not shop then return { ok = false, error = 'Unknown shop.' } end
  if not near(src, shop) then return { ok = false, error = "You're not at the shop." } end
  return { ok = true, shop = snapshot(src, shop) }
end

handlers.buy = function(src, data)
  local shop = shopById(data.shop)
  if not shop then return { ok = false, error = 'Unknown shop.' } end
  if not near(src, shop) then return { ok = false, error = "You're not at the shop." } end
  if busy[src] then return { ok = false, error = 'Hold on, the last purchase is still going through.' } end
  local payment = data.payment
  if type(payment) ~= 'string' or not accepts(shop, payment) then return { ok = false, error = "This shop doesn't take that." } end

  -- The cart: 1–20 lines of { id, count }, merged by item, every count a whole number from 1 to
  -- the item's max (or 99), never more than what's in stock. Prices are the server's.
  if type(data.items) ~= 'table' or #data.items < 1 or #data.items > 20 then return { ok = false, error = 'Your cart is empty.' } end
  local want, order = {}, {}
  for _, line in ipairs(data.items) do
    local item = type(line) == 'table' and itemOf(shop, line.id)
    local n = type(line) == 'table' and line.count
    if not item then return { ok = false, error = "Something in your cart isn't sold here." } end
    if type(n) ~= 'number' or n ~= n or n < 1 or n > 99 or n ~= math.floor(n) then return { ok = false, error = 'Something in your cart has a bad amount.' } end
    if not want[item.id] then order[#order + 1] = item end
    want[item.id] = (want[item.id] or 0) + n
  end
  local total = 0
  for _, item in ipairs(order) do
    local n, left = want[item.id], stock[shop.id][item.id]
    if n > (item.max or 99) then return { ok = false, error = ('You can buy at most %d %s at once.'):format(item.max or 99, item.label) } end
    if left and n > left then return { ok = false, error = left > 0 and ('Only %d %s left.'):format(left, item.label) or ('%s is sold out.'):format(item.label) } end
    total = total + item.price * n
  end
  if balance(src, payment) < total then return { ok = false, error = payment == 'cash' and "You don't have enough cash." or "You don't have enough money in the bank." } end

  -- The stock is held for this purchase first (a framework call below may wait, and another player
  -- must not buy the same last items meanwhile); every failure puts it back.
  local function restock(sign)
    for _, item in ipairs(order) do
      if stock[shop.id][item.id] then stock[shop.id][item.id] = stock[shop.id][item.id] + sign * want[item.id] end
    end
  end
  restock(-1)

  -- Pay, then give each item; if one can't be given (refused, or the framework errors), take back
  -- what was given and refund. Every framework call is guarded so a throw can't skip the undo.
  busy[src] = true
  local paidOk, paid = pcall(pay, src, payment, total, 'shop ' .. shop.id)
  if not (paidOk and paid) then
    restock(1)
    busy[src] = nil
    return { ok = false, error = "The payment didn't go through. Nothing was taken." }
  end
  local given, failed = {}, false
  for _, item in ipairs(order) do
    local gaveOk, gave = pcall(give, src, item.id, want[item.id])
    if gaveOk and gave then given[#given + 1] = item else failed = true break end
  end
  if failed then
    for _, g in ipairs(given) do pcall(take, src, g.id, want[g.id]) end
    local backOk, back = pcall(refund, src, payment, total, 'shop refund ' .. shop.id)
    if not (backOk and back) then
      print(('^1[%s] refund of %d (%s) to %s failed: give it back by hand^0'):format(resource, total, payment, owner(src)))
    end
    restock(1)
    busy[src] = nil
    save()
    return { ok = false, error = "You can't carry all that. Nothing was bought." }
  end
  busy[src] = nil
  save()
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if not ONESYNC then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'This shop needs OneSync on the server.' })
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  if handler and tooSoon(src, name) then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'Slow down.' })
    return
  end
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then
    busy[src] = nil
    print(('[{{name}}] %s failed: %s'):format(name, result))
  end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The shop had a problem. Try again.' })
end)
