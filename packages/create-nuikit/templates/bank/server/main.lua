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

--- A whole, positive, sane number of dollars, or nil. Only real numbers: no strings, NaN, infinity,
--- negatives (a negative transfer would pay the sender) or amounts past what any account holds.
local MAX_AMOUNT = 1e9
local function amountOf(v)
  if type(v) ~= 'number' or v ~= v or v <= 0 or v > MAX_AMOUNT or v ~= math.floor(v) then return nil end
  return math.floor(v)
end

--- A short note, or nil.
local function noteOf(v)
  if type(v) ~= 'string' or v == '' then return nil end
  return v:sub(1, 60)
end

--- Take `amount` from one account and put it in another, all or nothing: if the second half fails
--- (a framework that refuses, a recipient who left), the first is undone.
local function move(fromSrc, fromAccount, toSrc, toAccount, amount, why)
  if not change(fromSrc, fromAccount, -amount, why) then return false end
  if toSrc ~= fromSrc and not GetPlayerName(toSrc) then -- left between the checks and now
    change(fromSrc, fromAccount, amount, why .. ' (refund)')
    return false
  end
  if not change(toSrc, toAccount, amount, why) then
    change(fromSrc, fromAccount, amount, why .. ' (refund)')
    return false
  end
  return true
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
  if not move(src, 'cash', src, data.account, amount, 'bank deposit') then return { ok = false, error = "The deposit didn't go through." } end
  log(src, data.account, 'deposit', 'Cash deposit', amount, noteOf(data.note))
  save()
  return { ok = true }
end

handlers.withdraw = function(src, data)
  local amount = amountOf(data.amount)
  if not amount then return { ok = false, error = 'Enter whole dollars above $0.' } end
  if data.account ~= 'checking' and data.account ~= 'savings' then return { ok = false, error = 'Unknown account.' } end
  if balance(src, data.account) < amount then return { ok = false, error = "There isn't that much in the account." } end
  if not move(src, data.account, src, 'cash', amount, 'bank withdrawal') then return { ok = false, error = "The withdrawal didn't go through." } end
  log(src, data.account, 'withdraw', 'Cash withdrawal', -amount, noteOf(data.note))
  save()
  return { ok = true }
end

handlers.transfer = function(src, data)
  local amount = amountOf(data.amount)
  if not amount then return { ok = false, error = 'Enter whole dollars above $0.' } end
  if data.atm then return { ok = false, error = "ATMs can't send transfers." } end
  if data.account ~= 'checking' and data.account ~= 'savings' then return { ok = false, error = 'Unknown account.' } end
  local note = noteOf(data.note)
  -- to: a server ID or the "LS-000012" number the page shows; your own other account with "savings"
  local to = (type(data.to) == 'string' or type(data.to) == 'number') and tostring(data.to):gsub('%s', '') or ''
  local target = tonumber(to:match('^LS%-(%d+)$') or to:match('^%d+$') or '')
  if to:lower() == 'savings' then
    local from, into = data.account, data.account == 'savings' and 'checking' or 'savings'
    if balance(src, from) < amount then return { ok = false, error = "There isn't that much in the account." } end
    if not move(src, from, src, into, amount, 'own transfer') then return { ok = false, error = "The transfer didn't go through." } end
    log(src, from, 'transfer', ('To %s'):format(into == 'savings' and 'Savings' or 'Checking'), -amount, note)
    log(src, into, 'transfer', ('From %s'):format(from == 'savings' and 'Savings' or 'Checking'), amount, note)
    save()
    return { ok = true }
  end
  if target == src then return { ok = false, error = "That's you. To move money between your accounts, send it to savings." } end
  if not target or not GetPlayerName(target) then return { ok = false, error = 'No one with that ID or account is online.' } end
  if balance(src, data.account) < amount then return { ok = false, error = "There isn't that much in the account." } end
  local them, me = GetPlayerName(target), GetPlayerName(src)
  if not move(src, data.account, target, 'checking', amount, 'transfer') then return { ok = false, error = "The transfer didn't go through. Nothing was taken." } end
  log(src, data.account, 'transfer', ('Transfer to %s'):format(them), -amount, note)
  log(target, 'checking', 'transfer', ('Transfer from %s'):format(me), amount, note)
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
