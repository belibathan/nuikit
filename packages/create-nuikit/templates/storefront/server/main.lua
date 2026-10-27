-- {{name}}: server
-- A player-run business's counter. Prices, stock and whether it's open live here (Config.businesses
-- for the starting values, then the saved state). The page's cart is only a request: each line is
-- checked against the business's own products (the item, how many, the stock, the most per order),
-- the price is the server's, the business must be open, the player must be at the counter, and the
-- money and items move all or nothing: the buyer pays, gets the items, and the business is credited;
-- if any step fails, the earlier ones are undone. Manage actions (open or close, set a price within
-- the range, switch a product on or off, restock from the employee's own items) check the player's
-- job and grade for that business first.

local resource = GetCurrentResourceName()
-- The save file, or nothing yet. An unreadable file stops the resource (Log.fatal) instead of being
-- emptied by the next save: loading never writes (fivem-foundation, kvp_store rule 1).
local db = {}
do
  local raw = LoadResourceFile(resource, Config.saveFile)
  if raw and raw ~= '' then
    local data, reason = JsonSafe.decode(raw)
    if type(data) ~= 'table' then Log.fatal(('%s is unreadable (%s): fix or remove it'):format(Config.saveFile, tostring(reason))) end
    db = data
  end
end
db.biz = db.biz or {}      -- [business id] = { open, products = { [id] = { price, stock, enabled } } }
db.accounts = db.accounts or {} -- [business id] = takings (the example's account)

-- The counter checks where the player stands, which needs OneSync (server-side positions). Without
-- it every request is refused; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  Log.error('OneSync is off. This storefront needs it (set onesync on in server.cfg); every request will be refused.')
end

--- Write the save file: encode first, write only when that worked (a save never leaves a half file).
local function save()
  local encoded, reason = JsonSafe.encode(db)
  if not encoded then return Log.error(('%s not saved: %s'):format(Config.saveFile, tostring(reason))) end
  SaveResourceFile(resource, Config.saveFile, encoded, -1)
end
local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function record(src)
  local id = owner(src)
  if not db[id] then
    local bag = {}
    for name, n in pairs(Config.startBag or {}) do bag[name] = n end
    db[id] = { cash = Config.startCash, bank = Config.startBank, items = bag }
  end
  return db[id]
end

-- Money (the buyer's): the framework's (Config.money) or the example's.
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

-- The business's account: the framework's (Config.account) or the example's.
local function credit(biz, amount, why)
  if Config.account then return Config.account.add(biz.id, amount, why) ~= false end
  db.accounts[biz.id] = (db.accounts[biz.id] or 0) + amount
  return true
end
local function debit(biz, amount, why)
  if Config.account then return Config.account.remove(biz.id, amount, why) ~= false end
  db.accounts[biz.id] = math.max(0, (db.accounts[biz.id] or 0) - amount)
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
  if Config.items then return Config.items.remove(src, name, count) and true or false end
  local bag = record(src).items
  if (bag[name] or 0) < count then return false end
  bag[name] = bag[name] - count
  return true
end
local function have(src, name)
  if Config.items then return Config.items.count(src, name) or 0 end
  return record(src).items[name] or 0
end

-- The player's job and grade: the framework's (Config.job) or the example's Config.staff.
local function jobOf(src)
  if Config.job then return Config.job(src) end
  local s = Config.staff[owner(src)]
  if s then return s.job, s.grade end
end

local function businessById(id)
  if type(id) ~= 'string' then return nil end
  for _, b in ipairs(Config.businesses) do
    if b.id == id then return b end
  end
end

local function productOf(biz, id)
  if type(id) ~= 'string' then return nil end
  for _, p in ipairs(biz.products) do
    if p.id == id then return p end
  end
end

--- The business's live state, created from Config on first use. Prices are kept inside the range.
local function stateOf(biz)
  local s = db.biz[biz.id]
  if not s then
    s = { open = biz.open ~= false, products = {} }
    db.biz[biz.id] = s
  end
  for _, p in ipairs(biz.products) do
    local ps = s.products[p.id]
    if not ps then
      ps = { price = p.price, stock = p.stock, enabled = p.enabled ~= false }
      s.products[p.id] = ps
    end
    ps.price = math.max(p.minPrice or 1, math.min(p.maxPrice or ps.price, ps.price))
  end
  return s
end

local function near(src, biz)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return false end
  local p, c = GetEntityCoords(ped), biz.coords
  local dx, dy, dz = p.x - c.x, p.y - c.y, p.z - c.z
  return dx * dx + dy * dy + dz * dz <= (biz.radius + 2.0) ^ 2
end

--- Works at this business, at or above its manage grade. Checked on every manage request.
local function isStaff(src, biz)
  local ok, job, grade = pcall(jobOf, src)
  if not ok or type(job) ~= 'string' or job ~= biz.job then return false end
  return type(grade) == 'number' and grade >= (biz.manageGrade or 0)
end

local function accepts(biz, payment)
  for _, p in ipairs(biz.payment or { 'cash' }) do
    if p == payment then return true end
  end
  return false
end

local function whole(n, lo, hi) return type(n) == 'number' and n == n and n >= lo and n <= hi and n == math.floor(n) end

--- What the page shows (web/src/components/blocks/storefront/nui.ts: StorefrontData). Customers get
--- the enabled products only; staff get all of them with the price range and what they carry.
local function snapshot(src, biz)
  local st, staff = stateOf(biz), isStaff(src, biz)
  local products, wallet = {}, {}
  for _, p in ipairs(biz.products) do
    local ps = st.products[p.id]
    if ps.enabled or staff then
      local row = { id = p.id, label = p.label, price = ps.price, image = p.image, icon = p.icon, stock = ps.stock, max = p.max, enabled = ps.enabled }
      if staff then
        row.minPrice, row.maxPrice = p.minPrice or 1, p.maxPrice
        row.have = have(src, p.id)
      end
      products[#products + 1] = row
    end
  end
  for _, p in ipairs(biz.payment or { 'cash' }) do wallet[p] = balance(src, p) end
  return { title = biz.label, description = biz.description, open = st.open, products = products, wallet = wallet, payment = biz.payment or { 'cash' }, staff = staff or nil }
end

local busy, last = {}, {}
AddEventHandler('playerDropped', function() busy[source] = nil; last[source] = nil end)

local handlers = {}

local function counter(src, data)
  local biz = businessById(data.business)
  if not biz then return nil, { ok = false, error = 'Unknown business.' } end
  if not near(src, biz) then return nil, { ok = false, error = "You're not at the counter." } end
  return biz
end

handlers.open = function(src, data)
  local biz, err = counter(src, data)
  if not biz then return err end
  return { ok = true, store = snapshot(src, biz) }
end

handlers.buy = function(src, data)
  local biz, err = counter(src, data)
  if not biz then return err end
  if busy[src] then return { ok = false, error = 'Hold on, the last purchase is still going through.' } end
  local st = stateOf(biz)
  if not st.open then return { ok = false, error = biz.label .. ' is closed.' } end
  local payment = data.payment
  if type(payment) ~= 'string' or not accepts(biz, payment) then return { ok = false, error = "This business doesn't take that." } end

  -- The cart: 1–20 lines of { id, count }, merged by product, every count a whole number from 1 to
  -- the product's max (or 99), never more than what's in stock. Disabled products aren't sold.
  -- Prices are the server's.
  if type(data.items) ~= 'table' or #data.items < 1 or #data.items > 20 then return { ok = false, error = 'Your cart is empty.' } end
  local want, order = {}, {}
  for _, line in ipairs(data.items) do
    local product = type(line) == 'table' and productOf(biz, line.id)
    local n = type(line) == 'table' and line.count
    if not product or not st.products[product.id].enabled then return { ok = false, error = "Something in your cart isn't sold here." } end
    if not whole(n, 1, 99) then return { ok = false, error = 'Something in your cart has a bad amount.' } end
    if not want[product.id] then order[#order + 1] = product end
    want[product.id] = (want[product.id] or 0) + n
  end
  local total = 0
  for _, product in ipairs(order) do
    local n, ps = want[product.id], st.products[product.id]
    if n > (product.max or 99) then return { ok = false, error = ('You can buy at most %d %s at once.'):format(product.max or 99, product.label) } end
    if ps.stock and n > ps.stock then return { ok = false, error = ps.stock > 0 and ('Only %d %s left.'):format(ps.stock, product.label) or ('%s is sold out.'):format(product.label) } end
    total = total + ps.price * n
  end
  if balance(src, payment) < total then return { ok = false, error = payment == 'cash' and "You don't have enough cash." or "You don't have enough money in the bank." } end

  -- Pay, give each product, credit the business; if any step fails (refused, or the framework
  -- errors), undo the ones before it. Every framework call is guarded so a throw can't skip the undo.
  -- The stock is held for this order first (a framework call below may wait, and another buyer must
  -- not get the same last items meanwhile); every failure puts it back.
  local function hold(sign)
    for _, product in ipairs(order) do
      local ps = st.products[product.id]
      if ps.stock then ps.stock = ps.stock - sign * want[product.id] end
    end
  end
  hold(1)
  busy[src] = true
  local why = 'storefront ' .. biz.id
  local paidOk, paid = pcall(pay, src, payment, total, why)
  if not (paidOk and paid) then
    hold(-1)
    busy[src] = nil
    return { ok = false, error = "The payment didn't go through. Nothing was taken." }
  end
  local function undo(given)
    for _, g in ipairs(given) do pcall(take, src, g.id, want[g.id]) end
    local backOk, back = pcall(refund, src, payment, total, 'storefront refund ' .. biz.id)
    if not (backOk and back) then
      Log.error(('refund of %d (%s) to %s failed: give it back by hand'):format(total, payment, owner(src)))
    end
    hold(-1)
    busy[src] = nil
    save()
  end
  local given = {}
  for _, product in ipairs(order) do
    local gaveOk, gave = pcall(give, src, product.id, want[product.id])
    if gaveOk and gave then
      given[#given + 1] = product
    else
      undo(given)
      return { ok = false, error = "You can't carry all that. Nothing was bought." }
    end
  end
  local creditOk, credited = pcall(credit, biz, total, why)
  if not (creditOk and credited) then
    undo(given)
    return { ok = false, error = "The business couldn't take the payment. Nothing was bought." }
  end
  busy[src] = nil
  save()
  return { ok = true }
end

-- Staff only: open or close, set a price, switch a product on or off, restock.
handlers.manage = function(src, data)
  local biz, err = counter(src, data)
  if not biz then return err end
  if not isStaff(src, biz) then return { ok = false, error = "You don't work here." } end
  if busy[src] then return { ok = false, error = 'Hold on, the last action is still going through.' } end
  local st, action = stateOf(biz), data.action

  if action == 'open' then
    if type(data.open) ~= 'boolean' then return { ok = false, error = 'That is not a valid setting.' } end
    st.open = data.open
    save()
    return { ok = true }
  end

  local product = productOf(biz, data.product)
  if not product then return { ok = false, error = 'Unknown product.' } end
  local ps = st.products[product.id]

  if action == 'price' then
    local lo, hi = product.minPrice or 1, product.maxPrice or 1000000
    if not whole(data.price, lo, hi) then return { ok = false, error = ('The price of %s must be a whole number from %d to %d.'):format(product.label, lo, hi) } end
    ps.price = data.price
  elseif action == 'enabled' then
    if type(data.enabled) ~= 'boolean' then return { ok = false, error = 'That is not a valid setting.' } end
    ps.enabled = data.enabled
  elseif action == 'restock' then
    -- Only from what the employee actually carries, only for products that count their stock, and
    -- never past the most the business can hold.
    if ps.stock == nil then return { ok = false, error = product.label .. " isn't counted, so there's nothing to restock." } end
    local room = (biz.maxStock or Config.maxStock) - ps.stock
    if room < 1 then return { ok = false, error = product.label .. ' is full.' } end
    if not whole(data.count, 1, room) then return { ok = false, error = ('You can restock 1 to %d %s.'):format(room, product.label) } end
    local okHave, carried = pcall(have, src, product.id)
    if not okHave or carried < data.count then return { ok = false, error = ("You don't have %d %s."):format(data.count, product.label) } end
    busy[src] = true
    local tookOk, took = pcall(take, src, product.id, data.count)
    busy[src] = nil
    if not (tookOk and took) then return { ok = false, error = "Those couldn't be taken from you. Nothing was restocked." } end
    ps.stock = ps.stock + data.count
  else
    return { ok = false, error = 'Unknown action.' }
  end
  save()
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local function reply(result) TriggerClientEvent('{{name}}:res', src, id, result) end
  if not ONESYNC then return reply({ ok = false, error = 'This storefront needs OneSync on the server.' }) end
  -- One request of each kind per player per Config.rateMs (a purchase and the snapshot right after
  -- it are two kinds, so the refresh isn't refused).
  local handler = type(name) == 'string' and handlers[name]
  if not handler then return reply({ ok = false, error = 'Unknown request.' }) end
  local now, mine = GetGameTimer(), last[src] or {}
  last[src] = mine
  if mine[name] and now - mine[name] < Config.rateMs then return reply({ ok = false, error = 'Slow down.' }) end
  mine[name] = now
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then Log.error(('%s failed: %s'):format(name, result)) end
  reply(ok and result or { ok = false, error = 'The business had a problem. Try again.' })
end)
