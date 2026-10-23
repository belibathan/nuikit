-- job-sheet template, server: the pages are built from the caller's own job and grade; every row is
-- checked against the config (page, grade, duty, disabled), sub-page rows are never actions, duty is
-- typed, one request at a time, and nothing but the job reaches the page.
-- Run by job-sheet.test.ts (test/harness.ts: check(), boot()).
local store = nil
json = { encode = function(t) store = t return 'x' end, decode = function() return store or {} end }
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
function GetConvar(_, d) return d end
NAMES = { 'Alex', 'Riley', 'Sam', 'Casey' }
function GetPlayerName(s) return type(s) == 'number' and NAMES[s] or nil end
function GetPlayerIdentifierByType(s) return NAMES[s] and ('license:' .. s) or nil end
local events = {}
function TriggerEvent(...) events[#events+1] = { ... } end
function AddEventHandler() end
local clock = 0
function GetGameTimer() return clock end
local synced = {}
local handler, commands = nil, {}
function RegisterNetEvent(_, fn) handler = fn end
function RegisterCommand(name, fn) commands[name] = fn end
local last
function TriggerClientEvent(_, _, _, result) last = result end
boot()
Config.sync = function(src, job, grade, onDuty) synced[#synced+1] = { src = src, job = job, grade = grade, onDuty = onDuty } end
local function req(src, name, data) clock = clock + 150; source = src; handler(1, name, data); return last end
local function open(src) return req(src, 'open') end
local function pageOf(data, id) for _, p in ipairs(data.pages) do if p.id == id then return p end end end
local function rowIds(p) local t = {} for _, s in ipairs(p.sections) do for _, r in ipairs(s.rows) do t[r.id] = r end end return t end

-- from the console: Alex an officer, Riley a sergeant, Sam a cadet; Casey has no job
commands.demo_setjob(0, { '1', 'police', '1' })
commands.demo_setjob(0, { '2', 'police', '2' })
commands.demo_setjob(0, { '3', 'police', '0' })
commands.demo_setjob(0, { '4', 'police', '9' })
check(store.members['license:1'] and store.members['license:2'] and store.members['license:3'] and not store.members['license:4'], 'setjob from the console: three members; a grade that does not exist is refused')
check(#synced == 3 and synced[1].src == 1 and synced[1].job == 'police', 'setjob syncs the framework for that player')

-- open: the pages are built per grade
local r = open(4)
check(not r.ok and r.error == "You don't have a job.", 'open without a job: "' .. tostring(r.error) .. '"')
r = open(1)
check(r.ok and r.data.job.label == 'LSPD' and r.data.job.gradeLabel == 'Officer' and r.data.job.onDuty == false and r.data.side == 'right', 'an officer gets the job, grade label, duty and side')
check(r.data.pages[1].id == 'root' and pageOf(r.data, 'armory') and pageOf(r.data, 'records'), 'root first, then every other page')
local root = rowIds(r.data.pages[1])
check(root.armory and root.armory.page == 'armory' and root.billing and root.locker, 'the officer sees the armory (minGrade 1) and billing (minGrade 1)')
check(r.data.pages[1].actions[1].id == 'clockout' and r.data.pages[1].actions[1].primary == true, 'the actions row carries the primary')
local armory = rowIds(pageOf(r.data, 'armory'))
check(armory.pistol and not armory.carbine, 'the officer does not see the carbine (minGrade 2)')
r = open(3)
root = rowIds(r.data.pages[1])
check(not root.armory and not root.billing and root.locker and root.garage, 'a cadet (grade 0) sees neither the armory nor billing')
check(not pageOf(r.data, 'armory') and pageOf(r.data, 'records'), 'a cadet is not sent the armory page (its only way in is above their grade)')
r = open(2)
check(rowIds(pageOf(r.data, 'armory')).carbine ~= nil, 'a sergeant sees the carbine')
local leaked = false
local function walk(t) for k, v in pairs(t) do if type(v) == 'table' then walk(v) elseif type(v) == 'string' and (v:find('license') or k == 'name' and v == 'Riley') then leaked = true end end end
walk(r.data)
check(not leaked, 'no license or player name reaches the page')
for _, p in ipairs(r.data.pages) do for _, s in ipairs(p.sections) do check(#s.rows > 0, 'no empty section is sent (' .. p.id .. '/' .. s.id .. ')') end end

-- duty: typed
r = req(1, 'duty', { onDuty = 'yes' })
check(not r.ok and r.error == 'On or off?', 'duty with a string: refused')
r = req(4, 'duty', { onDuty = true })
check(not r.ok and r.error == "You don't have a job.", 'duty without a job: refused')
local n = #synced
r = req(1, 'duty', { onDuty = true })
check(r.ok and store.members['license:1'].onDuty == true and #synced == n + 1 and synced[#synced].onDuty == true, 'duty on: saved and synced')
check(open(1).data.job.onDuty == true, 'the next snapshot says on duty')

-- rows: checked against the config, never the page
local ev = #events
r = req(3, 'row', { page = 'root', id = 'garage' })
check(not r.ok and r.error == 'Go on duty first.', 'an on-duty-only row off duty: refused')
r = req(1, 'row', { page = 'root', id = 'garage' })
check(r.ok and r.job == 'police' and not r.stay and #events == ev + 1 and events[#events][1] == 'demo:action' and events[#events][2] == 1 and events[#events][4] == 'garage', 'an allowed row fires demo:action with src, job, id')
r = req(1, 'row', { page = 'root', id = 'armory' })
check(not r.ok and r.error == "You can't do that.", 'a sub-page row is never an action')
r = req(1, 'row', { page = 'armory', id = 'carbine' })
check(not r.ok and r.error == "You can't do that.", 'a row above your grade: refused even when the page sends it')
r = req(3, 'row', { page = 'armory', id = 'pistol' })
check(not r.ok and r.error == "You can't do that.", 'a cadet asking for a row on the armory page (no minGrade of its own): refused, the way in is above their grade')
r = req(2, 'row', { page = 'armory', id = 'carbine' })
check(not r.ok and r.error == 'Go on duty first.', 'a sergeant off duty on the armory page (its way in is on-duty only): refused')
req(2, 'duty', { onDuty = true })
r = req(2, 'row', { page = 'armory', id = 'carbine' })
check(r.ok, 'the same row for a sergeant on duty: allowed')
req(2, 'duty', { onDuty = false })
r = req(1, 'row', { page = 'root', id = 'pistol' })
check(not r.ok, 'a row from another page: refused')
r = req(1, 'row', { page = 'armory', id = 'takeall' })
check(r.ok and events[#events][4] == 'takeall', 'a page action: allowed and announced')
r = req(1, 'row', { page = 'nope', id = 'garage' })
check(not r.ok, 'a page that does not exist: refused')
r = req(1, 'row', { page = 1, id = { 'garage' } })
check(not r.ok, 'wrong types: refused')
r = req(1, 'row', { page = 'root', id = 'clockout' })
check(r.ok and r.stay == true and store.members['license:1'].onDuty == false, 'clockout: built in, changes duty, the sheet stays')
r = req(1, 'row', { page = 'root', id = 'clockout' })
check(not r.ok and r.error == 'Go on duty first.', 'clockout off duty: refused (on-duty only)')
r = req(4, 'row', { page = 'root', id = 'garage' })
check(not r.ok and r.error == "You don't have a job.", 'a row without a job: refused')
r = req(1, 'nope', {})
check(r.ok == false, 'an unknown request is refused')

-- one at a time: a handler that re-enters is refused
local inner
local real = TriggerEvent
TriggerEvent = function(...)
  if select(1, ...) == 'demo:action' and not inner then
    inner = true
    local before = last
    source = 1; handler(2, 'row', { page = 'root', id = 'locker' })
    inner = last
    last = before
  end
  real(...)
end
r = req(1, 'row', { page = 'root', id = 'locker' })
check(r.ok and type(inner) == 'table' and inner.ok == false and inner.error == 'One thing at a time.', 'a second request while one runs: refused')
TriggerEvent = real
r = req(1, 'row', { page = 'root', id = 'locker' })
check(r.ok, 'and the player is free again after it')

-- rate limit: a client spamming the event (each duty change saves and syncs)
clock = clock + 5000
local refused, n0 = 0, #synced
for _ = 1, 30 do source = 1; handler(1, 'duty', { onDuty = true }); if last.error == 'Not so fast.' then refused = refused + 1 end end
check(refused == 20 and #synced == n0 + 10, '30 requests in the same instant: 10 go through, 20 refused (' .. refused .. ')')
clock = clock + 1000
r = req(1, 'open')
check(r.ok, 'a second later: requests go through again')
