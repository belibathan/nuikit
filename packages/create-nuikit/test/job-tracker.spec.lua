-- job-tracker template, server: unknown jobs, job and grade (fails closed), presence at the start and at each step, the order of steps, counted steps, items held and taken, pay once (also under a double request and a yielding payment), a failed payment undone, abandon, rate limit, one at a time, OneSync.
-- Run by job-tracker.test.ts (test/harness.ts: check(), boot()).
json = { encode = function() return 'x' end, decode = function() return {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
SAVES = 0
function SaveResourceFile() SAVES = SAVES + 1 end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
START = vector3(-1081.0, -2243.0, 13.2)
COLLECT = vector3(-1085.5, -2250.0, 13.2)
DELIVER = vector3(-47.0, -1757.0, 29.4)
NOWHERE = vector3(400, 400, 30)
POS = { [1] = START, [2] = START, [3] = NOWHERE }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
NOW = 100000
function GetGameTimer() return NOW end
function Wait() coroutine.yield() end
local handler, dropped
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn end end
local answers = {}
function TriggerClientEvent(_, _, id, result) answers[id] = result end
boot()
local seq = 0
local function start(src, name, data)
  seq = seq + 1
  local id = seq
  local co = coroutine.create(function() source = src; handler(id, name, data) end)
  assert(coroutine.resume(co))
  return function() while coroutine.status(co) ~= 'dead' do assert(coroutine.resume(co)) end return answers[id] end
end
-- Each call is a second later than the last, so the rate limit only bites where a check asks it to.
local function req(src, name, data) NOW = NOW + 1000; return start(src, name, data)() end
local function take(src, id) return req(src, 'start', { job = id or 'parcels' }) end
local function step(src, id) return req(src, 'step', { step = id }) end
local function state(src) return req(src, 'state', {}) end
local function at(src, pos) POS[src] = pos end

-- start
local r = req(1, 'start', { job = 'nowhere' }); check(not r.ok and r.error == 'Unknown job.', 'start an unknown job: refused')
r = req(1, 'start', { job = {} }); check(not r.ok, 'start with a table for the job id: refused')
r = req(1, 'start', {}); check(not r.ok, 'start with no job id: refused')
r = req(3, 'start', { job = 'parcels' }); check(not r.ok and r.error == "You're not at the start of this job.", 'start from across the map: refused')
r = req(1, 'nope', {}); check(not r.ok, 'an unknown request name: refused')
r = req(1, 'step', { step = 'collect' }); check(not r.ok and r.error == "You don't have a job.", 'report a step with no job: refused')
r = req(1, 'abandon', {}); check(not r.ok, 'abandon with no job: refused')
check(state(1).job == nil, 'no job: state is empty')

-- the job and grade it asks for: fails closed
local parcels = Config.jobs.parcels
parcels.job, parcels.grade = 'courier', 1
r = take(1); check(not r.ok and r.error == "You can't take this job.", 'a job that needs a framework job, with no Config.player: refused (fails closed)')
Config.player = function() return { job = 'police', grade = 3 } end
r = take(1); check(not r.ok, 'the wrong job: refused')
Config.player = function() return { job = 'courier', grade = 0 } end
r = take(1); check(not r.ok, 'the right job, too low a grade: refused')
Config.player = function() error('framework exploded') end
r = take(1); check(not r.ok, 'the framework throws: refused')
Config.player = function() return { job = 'courier', grade = 1 } end
r = take(3); check(not r.ok, 'the right job and grade but away from the start: refused')
r = take(1)
check(r.ok and r.id == 'parcels' and r.job.title == 'Parcel run' and r.job.current == 0 and r.job.pay == 850 and #r.job.steps == 2, 'the right job and grade at the start: job taken (title, pay, 2 steps, current 0)')
check(r.job.steps[1].coords == nil and r.job.steps[1].item == nil and r.job.steps[1].count == 3, 'the page gets no coordinates and no item rules')
r = take(1); check(not r.ok and r.error == 'You already have a job. Abandon it first.', 'a second job while on one: refused')

-- abandon and start again
r = req(1, 'abandon', {}); check(r.ok and r.job == nil and state(1).job == nil, 'abandon: the job is gone')
r = req(1, 'abandon', {}); check(not r.ok, 'abandon twice: the second is refused')
r = step(1, 'collect'); check(not r.ok, 'a step after abandoning: refused')
parcels.job, parcels.grade = nil, nil
Config.player = nil
r = take(1); check(r.ok, 'with no job required: taken again')

-- order and presence
at(1, START)
r = step(1, 'collect'); check(not r.ok and r.error == "You're not at the right place for this step.", 'the first step from the start (not at its place): refused')
at(1, COLLECT)
r = step(1, 'deliver'); check(not r.ok and r.error == "That's not your current step.", 'the second step first (wrong order): refused')
r = step(1, 'nope'); check(not r.ok, 'an unknown step id: refused')
r = req(1, 'step', { step = {} }); check(not r.ok, 'a step id that is a table: refused')
r = req(1, 'step', {}); check(not r.ok, 'no step id: refused')
r = req(1, 'step', { step = 'collect', count = 99, pay = 99999 }); check(r.ok and r.job.progress == 1, 'extra fields from the page (a count, a pay) are ignored: one report counted')
r = step(1, 'collect'); check(r.ok and r.job.progress == 2 and r.job.current == 0, 'the second report: 2 of 3')
at(1, NOWHERE)
r = step(1, 'collect'); check(not r.ok and state(1).job.progress == 2, 'the third report from far away: refused, still 2')
at(1, COLLECT)
r = step(1, 'collect'); check(r.ok and r.job.current == 1 and r.job.progress == 0, 'the third report: the step completes, on to delivering')
r = step(1, 'collect'); check(not r.ok and r.error == "That's not your current step.", 'a done step again: refused')

-- items: held, taken when the step completes
at(1, COLLECT)
r = step(1, 'deliver'); check(not r.ok and r.error == "You're not at the right place for this step.", 'deliver from the collect point: refused')
at(1, DELIVER)

-- pay: once, and a failed payment undone (with a framework)
local fw = { cash = 0, bag = { parcel = 3 }, paid = 0 }
Config.money = { add = function(src, n) fw.cash = fw.cash + n fw.paid = fw.paid + 1 return true end }
Config.items = {
  count = function(src, name) return fw.bag[name] or 0 end,
  remove = function(src, name, n) fw.bag[name] = (fw.bag[name] or 0) - n return true end,
  add = function(src, name, n) fw.bag[name] = (fw.bag[name] or 0) + n return true end,
}
fw.bag.parcel = 2
r = step(1, 'deliver'); check(not r.ok and fw.cash == 0 and fw.bag.parcel == 2 and state(1).job.current == 1, 'deliver holding 2 of 3 parcels: refused, nothing taken, nothing paid')
fw.bag.parcel = 3
Config.money.add = function() return false end
r = step(1, 'deliver')
check(not r.ok and fw.cash == 0 and fw.bag.parcel == 3 and state(1).job.current == 1 and state(1).job.progress == 0, 'the framework refuses the pay: parcels given back, still on the last step')
Config.money.add = function() error('money exploded') end
r = step(1, 'deliver'); check(not r.ok and fw.cash == 0 and fw.bag.parcel == 3 and state(1).job ~= nil, 'the framework throws on the pay: parcels given back, job kept')
Config.items.remove = function() return false end
r = step(1, 'deliver'); check(not r.ok and fw.cash == 0 and state(1).job ~= nil, 'the inventory refuses to take the parcels: no pay, job kept')
Config.items.remove = function(src, name, n) fw.bag[name] = (fw.bag[name] or 0) - n return true end
Config.money.add = function(src, n) fw.cash = fw.cash + n fw.paid = fw.paid + 1 return true end
r = step(1, 'deliver')
check(r.ok and r.completed and r.pay == 850 and r.job == nil and fw.cash == 850 and fw.paid == 1 and fw.bag.parcel == 0, 'the last step: paid 850 once, parcels taken, job cleared')
r = step(1, 'deliver'); check(not r.ok and fw.paid == 1 and fw.cash == 850, 'a second report after completing: refused, not paid twice')

-- double completion under a yielding payment: the second request arrives while the first is being paid
fw.bag.parcel = 3
at(1, START); take(1); at(1, COLLECT)
step(1, 'collect'); step(1, 'collect'); step(1, 'collect')
at(1, DELIVER)
local realAdd = Config.money.add
Config.money.add = function(src, n) Wait(); return realAdd(src, n) end
NOW = NOW + 5000
local a = start(1, 'step', { step = 'deliver' })
NOW = NOW + 5000
local b = start(1, 'step', { step = 'deliver' })()
local ra = a()
check(ra.ok and ra.completed and not b.ok and fw.paid == 2 and fw.cash == 1700, 'two completions at once: the second is refused, paid once more only (' .. tostring(b.error) .. ')')
Config.money.add = realAdd

-- rate limit: two requests inside minInterval
at(1, START)
NOW = NOW + 5000
answers = {}
local first = start(1, 'start', { job = 'parcels' })()
NOW = NOW + 100
local second = start(1, 'abandon', {})()
check(first.ok and not second.ok and second.error == 'Slow down.', 'a second request 100 ms later: refused (Slow down.)')
NOW = NOW + 1000
check(start(1, 'abandon', {})().ok, 'and after the interval it goes through')

-- steps without a place the player is at: someone else is not affected
at(2, START)
r = take(2); check(r.ok, 'player 2 takes the job independently')
r = step(2, 'collect'); check(not r.ok, 'player 2 is not at the collect point: refused')
check(state(1).job == nil and state(2).job ~= nil, "players' progress is separate")

-- a player who leaves loses the job
source = 2; dropped(); source = nil
check(state(2).job == nil, 'a player who drops: the job is gone')

-- the page's own idea of the pay or the job never reaches the server's decision
r = req(1, 'start', { job = 'parcels', pay = 1e9, steps = {} }); check(r.ok and r.job.pay == 850, 'start with a pay and steps from the page: the server\'s 850 stands')

-- OneSync off
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true) ~= nil, 'OneSync off: red error at start')
r = req(1, 'start', { job = 'parcels' })
check(not r.ok and r.error == 'This needs OneSync on the server.', 'OneSync off: refused')
