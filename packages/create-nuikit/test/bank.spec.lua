-- bank template, server: only real whole amounts, transfers all or nothing (refund on any failure), no transfers to yourself.
-- Run by bank.test.ts (test/harness.ts: check(), boot()).
local function P() end
json = { encode = function() return '{}' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
function SaveResourceFile() end
function GetPlayerIdentifierByType(src) return 'license:' .. src end
ONLINE = { [1] = 'Alex', [2] = 'Riley' }
function GetPlayerName(src) return ONLINE[src] end
local handler
function RegisterNetEvent(_, fn) handler = fn end
local last
function TriggerClientEvent(_, _, _, result) last = result end
assert(load(CONFIG, 'config.lua', 't'))()
assert(load(SERVER, 'server.lua', 't'))()
local function req(src, name, data) source = src; handler(1, name, data); return last end
local function bal(src) local b = req(src, 'open', { title = 'x' }).bank; return { cash = b.cash, checking = b.accounts[1].balance, savings = b.accounts[2].balance, tx = #b.transactions } end
local function same(a, b) return a.cash == b.cash and a.checking == b.checking and a.savings == b.savings and a.tx == b.tx end

-- 1. bad amounts
local bad = { -100, -1, 0, 0/0, 1/0, -1/0, 1e300, 1e10, 12.5, '100', '1e3', true, {} }
local names = { '-100', '-1', '0', 'NaN', 'inf', '-inf', '1e300', '1e10', '12.5', '"100"', '"1e3"', 'true', '{}' }
for i, amount in ipairs(bad) do
  for _, action in ipairs({ 'deposit', 'withdraw', 'transfer' }) do
    local before1, before2 = bal(1), bal(2)
    local r = req(1, action, { account = 'checking', amount = amount, to = '2' })
    check(r.ok == false and same(before1, bal(1)) and same(before2, bal(2)), action .. ' ' .. names[i] .. ' refused, nothing moved (' .. tostring(r.error) .. ')')
  end
end
-- a negative transfer would pay the sender: confirm the sender's money is unchanged
local b = bal(1)
req(1, 'transfer', { account = 'checking', amount = -5000, to = '2' })
check(bal(1).checking == b.checking, 'negative transfer did not pay the sender')

-- 2a. transfer to yourself by server ID / LS number
local before = bal(1)
local r = req(1, 'transfer', { account = 'checking', amount = 10, to = '1' })
check(not r.ok and same(before, bal(1)), 'transfer to yourself by ID refused (' .. tostring(r.error) .. ')')
r = req(1, 'transfer', { account = 'checking', amount = 10, to = 'LS-000001' })
check(not r.ok and same(before, bal(1)), 'transfer to yourself by LS number refused')

-- 2b. recipient leaves between the checks and the credit (GetPlayerName answers once, then nil)
local calls = 0
local real = GetPlayerName
GetPlayerName = function(src) if src == 2 then calls = calls + 1; if calls > 2 then return nil end end return real(src) end
local s1, s2 = bal(1), bal(2)
r = req(1, 'transfer', { account = 'checking', amount = 100, to = '2' })
GetPlayerName = real
check(not r.ok and same(s1, bal(1)) and same(s2, bal(2)), 'recipient left mid-transfer: refunded, both records unchanged (' .. tostring(r.error) .. ')')

-- 2c. Config.money refuses the credit: sender refunded through the framework
local fw = { [1] = { cash = 100, bank = 1000 }, [2] = { cash = 0, bank = 0 } }
Config.money = {
  get = function(src, a) return fw[src][a] end,
  add = function(src, a, n) if src == 2 then return false end fw[src][a] = fw[src][a] + n return true end,
  remove = function(src, a, n) fw[src][a] = fw[src][a] - n return true end,
}
r = req(1, 'transfer', { account = 'checking', amount = 300, to = '2' })
check(not r.ok and fw[1].bank == 1000 and fw[2].bank == 0, 'framework refused the credit: sender refunded (bank ' .. fw[1].bank .. ')')
-- and a deposit whose credit fails gives the cash back
Config.money.add = function(src, a, n) if a == 'bank' then return false end fw[src][a] = fw[src][a] + n return true end
r = req(1, 'deposit', { account = 'checking', amount = 50 })
check(not r.ok and fw[1].cash == 100 and fw[1].bank == 1000, 'deposit credit refused: cash refunded (cash ' .. fw[1].cash .. ')')
Config.money = nil

-- 2d. a good transfer still works and both sides log it
s1, s2 = bal(1), bal(2)
r = req(1, 'transfer', { account = 'checking', amount = 250, to = 'LS-000002', note = string.rep('x', 200) })
local a, z = bal(1), bal(2)
check(r.ok and a.checking == s1.checking - 250 and z.checking == s2.checking + 250 and a.tx == s1.tx + 1 and z.tx == s2.tx + 1, 'good transfer moves 250 and logs both sides')
local note = req(2, 'open', { title = 'x' }).bank.transactions[1].note
check(#note == 60, 'note trimmed to 60 characters')

