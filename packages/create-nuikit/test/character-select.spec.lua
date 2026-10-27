-- character-select template, server: play only your own characters at the server's own spawn points, create (names, ages, genders, slots, rate), delete (own, not while playing), last locations from the server's view, OneSync, other multicharacter warned.
-- Run by character-select.test.ts (test/harness.ts: check(), boot()).
local function P() end
local store
json = { encode = function(t) store = t return 'x' end, decode = function() return store or {} end }
function vector3(x, y, z) return { x = x, y = y, z = z } end
function vector4(x, y, z, w) return { x = x, y = y, z = z, w = w } end
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return store and 'x' or nil end -- the file exists once something was saved
function SaveResourceFile() end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
ONESYNC_CONVAR = 'on'
function GetConvar(k, d) if k == 'onesync' then return ONESYNC_CONVAR end return d end
STARTED = {}
function GetResourceState(n) return STARTED[n] and 'started' or 'missing' end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
POS = { [1] = vector3(100, 200, 30), [2] = vector3(0, 0, 0) }
function GetPlayerPed(s) return POS[s] and 1000 + s or 0 end
function GetEntityCoords(p) return POS[p - 1000] end
function GetEntityHeading() return 90.0 end
function CreateThread() end
local clock = 0
function GetGameTimer() return clock end
local handler, onStart, dropped
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'onResourceStart' then onStart = fn elseif name == 'playerDropped' then dropped = fn end end
local last
function TriggerClientEvent(_, _, _, result) last = result end
local function boot()
  assert(load(CONFIG, 'config.lua', 't'))()
  assert(load(SERVER, 'server.lua', 't'))()
