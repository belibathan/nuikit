-- job-menu template, server: every boss action checked against the caller's own job and grade; bad ids, grades and players refused; duty and actions gated; E-ids, never licenses.
-- Run by job-menu.test.ts (test/harness.ts: check(), boot()).
local function P() end
local store = nil
json = { encode = function(t) store = t return 'x' end, decode = function() return store or {} end }
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return store and 'x' or nil end -- the file exists once something was saved
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
-- players: 1 Alex, 2 Riley, 3 Sam, 4 Casey (next to Alex), 5 Morgan (far), 6 Jo, 7 Pat, 8 Lee
NAMES = { 'Alex', 'Riley', 'Sam', 'Casey', 'Morgan', 'Jo', 'Pat', 'Lee' }
POS = { {0,0,0}, {1,0,0}, {2,0,0}, {2,2,0}, {500,0,0}, {3,0,0}, {1,1,0}, {0,1,0} }
ONLINE = { true, true, true, true, true, true, true, true }
function GetPlayers() local t = {} for i = 1, #NAMES do if ONLINE[i] then t[#t+1] = tostring(i) end end return t end
function GetPlayerName(s) return type(s) == 'number' and ONLINE[s] and NAMES[s] or nil end
function GetPlayerIdentifierByType(s) return ONLINE[s] and ('license:' .. s) or nil end
function GetPlayerPed(s) return ONLINE[s] and 1000 + s or 0 end
function GetEntityCoords(p) local c = POS[p - 1000] return { x = c[1], y = c[2], z = c[3] } end
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
local function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  Config.sync = function(src, job, grade, onDuty) synced[#synced+1] = { src = src, job = job, grade = grade, onDuty = onDuty } end
  assert(load(SERVER, 'server.lua', 't'))()
end
boot()
local function req(src, name, data) clock = clock + 150; source = src; handler(1, name, data); return last end
local function open(src) return req(src, 'open') end
local function staff(src) local r = open(src); local by = {} for _, e in ipairs(r.data.boss.employees) do by[e.name] = e end return by, r.data end
local function members() local n = 0 for _ in pairs(store and store.members or {}) do n = n + 1 end return n end
local function snapshot() local t = {} for k, m in pairs(store.members) do t[k] = m.job .. ':' .. m.grade .. ':' .. tostring(m.onDuty) end return t end
local function same(a, b) for k, v in pairs(a) do if b[k] ~= v then return false end end for k in pairs(b) do if a[k] == nil then return false end end return true end

-- set up from the console: Alex chief, Riley lieutenant, Sam officer, Jo owns Benny's, Pat a second police chief, Lee a cadet
commands.demo_setjob(0, { '1', 'police', '4' })
commands.demo_setjob(0, { '2', 'police', '3' })
commands.demo_setjob(0, { '3', 'police', '1' })
commands.demo_setjob(0, { '6', 'mechanic', '2' })
commands.demo_setjob(0, { '7', 'police', '4' })
commands.demo_setjob(0, { '8', 'police', '0' })
commands.demo_setjob(0, { '3.5', 'police', '4' }) -- a native would read 3.5 as player 3 (atoi)
check(store.members['license:3'].grade == 1, 'setjob "3.5": refused, player 3 keeps grade 1 (ids are whole numbers)')
check(members() == 6, 'setjob from the console: 6 members')
commands.demo_setjob(0, { '4', 'police', '9' })
check(members() == 6, 'setjob with a grade that does not exist: refused')

-- open
local r = open(4)
check(not r.ok and r.error == "You don't have a job.", 'open without a job: "' .. tostring(r.error) .. '"')
r = open(3)
check(r.ok and r.data.boss == nil and r.data.job.label == 'LSPD' and r.data.job.gradeLabel == 'Officer', 'an officer gets no Staff data')
local ids = {} for _, a in ipairs(r.data.actions) do ids[a.id] = true end
check(ids.armory, 'officer (grade 1) sees the armory (minGrade 1)')
r = open(8); ids = {} for _, a in ipairs(r.data.actions) do ids[a.id] = true end
check(not ids.armory and ids.locker, 'cadet (grade 0) does not see the armory')
local by, data = staff(1)
check(data.boss and by.Riley and by.Sam and by.Lee and by.Pat and not by.Jo, "the chief sees the police staff, not Benny's")
local leaked = false
for _, e in pairs(by) do if tostring(e.id):find('license') then leaked = true end end
check(not leaked and by.Riley.id:match('^E%d%d%d%d%d$'), 'employees are named by E-ids, never by license (' .. by.Riley.id .. ')')
check(by.Alex.you == true, 'the chief is marked as you')
local near = {} for _, p in ipairs(data.boss.nearby) do near[p.name] = true end
check(near.Casey and not near.Morgan and not near.Riley and near.Jo, "nearby: Casey and Jo (another job), not Morgan (far) or Riley (already here)")
check(data.boss.balance == 250000, 'the job balance is shown to the boss')

-- non-bosses can't do boss things, whatever the page sends
local before = snapshot()
for _, s in ipairs({ 2, 3, 8 }) do
  for _, a in ipairs({ { 'hire', { player = 4, boss = true } }, { 'fire', { id = by.Sam.id, boss = true } }, { 'grade', { id = by.Sam.id, grade = 2, boss = true } } }) do
    r = req(s, a[1], a[2])
    check(not r.ok and r.error == 'Only the boss can do that.', NAMES[s] .. ' (not boss) ' .. a[1] .. ': refused')
  end
end
r = req(4, 'fire', { id = by.Sam.id })
check(not r.ok and r.error == "You don't have a job.", 'someone without a job firing: refused')
check(same(before, snapshot()), 'nothing changed')

-- the boss of another job can't touch this one
r = req(6, 'fire', { id = by.Sam.id })
check(not r.ok and r.error == "They don't work here.", "Benny's owner firing an officer: refused")
r = req(6, 'grade', { id = by.Sam.id, grade = 0 })
check(not r.ok, "Benny's owner regrading an officer: refused")
check(same(before, snapshot()), 'nothing changed')

-- fire and grade: who
r = req(1, 'fire', { id = by.Alex.id })
check(not r.ok, "the chief firing themself: refused (" .. tostring(r.error) .. ')')
r = req(1, 'fire', { id = by.Pat.id })
check(not r.ok and r.error:find('boss'), "firing the other chief: refused (" .. tostring(r.error) .. ')')
r = req(1, 'grade', { id = by.Pat.id, grade = 0 })
check(not r.ok, 'demoting the other chief: refused')
r = req(1, 'grade', { id = by.Alex.id, grade = 0 })
check(not r.ok, 'regrading yourself: refused')
for _, bad in ipairs({ { 'a table', {} }, { 'a number', 12 }, { 'too long', string.rep('E', 40) }, { 'unknown', 'E99999' }, { 'nil', nil } }) do
  r = req(1, 'fire', { id = bad[2] })
  check(not r.ok, 'fire with id ' .. bad[1] .. ': refused')
end
check(same(before, snapshot()), 'nothing changed')

-- grade: what
for _, bad in ipairs({ { '99', 99 }, { '-1', -1 }, { '1.5', 1.5 }, { '"2"', '2' }, { 'a table', {} }, { 'nil', nil }, { 'NaN', 0/0 }, { 'the boss grade 4', 4 } }) do
  r = req(1, 'grade', { id = by.Sam.id, grade = bad[2] })
  check(not r.ok, 'grade ' .. bad[1] .. ': refused (' .. tostring(r.error) .. ')')
end
check(same(before, snapshot()), 'nothing changed')
synced = {}
r = req(1, 'grade', { id = by.Sam.id, grade = 2 })
check(r.ok and staff(1).Sam.grade == 2, 'promote Sam to Sergeant')
check(synced[1] and synced[1].src == 3 and synced[1].job == 'police' and synced[1].grade == 2, 'Config.sync told about Sam (src 3, police, 2)')

-- hire
for _, bad in ipairs({ { 'a string', '4' }, { 'a table', {} }, { '4.5', 4.5 }, { 'offline 99', 99 }, { 'yourself', 1 }, { 'Morgan (far)', 5 }, { 'Riley (works here)', 2 } }) do
  r = req(1, 'hire', { player = bad[2] })
  check(not r.ok, 'hire ' .. bad[1] .. ': refused (' .. tostring(r.error) .. ')')
end
check(members() == 6, 'nobody hired')
synced = {}
r = req(1, 'hire', { player = 4 })
by = staff(1)
check(r.ok and by.Casey and by.Casey.grade == 0, 'hire Casey (next to you): a Cadet')
check(synced[1] and synced[1].src == 4 and synced[1].grade == 0, 'Config.sync told about Casey')
r = req(1, 'hire', { player = 4 })
check(not r.ok and r.error == 'They already work here.', 'hire Casey again: refused')
r = req(1, 'hire', { player = 6 })
check(r.ok and staff(1).Jo and open(6).data.job.name == 'police', "hire Jo from Benny's: they move to police")
r = req(6, 'fire', { id = by.Casey.id })
check(not r.ok and r.error == 'Only the boss can do that.', 'Jo, now a police cadet, has lost the boss powers')

-- fire
synced = {}
r = req(1, 'fire', { id = by.Sam.id })
check(r.ok and staff(1).Sam == nil and open(3).ok == false, 'fire Sam: gone, and Sam has no job')
check(synced[1] and synced[1].src == 3 and synced[1].job == nil, 'Config.sync told Sam is jobless')
r = req(3, 'duty', { onDuty = true })
check(not r.ok, 'fired Sam going on duty: refused')
r = req(1, 'fire', { id = by.Sam.id })
check(not r.ok, 'fire Sam again: refused')

-- duty and actions
for _, bad in ipairs({ { '"true"', 'true' }, { '1', 1 }, { 'nil', nil } }) do
  r = req(2, 'duty', { onDuty = bad[2] })
  check(not r.ok, 'duty ' .. bad[1] .. ': refused')
end
req(2, 'duty', { onDuty = false })
r = req(2, 'action', { id = 'armory' })
check(not r.ok and r.error == 'Go on duty first.', 'on-duty action while off duty: refused')
r = req(2, 'action', { id = 'locker' })
check(r.ok and events[#events][2] == 2 and events[#events][4] == 'locker', 'off-duty action allowed; server event demo:action (2, police, locker)')
req(2, 'duty', { onDuty = true })
check(open(2).data.job.onDuty == true, 'Riley on duty')
r = req(2, 'action', { id = 'armory' })
check(r.ok and r.job == 'police', 'armory on duty: allowed')
r = req(8, 'action', { id = 'armory' })
check(not r.ok and r.error == "You can't do that.", 'cadet asking for the armory (minGrade 1) by id: refused')
r = req(2, 'action', { id = 'repair' })
check(not r.ok, "Riley asking for Benny's repair action: refused")
r = req(2, 'action', { id = {} })
check(not r.ok, 'action id a table: refused')
r = req(2, 'bogus', {})
check(r.ok == false, 'unknown request: refused')

-- the staff list: offline members, duty only shown when online
ONLINE[2] = false
by = staff(1)
check(by.Riley and by.Riley.online == false and by.Riley.onDuty == false, 'Riley offline: listed as offline, not on duty')
ONLINE[2] = true

-- OneSync off: a warning at start, nobody nearby, hiring refused, the rest works
ONESYNC_CONVAR = 'off'
PRINTED = {}
boot()
check(PRINTED[1] and PRINTED[1]:find('OneSync is off', 1, true), 'OneSync off: warning at start')
r = open(1)
check(r.ok and #r.data.boss.nearby == 0 and r.data.boss.employees[1] ~= nil, 'OneSync off: the records came back, nobody nearby')
r = req(1, 'hire', { player = 4 })
check(not r.ok and r.error == 'Hiring needs OneSync on the server.', 'OneSync off: hiring refused (' .. tostring(r.error) .. ')')
r = req(2, 'action', { id = 'armory' })
check(r.ok, 'OneSync off: actions still work')

-- rate limit: a client spamming an action (each one is announced, and may spawn a car)
clock = clock + 5000
local refused, ev = 0, #events
for _ = 1, 30 do source = 2; handler(1, 'action', { id = 'armory' }); if last.error == 'Not so fast.' then refused = refused + 1 end end
check(refused == 20 and #events == ev + 10, '30 actions in the same instant: 10 announced, 20 refused (' .. refused .. ')')
clock = clock + 1000
check(req(2, 'action', { id = 'armory' }).ok, 'a second later: actions go through again')
