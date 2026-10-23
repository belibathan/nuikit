-- phone template, server: a number assigned per identity (never sent to the page), contacts validated and capped, texts to numbers in service only, length and type checked, sender and time stamped by the server, delivery pushed to an online target, rate limit per player, history caps, the item hook.
-- Run by phone.test.ts (test/harness.ts: check(), boot()).
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
PRINTED = {}
function print(m) PRINTED[#PRINTED+1] = tostring(m) end
LICENSE = {}
function GetPlayerIdentifierByType(s) return LICENSE[s] or ('license:' .. s) end
NOW = 1000
function GetGameTimer() return NOW end
local handler, dropped
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn end end
local answers, pushes = {}, {}
function TriggerClientEvent(name, dst, a, b)
  if name == 'demo:push' then pushes[#pushes + 1] = { dst = dst, phone = a, from = b } else answers[a] = b end
end
boot()
local seq = 0
local function req(src, name, data)
  seq = seq + 1
  local id = seq
  source = src
  handler(id, name, data)
  return answers[id]
end
local function later() NOW = NOW + 60000 end -- a new rate-limit window
local function open(src) return req(src, 'open').phone end
local function add(src, name, number) return req(src, 'addContact', { name = name, number = number }) end
local function send(src, to, text) return req(src, 'send', { to = to, text = text }) end
local function thread(phone, number) for _, t in ipairs(phone.threads) do if t.number == number then return t end end end
local function has(s, part) return s ~= nil and tostring(s):find(part, 1, true) ~= nil end

-- numbers: assigned by the server, per identity
local p1, p2, p3 = open(1), open(2), open(3)
check(p1.number:match('^555%d%d%d%d$') ~= nil, 'a number is assigned: prefix and four digits (' .. p1.number .. ')')
check(p1.number ~= p2.number and p2.number ~= p3.number and p1.number ~= p3.number, 'three players, three different numbers')
check(open(1).number == p1.number, 'opening again keeps the number')
LICENSE[4] = 'license:1'
check(open(4).number == p1.number, 'the same license on a new server id (a reconnect) keeps the number')
check(#p1.contacts == 0 and #p1.threads == 0, 'a new phone has no contacts and no messages')
check(p1.limits.name == 24 and p1.limits.text == 240, 'the page is told the limits, to show them (the server enforces them)')
local function leaks(v)
  if type(v) == 'string' then return v:find('license', 1, true) ~= nil or v:find('src:', 1, true) ~= nil end
  if type(v) == 'table' then for _, x in pairs(v) do if leaks(x) then return true end end end
  return false
end
check(not leaks(p1) and not leaks(req(1, 'open')), 'the snapshot carries no license or identifier')

-- an unknown request, a non-table payload
local r = req(1, 'hack')
check(not r.ok and r.error == 'Unknown request.', 'an unknown request: refused')
r = req(1, {}); check(not r.ok, 'a request name that is a table: refused')
seq = seq + 1; source = 1; handler(seq, 'open', 'x'); check(answers[seq].ok, 'a payload that is not a table is read as empty')

-- contacts: good
later()
r = add(1, '  Ana Reyes ', '555-0188')
check(r.ok and r.phone.contacts[1].name == 'Ana Reyes' and r.phone.contacts[1].number == '5550188', 'add a contact: name trimmed, number kept as digits')
add(1, 'Bay Auto', '5550123')
add(1, 'carl', ' 555 0177 ')
local names = {}
for i, c in ipairs(open(1).contacts) do names[i] = c.name end
check(table.concat(names, ',') == 'Ana Reyes,Bay Auto,carl', 'contacts come back sorted by name, ignoring case')
check(#open(2).contacts == 0, "another player's contacts are separate")
r = req(1, 'addContact', { name = 'Zed', number = '5550166', owner = 'license:2', id = 2 })
check(r.ok and #open(2).contacts == 0 and #open(1).contacts == 4, 'extra fields from the page (an owner, an id) are ignored: it lands on the asker')

-- contacts: bad ones change nothing
later()
local before = #open(1).contacts
local badContact = {
  { 'name nil', function() return add(1, nil, '5550155') end },
  { 'name a table', function() return add(1, {}, '5550155') end },
  { 'name a number', function() return add(1, 5, '5550155') end },
  { 'name empty', function() return add(1, '', '5550155') end },
  { 'name only spaces', function() return add(1, '   ', '5550155') end },
  { 'name of 25 characters (max 24)', function() return add(1, ('x'):rep(25), '5550155') end },
  { 'name with a control character', function() return add(1, 'Bo\nb', '5550155') end },
  { 'number nil', function() return add(1, 'Sam', nil) end },
  { 'number a table', function() return add(1, 'Sam', {}) end },
  { 'number a number', function() return add(1, 'Sam', 5550155) end },
  { 'number too short', function() return add(1, 'Sam', '555') end },
  { 'number too long', function() return add(1, 'Sam', '55501550') end },
  { 'number with letters', function() return add(1, 'Sam', '555abcd') end },
  { 'number of spaces', function() return add(1, 'Sam', '       ') end },
  { 'their own number', function() return add(1, 'Me', p1.number) end },
  { 'a number already saved', function() return add(1, 'Ana again', '5550188') end },
}
for _, b in ipairs(badContact) do
  later()
  r = b[2]()
  check(not r.ok and #open(1).contacts == before,'add a contact with ' .. b[1] .. ': refused, nothing added (' .. tostring(r.error) .. ')')
end
check(add(1, ('x'):rep(24), '5550155').ok, 'a name of exactly 24 characters is fine')
later()
-- 5 saved now; the cap is read live
Config.maxContacts = 5
r = add(1, 'Over', '5550102')
check(not r.ok and has(r.error, 'full') and #open(1).contacts == 5, 'more than Config.maxContacts: refused (' .. tostring(r.error) .. ')')
Config.maxContacts = 50

-- texts: refused ones store nothing
later()
local badSend = {
  { 'a number not in service', function() return send(1, '5559999', 'hi') end },
  { 'a malformed number', function() return send(1, '12', 'hi') end },
  { 'a target that is a table', function() return send(1, {}, 'hi') end },
  { 'a target that is nil', function() return send(1, nil, 'hi') end },
  { 'their own number', function() return send(1, p1.number, 'hi') end },
  { 'text nil', function() return send(1, p2.number, nil) end },
  { 'text a table', function() return send(1, p2.number, {}) end },
  { 'text a number', function() return send(1, p2.number, 42) end },
  { 'text empty', function() return send(1, p2.number, '') end },
  { 'text of only spaces', function() return send(1, p2.number, '   \t ') end },
  { 'text with a control character', function() return send(1, p2.number, 'hi\0there') end },
  { 'text of 241 characters (max 240)', function() return send(1, p2.number, ('x'):rep(241)) end },
  { 'text with invalid utf-8', function() return send(1, p2.number, '\xff\xfe') end },
}
for _, b in ipairs(badSend) do
  r = b[2]()
  check(not r.ok and #open(1).threads == 0 and #open(2).threads == 0, 'send ' .. b[1] .. ': refused, nothing stored (' .. tostring(r.error) .. ')')
  if #badSend > 5 then later() end -- these are about the rules, not the rate limit
end
check(#pushes == 0, 'and nothing was pushed to anyone')

-- texts: a good one, stamped by the server, delivered to the online target
later()
r = req(1, 'send', { to = p2.number, text = '  Are we on tonight?  ', from = p3.number, sender = p3.number, time = 1, number = p3.number })
local t1, t2 = thread(open(1), p2.number), thread(open(2), p1.number)
check(r.ok and t1 and t2 and #t1.messages == 1 and #t2.messages == 1, 'send to a number in service: stored in both threads')
check(t1.messages[1].from == 'me' and t2.messages[1].from == 'them', 'the sender sees it as theirs, the target as received')
check(t1.messages[1].text == 'Are we on tonight?' and t2.messages[1].text == 'Are we on tonight?', 'the text is trimmed')
check(math.abs(t1.messages[1].time - os.time()) <= 5 and t2.messages[1].time == t1.messages[1].time, "the time is the server's, whatever the page sent")
check(thread(open(3), p1.number) == nil and thread(open(3), p2.number) == nil, 'a number the page named as the sender is ignored: the third player has nothing')
check(thread(r.phone, p2.number) ~= nil, "the sender's answer carries their fresh snapshot")
check(#pushes == 1 and pushes[1].dst == 2 and thread(pushes[1].phone, p1.number).messages[1].text == 'Are we on tonight?', 'the online target gets a push with their fresh snapshot')
check(pushes[1].from.title == p1.number and pushes[1].from.text == 'Are we on tonight?', 'the push says who it is from (the number, when the target has no contact)')
check(not leaks(pushes[1].phone), 'the push carries no license or identifier')
later()
add(2, 'Ana', p1.number)
send(1, p2.number, 'Hello?')
check(#pushes == 2 and pushes[2].dst == 2 and pushes[2].from.title == 'Ana', "only the target is pushed to, and it names the sender by the target's own contact")
later()
r = send(1, p2.number, ('é'):rep(240))
check(r.ok, 'a text of exactly 240 characters (multi-byte) is fine')

-- an offline target: stored, not pushed, there when they come back
later()
source = 2; dropped()
local n = #pushes
r = send(1, p2.number, 'Call me when you are back')
check(r.ok and #pushes == n, 'target offline: the text is accepted and nothing is pushed')
local back = thread(open(2), p1.number)
check(back.messages[#back.messages].text == 'Call me when you are back', 'it is waiting when they open their phone again')
check(open(2).number == p2.number, 'and they keep their number')

-- the rate limit, per player
later()
for i = 1, 5 do r = send(3, p1.number, 'spam ' .. i); check(r.ok, 'text ' .. i .. ' of 5 in the window goes through') end
r = send(3, p1.number, 'spam 6')
check(not r.ok and r.error == 'Slow down.' and #thread(open(1), p3.number).messages == 5, 'the 6th inside the window: refused, not stored (' .. tostring(r.error) .. ')')
r = add(3, 'Spammer', '5550133')
check(not r.ok and r.error == 'Slow down.', 'adding a contact counts too: refused while limited')
check(send(1, p2.number, 'still fine').ok, "another player isn't limited by it")
NOW = NOW + 9000
check(not send(3, p1.number, 'too soon').ok, 'nine seconds later it is still limited')
NOW = NOW + 2000
check(send(3, p1.number, 'ok again').ok, 'after the window it works again')
later()
local flood = 0
for _ = 1, 5 do if send(3, '5559999', 'x').ok then flood = flood + 1 end end
r = send(3, p1.number, 'valid but late')
check(flood == 0 and not r.ok and r.error == 'Slow down.', 'refused requests count against the limit too: spamming bad numbers earns a wait')

-- history caps
later()
Config.maxMessages = 3
Config.rate.max = 100
for i = 1, 5 do send(1, p2.number, 'm' .. i) end
local kept = thread(open(1), p2.number).messages
check(#kept == 3 and kept[1].text == 'm3' and kept[3].text == 'm5', 'a thread keeps the newest Config.maxMessages (m3 to m5)')
Config.maxMessages = 100
Config.maxThreads = 2
local p5 = open(5)
send(5, p1.number, 'newest from five')
local seen = {}
local ts = open(1).threads
for _, t in ipairs(ts) do seen[t.number] = true end
check(#ts == 2 and seen[p5.number], 'more than Config.maxThreads: the quietest thread goes, the new one stays')
Config.maxThreads = 30

-- the item hook
later()
Config.rate.max = 5
Config.hasPhone = function(src) return src ~= 3 end
r = req(3, 'open'); check(not r.ok and r.error == "You don't have a phone.", 'Config.hasPhone false: open refused')
r = add(3, 'Ana', p1.number); check(not r.ok, 'Config.hasPhone false: add a contact refused')
r = send(3, p1.number, 'hi'); check(not r.ok, 'Config.hasPhone false: send refused')
check(req(1, 'open').ok, 'Config.hasPhone true: allowed')
Config.hasPhone = function() error('inventory exploded') end
r = req(1, 'open'); check(not r.ok, 'Config.hasPhone throws: refused')
Config.hasPhone = nil

-- no numbers left
local realRandom = math.random
math.random = function() return 7 end
r = req(9, 'open')
check(r.ok and r.phone.number == '5550007', 'a new player gets the free number')
r = req(10, 'open')
check(not r.ok and r.error == 'No numbers are left on the network.', 'no free number: refused with a clear error (' .. tostring(r.error) .. ')')
math.random = realRandom

-- opening is limited too (a snapshot can be large), on its own budget: it never uses up texting
later()
local opened = 0
for _ = 1, 40 do if req(1, 'open').ok then opened = opened + 1 end end
r = req(1, 'open')
check(opened == Config.rate.opens and not r.ok and r.error == 'Slow down.', 'more than Config.rate.opens snapshots in a window: refused (' .. opened .. ' answered)')
r = send(1, p2.number, 'still here')
check(r.ok, 'while opening is limited, a text still goes through')
later()
check(req(1, 'open').ok, 'the next window: open again')
