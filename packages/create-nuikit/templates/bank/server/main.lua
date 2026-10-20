-- {{name}}: server
-- Balances and transactions for the bank, and every move the page asks for. The example keeps
-- them per player in Config.saveFile; Config.money (config.lua) swaps cash and checking for your
-- framework's own. Every amount is checked here: the page's checks are only for the player.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
local MAX_TX = 50

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function record(src)
  local id = owner(src)
  local r = db[id]
  if not r then
    r = { cash = Config.startCash, checking = Config.startBank, savings = 0, tx = {}, n = 0 }
    db[id] = r
  end
  return r
end

-- Cash and checking: the framework's (Config.money) or the example's. Savings is always the example's.
local function balance(src, account)
  local m = Config.money
  if m and account ~= 'savings' then return m.get(src, account == 'cash' and 'cash' or 'bank') or 0 end
  return record(src)[account] or 0
end
local function change(src, account, delta, why)
  local m = Config.money
  if m and account ~= 'savings' then
    local name = account == 'cash' and 'cash' or 'bank'
    if delta >= 0 then return m.add(src, name, delta, why) ~= false end
    return m.remove(src, name, -delta, why) ~= false
  end
  local r = record(src)
  r[account] = (r[account] or 0) + delta
  return true
end

local function log(src, account, kind, title, amount, note)
  local r = record(src)
  r.n = (r.n or 0) + 1
  table.insert(r.tx, 1, { id = tostring(r.n), account = account, kind = kind, title = title, amount = amount, time = os.date('%a %H:%M'), note = note })
  while #r.tx > MAX_TX do table.remove(r.tx) end
end

--- What the page shows (web/src/components/blocks/bank/nui.ts: BankData).
local function snapshot(src, title, atm)
  local r = record(src)
  return {
    title = title,
    cash = balance(src, 'cash'),
    atm = atm or nil,
    accounts = {
      { id = 'checking', label = 'Checking', kind = 'personal', balance = balance(src, 'checking'), number = ('LS-%06d'):format(src) },
      { id = 'savings', label = 'Savings', kind = 'savings', balance = r.savings or 0 },
    },
    transactions = r.tx,
  }
end

--- A whole positive number of dollars, or nil.
local function amountOf(v)
  local n = tonumber(v)
  if not n or n <= 0 or n ~= math.floor(n) or n > 1e9 then return nil end
  return n
end

local handlers = {}

handlers.open = function(src, data)
  return { ok = true, bank = snapshot(src, data.title, data.atm) }
end

handlers.deposit = function(src, data)
  local amount = amountOf(data.amount)
  if not amount then return { ok = false, error = 'Enter whole dollars above $0.' } end
  if data.account ~= 'checking' and data.account ~= 'savings' then return { ok = false, error = 'Unknown account.' } end
  if balance(src, 'cash') < amount then return { ok = false, error = "You don't have that much cash." } end
  if not change(src, 'cash', -amount, 'bank deposit') then return { ok = false, error = "The deposit didn't go through." } end
  change(src, data.account, amount, 'bank deposit')
  log(src, data.account, 'deposit', 'Cash deposit', amount, data.note)
  save()
  return { ok = true }
end

handlers.withdraw = function(src, data)
  local amount = amountOf(data.amount)
  if not amount then return { ok = false, error = 'Enter whole dollars above $0.' } end
  if data.account ~= 'checking' and data.account ~= 'savings' then return { ok = false, error = 'Unknown account.' } end
  if balance(src, data.account) < amount then return { ok = false, error = "There isn't that much in the account." } end
  if not change(src, data.account, -amount, 'bank withdrawal') then return { ok = false, error = "The withdrawal didn't go through." } end
  change(src, 'cash', amount, 'bank withdrawal')
  log(src, data.account, 'withdraw', 'Cash withdrawal', -amount, data.note)
  save()
  return { ok = true }
end

handlers.transfer = function(src, data)
  local amount = amountOf(data.amount)
  if not amount then return { ok = false, error = 'Enter whole dollars above $0.' } end
  if data.atm then return { ok = false, error = "ATMs can't send transfers." } end
  -- to: a server ID or the "LS-000012" number the page shows; your own savings with "savings"
  local to = tostring(data.to or ''):gsub('%s', '')
  local target = tonumber(to:match('^LS%-(%d+)$') or to)
  if to:lower() == 'savings' or (target == src and data.account == 'savings') then
    local from, into = data.account, data.account == 'savings' and 'checking' or 'savings'
    if balance(src, from) < amount then return { ok = false, error = "There isn't that much in the account." } end
    change(src, from, -amount, 'own transfer')
    change(src, into, amount, 'own transfer')
    log(src, from, 'transfer', ('To %s'):format(into == 'savings' and 'Savings' or 'Checking'), -amount, data.note)
    log(src, into, 'transfer', ('From %s'):format(from == 'savings' and 'Savings' or 'Checking'), amount, data.note)
    save()
    return { ok = true }
  end
  if not target or target == src or not GetPlayerName(target) then return { ok = false, error = 'No one with that ID or account is online.' } end
  if balance(src, data.account) < amount then return { ok = false, error = "There isn't that much in the account." } end
  if not change(src, data.account, -amount, 'transfer') then return { ok = false, error = "The transfer didn't go through." } end
  change(target, 'checking', amount, 'transfer')
  log(src, data.account, 'transfer', ('Transfer to %s'):format(GetPlayerName(target)), -amount, data.note)
  log(target, 'checking', 'transfer', ('Transfer from %s'):format(GetPlayerName(src)), amount, data.note)
  save()
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The bank had a problem. Try again.' })
end)