end
boot()
check(#PRINTED == 0, 'OneSync on, no other multicharacter: nothing printed at start')
local function req(src, name, data) clock = clock + 150; source = src; handler(1, name, data); return last end
local function open(src) return req(src, 'open').data end
local function create(src, t) return req(src, 'create', t) end
local function aged(years) local now = os.date('!*t') return ('%04d-%02d-%02d'):format(now.year - years, now.month, now.day) end
local good = { firstName = 'Alex', lastName = 'Moreno', birthdate = '1994-03-12', gender = 'Male' }
local function with(k, v) local t = {} for a, b in pairs(good) do t[a] = b end t[k] = v return t end

-- a new player
local d = open(1)
check(#d.characters == 0 and d.title == 'Welcome' and d.slots == 3 and d.canCreate and #d.spawns == 4, 'a new player: no characters, 3 slots, 4 spawn points (no "last")')

-- create: what's refused
local bad = {
  { 'an empty first name', with('firstName', '') }, { 'a one-letter name', with('firstName', 'A') },
  { 'a 21-letter name', with('lastName', string.rep('x', 21)) }, { 'digits in a name', with('lastName', 'R0b0t') },
  { 'a name starting with a hyphen', with('firstName', '-Al') }, { 'a name that is spaces', with('firstName', '   ') },
  { 'a name that is a table', with('firstName', {}) }, { 'a 17-year-old', with('birthdate', aged(17)) },
  { 'a 101-year-old', with('birthdate', aged(101)) }, { '31 February', with('birthdate', '1994-02-31') },
  { 'a date in another format', with('birthdate', '12/03/1994') }, { 'a date that is a table', with('birthdate', {}) },
  { 'a gender not on the list', with('gender', 'Robot') }, { 'no gender', with('gender', nil) },
}
for _, b in ipairs(bad) do
  local r = create(1, b[2])
  check(not r.ok and #open(1).characters == 0, 'create with ' .. b[1] .. ': refused (' .. tostring(r.error) .. ')')
end
-- what's taken
local r = create(1, good)
check(r.ok and r.id:match('^%u%u%u%d%d%d%d%d$') and #open(1).characters == 1, 'create Alex Moreno: id ' .. tostring(r.id))
local alex = r.id
r = create(1, with('firstName', 'Zoë'))
check(not r.ok and r.error == 'Not so fast.', 'a second create within 3 s: not so fast')
local t0 = os.time
os.time = function(x) if x then return t0(x) end return t0() + 10 end
r = create(1, { firstName = 'Zoë', lastName = "O'Brien-Díaz", birthdate = aged(18), gender = 'Female' })
check(r.ok, "Zoë O'Brien-Díaz, 18 today: taken (letters from any language)")
os.time = function(x) if x then return t0(x) end return t0() + 20 end
r = create(1, with('firstName', 'Sam'))
check(r.ok, 'a third character')
os.time = function(x) if x then return t0(x) end return t0() + 30 end
r = create(1, with('firstName', 'Lee'))
check(not r.ok and r.error == 'Every slot is taken.', 'a fourth: every slot is taken')
check(open(1).canCreate == false, 'and the page is told it cannot create')

-- play
r = req(2, 'play', { id = alex, spawn = 'legion' })
check(not r.ok and r.error == "That isn't one of your characters.", "player 2 playing player 1's character: refused")
r = req(1, 'play', { id = {}, spawn = 'legion' })
check(not r.ok, 'play with an id that is a table: refused')
r = req(1, 'play', { id = alex, spawn = 'vault' })
check(not r.ok and r.error == 'Pick where to start.', 'play at a spawn point that does not exist: refused')
r = req(1, 'play', { id = alex, spawn = { x = 1, y = 2, z = 3 } })
check(not r.ok, 'play with coordinates sent by the page: refused')
r = req(1, 'play', { id = alex, spawn = 'last' })
check(not r.ok and r.error == "There's no last location yet.", 'play at "last" with none saved: refused')
Config.onPlay = function() return false end
r = req(1, 'play', { id = alex, spawn = 'legion' })
check(not r.ok, 'Config.onPlay refuses: refused')
Config.onPlay = function() return true end
r = req(1, 'play', { id = alex, spawn = 'airport' })
check(r.ok and r.at.x == -1037.5 and r.name == 'Alex', 'play Alex at the airport: the server sends its coordinates')

-- delete
r = req(1, 'delete', { id = alex })
check(not r.ok and r.error == 'Go back to the character screen first.', 'delete the character being played: refused')
r = req(2, 'delete', { id = alex })
check(not r.ok, "player 2 deleting player 1's character: refused")

-- last location: the server's view, on open (back to the screen)
POS[1] = vector3(555, 666, 40)
d = open(1)
local hasLast = false; for _, s in ipairs(d.spawns) do if s.id == 'last' then hasLast = true end end
check(hasLast, 'back at the screen: "Last location" is offered')
r = req(1, 'play', { id = alex, spawn = 'last' })
check(r.ok and r.at.x == 555 and r.at.y == 666 and r.at.w == 90.0, 'play at "last": where the server saw Alex (555, 666)')
open(1)
local sam; for _, c in ipairs(open(1).characters) do if c.firstName == 'Sam' then sam = c.id end end
r = req(1, 'delete', { id = sam })
check(r.ok and #open(1).characters == 2 and open(1).canCreate == true, 'delete Sam from the screen: two left, a slot free again')
Config.allowDelete = false
r = req(1, 'delete', { id = alex })
check(not r.ok, 'with allowDelete off: refused')
Config.allowDelete = true
-- leaving saves where they were
req(1, 'play', { id = alex, spawn = 'legion' })
POS[1] = vector3(777, 888, 50)
source = 1; dropped()
r = req(1, 'play', { id = alex, spawn = 'last' })
check(r.ok and r.at.x == 777, 'leaving saves the position: next time "last" is 777')

-- rate limit: a client spamming open (each one writes the whole file)
clock = clock + 5000
local refused, saves = 0, 0
local realSave = SaveResourceFile
SaveResourceFile = function() saves = saves + 1 end
for _ = 1, 30 do source = 1; handler(1, 'open', {}); if last.error == 'Not so fast.' then refused = refused + 1 end end
SaveResourceFile = realSave
check(refused == 20 and saves == 10, '30 opens in the same instant: 10 answered (10 saves), 20 refused (' .. refused .. ')')
clock = clock + 1000
check(req(1, 'open').ok, 'a second later: requests go through again')

-- OneSync off; another multicharacter
ONESYNC_CONVAR = 'off'
STARTED = { qbx_core = true }
PRINTED = {}
boot()
local warnedOne, warnedQbx = false, false
for _, m in ipairs(PRINTED) do
  if m:find('OneSync is off', 1, true) then warnedOne = true end
  if m:find('qbx_core is running', 1, true) then warnedQbx = true end
end
check(warnedOne and warnedQbx, 'start with OneSync off and qbx_core running: both warnings')
d = open(1)
hasLast = false; for _, s in ipairs(d.spawns) do if s.id == 'last' then hasLast = true end end
check(not hasLast and #d.characters == 2, 'OneSync off: the characters are there, "last" is not offered')
r = req(1, 'play', { id = alex, spawn = 'last' })
check(not r.ok, 'OneSync off: "last" refused')
r = req(1, 'play', { id = alex, spawn = 'legion' })
check(r.ok, 'OneSync off: a fixed spawn point works')

