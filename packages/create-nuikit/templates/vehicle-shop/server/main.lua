-- {{name}}: server
-- Prices, money, test drives and purchases. The page only asks: every purchase is checked here
-- (a vehicle this showroom sells, a real colour, a payment it takes, the player at the showroom,
-- the money), and then it's all or nothing: the money is taken, the server spawns the car and hands
-- it over, and if the spawn or Config.onBought fails, the car goes and the money comes back.
-- Test drives are spawned and timed here too, and cleaned up when they end or the player leaves.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
db.wallets = db.wallets or {} -- [license] = { cash, bank }
db.owned = db.owned or {}     -- [plate] = { owner, model, colour, shop }

-- The server spawns cars and checks where the player stands, which needs OneSync. Without it the
-- showroom refuses everything; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^1[%s] OneSync is off. This showroom needs it (set onesync on in server.cfg); every request will be refused.^0'):format(resource))
end

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function license(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function wallet(src)
  local id = license(src)
  db.wallets[id] = db.wallets[id] or { cash = Config.startCash, bank = Config.startBank }
  return db.wallets[id]
end
local function balance(src, account)
  if Config.money then return Config.money.get(src, account) or 0 end
  return wallet(src)[account] or 0
end
local function pay(src, account, amount, why)
  if Config.money then return Config.money.remove(src, account, amount, why) ~= false end
  local w = wallet(src)
  if (w[account] or 0) < amount then return false end
  w[account] = w[account] - amount
  return true
end
local function refund(src, account, amount, why)
  if Config.money then return Config.money.add(src, account, amount, why) ~= false end
  local w = wallet(src)
  w[account] = (w[account] or 0) + amount
  return true
end

local function shopById(id)
  if type(id) ~= 'string' then return nil end
  for _, s in ipairs(Config.shops) do
    if s.id == id then return s end
  end
end
local function vehicleOf(shop, id)
  if type(id) ~= 'string' then return nil end
  for _, v in ipairs(shop.vehicles) do
    if v.id == id then return v end
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
  for _, p in ipairs(shop.payment or { 'bank' }) do
    if p == payment then return true end
  end
  return false
end
local function colourOf(v)
  if type(v) ~= 'string' or not v:match('^#%x%x%x%x%x%x$') then return nil end
  return v:lower()
end

--- A new plate nobody has: "NK" and six letters or digits.
local CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
local function newPlate()
  for _ = 1, 50 do
    local p = 'NK'
    for _ = 1, 6 do
      local i = math.random(#CHARS)
      p = p .. CHARS:sub(i, i)
    end
    if not db.owned[p] then return p end
  end
end

--- Spawn a car for the player and wait for it; the entity, or nil.
local function spawn(model, at, plate, colour)
  local entity = CreateVehicleServerSetter(GetHashKey(model), 'automobile', at.x, at.y, at.z, at.w)
  local deadline = GetGameTimer() + 3000
  while not (entity and entity ~= 0 and DoesEntityExist(entity)) and GetGameTimer() < deadline do Wait(50) end
  if not (entity and entity ~= 0 and DoesEntityExist(entity)) then return nil end
  SetVehicleNumberPlateText(entity, plate)
  Entity(entity).state:set('nkColour', colour, true) -- the client paints it (custom colour) when it has it
  return entity
end

local function snapshot(src, shop)
  local vehicles, w = {}, {}
  for i, v in ipairs(shop.vehicles) do
    vehicles[i] = { id = v.id, label = v.label, brand = v.brand, category = v.category, price = v.price, seats = v.seats, stats = v.stats }
  end
  for _, p in ipairs(shop.payment or { 'bank' }) do w[p] = balance(src, p) end
  return {
    title = shop.label, description = shop.description, categories = shop.categories, vehicles = vehicles,
    wallet = w, payment = shop.payment or { 'bank' }, colours = Config.colours, testDrive = shop.testDrive and shop.testDrive.seconds or nil,
  }
end

local busy, tests, lastTest, last = {}, {}, {}, {}

-- Per player and request: at most one every MIN_GAP ms.
local MIN_GAP = 250
local function tooSoon(src, name)
  local now, mine = GetGameTimer(), last[src] or {}
  last[src] = mine
  if mine[name] and now - mine[name] < MIN_GAP then return true end
  mine[name] = now
  return false
end

local function endTest(src)
  local t = tests[src]
  if not t then return end
  tests[src] = nil
  if DoesEntityExist(t.entity) then DeleteEntity(t.entity) end
  TriggerClientEvent('{{name}}:testEnd', src, t.shop)
end
AddEventHandler('playerDropped', function()
  local src = source
  busy[src], last[src] = nil, nil
  if tests[src] then
    if DoesEntityExist(tests[src].entity) then DeleteEntity(tests[src].entity) end
    tests[src] = nil
  end
end)

local handlers = {}

handlers.open = function(src, data)
  local shop = shopById(data.shop)
  if not shop then return { ok = false, error = 'Unknown showroom.' } end
  if not near(src, shop) then return { ok = false, error = "You're not at the showroom." } end
  return { ok = true, shop = snapshot(src, shop) }
end

handlers.buy = function(src, data)
  local shop = shopById(data.shop)
  if not shop then return { ok = false, error = 'Unknown showroom.' } end
  if not near(src, shop) then return { ok = false, error = "You're not at the showroom." } end
  local v = vehicleOf(shop, data.id)
  if not v then return { ok = false, error = "That isn't sold here." } end
  local colour = colourOf(data.colour)
  if not colour then return { ok = false, error = 'Pick a colour.' } end
  if type(data.payment) ~= 'string' or not accepts(shop, data.payment) then return { ok = false, error = "This showroom doesn't take that." } end
  if busy[src] then return { ok = false, error = 'Hold on, the last purchase is still going through.' } end
  if balance(src, data.payment) < v.price then return { ok = false, error = data.payment == 'cash' and "You don't have enough cash." or "You don't have enough money in the bank." } end

  busy[src] = true -- the spawn below waits: a second click must not buy twice
  local paidOk, paid = pcall(pay, src, data.payment, v.price, 'vehicle ' .. v.id)
  if not (paidOk and paid) then
    busy[src] = nil
    return { ok = false, error = "The payment didn't go through. Nothing was taken." }
  end
  local plate = newPlate()
  local spawnOk, entity = pcall(function() return plate and spawn(v.id, shop.delivery, plate, colour) end)
  if not spawnOk then entity = nil end
  local recorded = false
  if entity then
    local hookOk, kept = pcall(Config.onBought, src, { model = v.id, plate = plate, colour = colour, net = NetworkGetNetworkIdFromEntity(entity) })
    recorded = hookOk and kept ~= false
  end
  if not entity or not recorded then
    if entity and DoesEntityExist(entity) then DeleteEntity(entity) end
    local backOk, back = pcall(refund, src, data.payment, v.price, 'vehicle refund ' .. v.id)
    if not (backOk and back) then
      print(('^1[%s] refund of %d (%s) to %s failed: give it back by hand^0'):format(resource, v.price, data.payment, license(src)))
    end
    busy[src] = nil
    save()
    return { ok = false, error = "The car couldn't be delivered. Your money was refunded." }
  end
  db.owned[plate] = { owner = license(src), model = v.id, colour = colour, shop = shop.id }
  save()
  busy[src] = nil
  return { ok = true, net = NetworkGetNetworkIdFromEntity(entity), plate = plate, colour = colour }
end

handlers.test = function(src, data)
  local shop = shopById(data.shop)
  if not shop then return { ok = false, error = 'Unknown showroom.' } end
  if not shop.testDrive then return { ok = false, error = 'No test drives here.' } end
  if not near(src, shop) then return { ok = false, error = "You're not at the showroom." } end
  local v = vehicleOf(shop, data.id)
  if not v then return { ok = false, error = "That isn't sold here." } end
  local colour = colourOf(data.colour) or '#0b0b0b'
  if tests[src] then return { ok = false, error = "You're already on a test drive." } end
  local now = GetGameTimer()
  if lastTest[src] and now - lastTest[src] < 120000 then return { ok = false, error = 'One test drive every two minutes.' } end
  lastTest[src] = now
  tests[src] = { shop = shop.id } -- reserved before the spawn waits
  local spawnOk, entity = pcall(spawn, v.id, shop.testDrive.spawn, 'TEST' .. src, colour)
  if not spawnOk or not entity then
    tests[src], lastTest[src] = nil, nil -- a car that never came doesn't count against the player
    return { ok = false, error = "The car didn't arrive. Try again." }
  end
  if not tests[src] then -- the player left while it arrived: nobody else will remove it
    if DoesEntityExist(entity) then DeleteEntity(entity) end
    return { ok = false, error = "You left before the car arrived." }
  end
  tests[src].entity = entity
  SetTimeout(shop.testDrive.seconds * 1000, function()
    if tests[src] and tests[src].entity == entity then endTest(src) end
  end)
  return { ok = true, net = NetworkGetNetworkIdFromEntity(entity), seconds = shop.testDrive.seconds, colour = colour }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if not ONESYNC then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'This showroom needs OneSync on the server.' })
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
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The showroom had a problem. Try again.' })
end)
