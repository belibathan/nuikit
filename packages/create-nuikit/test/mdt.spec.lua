-- mdt template, server: only an allowed job on duty gets in (and on every call), every search done on the server with input limits, results with opaque ids and no licence or citizen id, rate limits per player, reports validated, stamped by the server, and stored; the framework hooks (player, lookup) guarded.
-- Run by mdt.test.ts (test/harness.ts: check(), boot()).
json = { encode = function() return 'x' end, decode = function() return {} end }
function IsDuplicityVersion() return true end
function GetCurrentResourceName() return 'demo' end
function LoadResourceFile() return nil end
SAVES = 0
function SaveResourceFile() SAVES = SAVES + 1 end
function print() end
function GetPlayerIdentifierByType(s) return 'license:' .. s end
local NAMES = { [1] = 'J. Ortega', [2] = 'A. Brandt', [3] = 'Civilian Joe' }
function GetPlayerName(s) return NAMES[s] end
NOW = 100000
function GetGameTimer() return NOW end
os.time = function() return 1800000000 end
local handler, dropped, commands = nil, nil, {}
function RegisterNetEvent(_, fn) handler = fn end
function AddEventHandler(name, fn) if name == 'playerDropped' then dropped = fn end end
function RegisterCommand(name, fn) commands[name] = fn end
function TriggerClientEvent(_, src, id, result) ANSWERS[id] = result end
ANSWERS = {}
local seq = 0
local function req(src, name, data)
  seq = seq + 1
  local id = seq
  source = src
  handler(id, name, data)
  return ANSWERS[id]
end

boot()

-- the example's players: police, but off duty until they clock in
local function search(src, kind, query) return req(src, 'search', { kind = kind, query = query }) end
local function record(src, kind, id) return req(src, 'record', { kind = kind, id = id }) end
local function report(src, data) return req(src, 'report', data) end
local GOOD = { title = 'Traffic stop on Route 1', text = 'Stopped a speeding car on Route 1, driver cooperative.' }

-- off duty: every call refused, the page's claim is irrelevant
local r = req(1, 'open', {}); check(not r.ok and r.error == 'Go on duty to use the terminal.', 'open off duty: refused')
r = search(1, 'person', 'vale'); check(not r.ok and r.error == 'Go on duty to use the terminal.', 'search off duty: refused')
r = record(1, 'person', 'p-4f1c'); check(not r.ok, 'record off duty: refused')
r = report(1, GOOD); check(not r.ok, 'report off duty: refused')
r = req(1, 'search', { kind = 'person', query = 'vale', onDuty = true, job = 'police' }); check(not r.ok, 'search off duty with onDuty = true in the payload: still refused')
commands['demo_duty'](0); r = req(1, 'open', {}); check(not r.ok, 'the duty command from the console (src 0) clocks nobody in')
commands['demo_duty'](1)
r = req(1, 'open', {})
check(r.ok and r.mdt.officer.name == 'J. Ortega' and r.mdt.officer.job == 'LSPD' and r.mdt.officer.onDuty == true, 'on duty as police: open works, the officer is the server\'s (J. Ortega, LSPD)')
check(r.mdt.limits.query.max == 32 and r.mdt.limits.text.max == 1000 and #r.mdt.reports == 0, 'open sends the limits and no reports yet')
commands['demo_duty'](1)
r = search(1, 'person', 'vale'); check(not r.ok, 'clocked out again: refused')
commands['demo_duty'](1)

-- the framework's player: wrong job, nobody, broken, ems
local who = { name = 'Civilian Joe', job = 'taxi', onDuty = true }
Config.player = function(src) if src == 9 then error('framework exploded') end return who end
r = req(3, 'open', {}); check(not r.ok and r.error == 'The terminal is for police and EMS only.', 'a taxi driver on duty: refused')
r = search(3, 'person', 'vale'); check(not r.ok, 'a taxi driver searching: refused')
r = report(3, GOOD); check(not r.ok, 'a taxi driver reporting: refused')
who = nil; r = req(3, 'open', {}); check(not r.ok, 'a player the framework does not know: refused')
r = req(9, 'open', {}); check(not r.ok, 'the framework throws: refused')
who = { name = 'X', job = {}, onDuty = true }; r = req(3, 'open', {}); check(not r.ok, 'a job that is a table: refused')
who = { name = 'X', job = 'police', onDuty = 'yes' }; r = req(3, 'open', {}); check(not r.ok, 'onDuty that is not exactly true: refused')
who = { name = 'A. Brandt', job = 'ems', onDuty = true }
r = req(2, 'open', {}); check(r.ok and r.mdt.officer.job == 'EMS', 'an EMS medic on duty: allowed')
who = { name = 'J. Ortega', job = 'police', onDuty = true }

-- search: done on the server, matched case-insensitively
r = search(1, 'person', 'VALE'); check(r.ok and #r.results == 1 and r.results[1].title == 'Marcus Vale' and r.results[1].flagged == true, 'search "VALE": Marcus Vale, flagged')
r = search(1, 'person', 'a'); check(not r.ok, 'a one-character search: refused')
r = search(1, 'person', 'ar'); check(r.ok and #r.results == 2, 'search "ar": two people contain it')
r = search(1, 'vehicle', 'abc'); check(r.ok and #r.results == 1 and r.results[1].title == '12ABC987' and r.results[1].subtitle == 'Sultan, white', 'search a plate: the Sultan')
r = search(1, 'person', 'nobody'); check(r.ok and #r.results == 0, 'no match: ok with an empty list')
r = search(1, 'person', '48klm'); check(r.ok and #r.results == 0, 'a plate is not searched in people')
Config.maxResults = 1
r = search(1, 'person', 'ar'); check(r.ok and #r.results == 1, 'results are capped at maxResults')
Config.maxResults = 8
NOW = NOW + 20000

-- bad searches: refused
local bad = {
  { 'kind nil', function() return req(1, 'search', { query = 'vale' }) end },
  { 'kind "reports"', function() return search(1, 'reports', 'vale') end },
  { 'kind a table', function() return search(1, {}, 'vale') end },
  { 'query nil', function() return req(1, 'search', { kind = 'person' }) end },
  { 'query a number', function() return search(1, 'person', 1234) end },
  { 'query a table', function() return search(1, 'person', { 'vale' }) end },
  { 'query empty', function() return search(1, 'person', '') end },
  { 'query only spaces', function() return search(1, 'person', '     ') end },
  { 'query 33 characters', function() return search(1, 'person', ('x'):rep(33)) end },
  { 'query 100 000 characters', function() return search(1, 'person', ('x'):rep(100000)) end },
  { 'query with a control character', function() return search(1, 'person', 'va\0le') end },
  { 'query with a newline', function() return search(1, 'person', 'va\nle') end },
}
for _, b in ipairs(bad) do
  NOW = NOW + 20000 -- keep the rate limit out of the way
  r = b[2]()
  check(not r.ok and r.results == nil, 'search with ' .. b[1] .. ': refused (' .. tostring(r.error) .. ')')
end
NOW = NOW + 20000
r = search(1, 'person', ('x'):rep(32)); check(r.ok, 'a query of exactly 32 characters is fine')
NOW = NOW + 20000
r = search(1, 'person', '  vale  '); check(r.ok and #r.results == 1, 'a query is trimmed')

-- what the page may see: opaque ids, no licence, citizen id or VIN
NOW = NOW + 20000
local function leaks(v)
  if type(v) == 'table' then
    for k, x in pairs(v) do
      if leaks(k) or leaks(x) then return true end
    end
    return false
  end
  if type(v) ~= 'string' then return false end
  local s = v:lower()
  return s:find('license', 1, true) ~= nil or s:find('nkt-', 1, true) ~= nil or s:find('vin-', 1, true) ~= nil or s:find('citizen', 1, true) ~= nil
end
local all = {}
for _, k in ipairs({ { 'person', 'ar' }, { 'vehicle', 'klm' }, { 'vehicle', 'abc' } }) do
  NOW = NOW + 20000
  local found = search(1, k[1], k[2])
  all[#all + 1] = found
  for _, s in ipairs(found.results) do
    local d = record(1, k[1], s.id)
    all[#all + 1] = d
    local keys = {}
    for key in pairs(d.record) do keys[#keys + 1] = key end
    table.sort(keys)
    check(table.concat(keys, ',') == 'fields,flags,id,kind,notes,subtitle,title', 'record ' .. s.id .. ': only the whitelisted keys (' .. table.concat(keys, ',') .. ')')
  end
end
check(not leaks(all), 'no licence, citizen id or VIN in any search result or record')
r = search(1, 'person', 'vale')
check(r.results[1].id == 'p-4f1c' and r.results[1].licence == nil and r.results[1].license == nil and r.results[1].citizenid == nil, 'a result carries the opaque id and nothing else of the record')

-- a record
NOW = NOW + 20000
r = record(1, 'person', 'p-4f1c')
check(r.ok and r.record.title == 'Marcus Vale' and r.record.flags[1] == 'Wanted' and r.record.fields[1].value == '1988-03-14' and r.record.notes ~= nil, 'open a person: name, flags, date of birth, notes')
r = record(1, 'vehicle', 'v-77c0'); check(r.ok and r.record.title == '48KLM221' and r.record.fields[3].value == 'Marcus Vale', 'open a vehicle: plate, owner')
r = record(1, 'vehicle', 'p-4f1c'); check(not r.ok and r.error == 'Record not found.', 'a person id asked for as a vehicle: not found')
r = record(1, 'person', 'p-zzzz'); check(not r.ok, 'an unknown id: not found')
r = record(1, 'person', 'Marcus Vale'); check(not r.ok, 'a name instead of an id: not found')
r = record(1, 'person', 12); check(not r.ok, 'an id that is a number: refused')
r = record(1, 'person', {}); check(not r.ok, 'an id that is a table: refused')
r = record(1, 'person', ('p'):rep(500)); check(not r.ok, 'an id of 500 characters: refused')
r = record(1, 'person', nil); check(not r.ok, 'no id: refused')
r = record(1, 'nope', 'p-4f1c'); check(not r.ok, 'a bad kind: refused')

-- rate limits: per player, per bucket, and they clear
NOW = NOW + 20000
local fine = 0
for i = 1, 12 do if search(1, 'person', 'vale').ok then fine = fine + 1 end end
check(fine == 12, 'twelve searches in the window: all fine')
r = search(1, 'person', 'vale'); check(not r.ok and r.error == 'Not so fast. Try again in a moment.', 'the thirteenth: refused')
r = record(1, 'person', 'p-4f1c'); check(not r.ok, 'a record lookup shares the same limit')
who = { name = 'A. Brandt', job = 'ems', onDuty = true }
r = search(2, 'person', 'vale'); check(r.ok, 'another player is not affected')
who = { name = 'J. Ortega', job = 'police', onDuty = true }
NOW = NOW + 9999; r = search(1, 'person', 'vale'); check(not r.ok, 'just inside the window: still refused')
NOW = NOW + 2; r = search(1, 'person', 'vale'); check(r.ok, 'after the window: allowed again')
dropped(); source = 1
NOW = NOW + 20000

-- reports: validated, stamped by the server, stored
r = report(1, { title = GOOD.title, text = GOOD.text, author = 'The Chief', time = 5, by = 'x', id = 'r999' })
check(r.ok and #r.reports == 1 and r.reports[1].author == 'J. Ortega' and r.reports[1].time == 1800000000 and r.reports[1].id == 'r1', 'file a report: author and time are the server\'s, the page\'s author, time and id are ignored')
check(r.reports[1].title == GOOD.title and r.reports[1].person == nil and r.reports[1].by == nil, 'the stored report carries its title and no licence')
check(SAVES >= 1, 'a report is saved to the resource')
NOW = NOW + 61000
r = report(1, { title = '  Welfare check  ', text = 'Line one of the report.\nLine two of the report.', person = 'p-9a2e' })
check(r.ok and #r.reports == 2 and r.reports[1].title == 'Welfare check' and r.reports[1].person == 'Lena Okafor' and r.reports[1].text:find('\n', 1, true) ~= nil and r.reports[2].id == 'r1', 'a report about a known person: trimmed, the person named by the server, newest first, newlines kept')
r = req(1, 'open', {}); check(r.ok and #r.mdt.reports == 2 and r.mdt.reports[1].id == 'r2', 'open lists the stored reports, newest first')
Config.showReports = 1
r = req(1, 'open', {}); check(#r.mdt.reports == 1 and r.mdt.reports[1].id == 'r2', 'only the newest showReports go to the page')
Config.showReports = 30

-- bad reports: refused, nothing stored
local badReports = {
  { 'data empty', {} },
  { 'title nil', { text = GOOD.text } },
  { 'title a number', { title = 123456, text = GOOD.text } },
  { 'title a table', { title = {}, text = GOOD.text } },
  { 'title 2 characters', { title = 'ab', text = GOOD.text } },
  { 'title only spaces', { title = '        ', text = GOOD.text } },
  { 'title 61 characters', { title = ('t'):rep(61), text = GOOD.text } },
  { 'title with a newline', { title = 'two\nlines', text = GOOD.text } },
  { 'title with a control character', { title = 'bad\1title', text = GOOD.text } },
  { 'text nil', { title = GOOD.title } },
  { 'text a table', { title = GOOD.title, text = {} } },
  { 'text 9 characters', { title = GOOD.title, text = '123456789' } },
  { 'text 1001 characters', { title = GOOD.title, text = ('x'):rep(1001) } },
  { 'text 1 000 000 characters', { title = GOOD.title, text = ('x'):rep(1000000) } },
  { 'text with a control character', { title = GOOD.title, text = 'long enough text\0 with a null' } },
  { 'person unknown', { title = GOOD.title, text = GOOD.text, person = 'p-nope' } },
  { 'person a table', { title = GOOD.title, text = GOOD.text, person = {} } },
  { 'person a number', { title = GOOD.title, text = GOOD.text, person = 5 } },
  { 'person a vehicle id', { title = GOOD.title, text = GOOD.text, person = 'v-77c0' } },
  { 'person a name', { title = GOOD.title, text = GOOD.text, person = 'Marcus Vale' } },
}
for _, b in ipairs(badReports) do
  NOW = NOW + 61000
  r = report(1, b[2])
  check(not r.ok and r.reports == nil, 'report with ' .. b[1] .. ': refused (' .. tostring(r.error) .. ')')
end
NOW = NOW + 61000
r = report(1, { title = ('t'):rep(60), text = ('x'):rep(1000) }); check(r.ok and #r.reports == 3, 'a 60-character title and a 1000-character text are fine, and nothing bad was stored (3 reports)')

-- report rate limit: three a minute
NOW = NOW + 61000
local filed = 0
for i = 1, 3 do if report(1, GOOD).ok then filed = filed + 1 end end
check(filed == 3, 'three reports in a minute: all filed')
r = report(1, GOOD); check(not r.ok and r.error == 'Not so fast. Try again in a moment.', 'the fourth: refused')
NOW = NOW + 61000
r = report(1, GOOD); check(r.ok, 'a minute later: allowed')

-- the oldest reports are dropped past keepReports
Config.keepReports = 3
NOW = NOW + 61000
r = report(1, GOOD)
check(r.ok and #r.reports == 3 and r.reports[1].id == 'r8' and r.reports[3].id == 'r6', 'past keepReports the oldest are dropped')
Config.keepReports = 500

-- the framework's lookup: its records, guarded
local calls = {}
Config.lookup = {
  search = function(kind, query, limit)
    calls[#calls + 1] = { kind, query, limit }
    if query == 'boom' then error('database down') end
    if query == 'many' then
      local t = {}
      for i = 1, 20 do t[i] = { id = 'x' .. i, name = 'Person ' .. i, dob = '2000-01-01', flags = {}, license = 'license:secret' } end
      return t
    end
    if query == 'junk' then return { 'string', { name = 'No id' }, { id = 5, name = 'Number id' }, { id = 'ok1', name = 'Fine', flags = 'wanted' } } end
    return {}
  end,
  get = function(kind, id)
    if id == 'boom' then error('database down') end
    if id == 'ok1' then return { id = 'ok1', name = 'Fine', citizenid = 'NKT-1' } end
  end,
}
NOW = NOW + 61000
r = search(1, 'person', 'many'); check(r.ok and #r.results == 8 and not leaks(r), 'lookup search: capped at maxResults, the licence it returned is not passed on')
check(calls[#calls][3] == 8 and calls[#calls][2] == 'many', 'lookup search is asked for the trimmed query and the limit')
r = search(1, 'person', 'boom'); check(r.ok and #r.results == 0, 'the lookup throws on search: an empty list, no crash')
r = search(1, 'person', 'junk'); check(r.ok and #r.results == 1 and r.results[1].id == 'ok1' and r.results[1].flagged == false, 'lookup results without a string id are skipped, bad flags are ignored')
r = record(1, 'person', 'ok1'); check(r.ok and r.record.title == 'Fine' and not leaks(r), 'lookup record: whitelisted, no citizen id')
r = record(1, 'person', 'boom'); check(not r.ok and r.error == 'Record not found.', 'the lookup throws on get: not found')
r = report(1, { title = GOOD.title, text = GOOD.text, person = 'ok1' }); check(r.ok and r.reports[1].person == 'Fine', 'a report about a lookup person')
Config.lookup = nil

-- garbage requests do not crash the server
r = req(1, 'nope', {}); check(not r.ok, 'an unknown request name: refused')
r = req(1, 'search', 'vale'); check(not r.ok, 'data that is a string: refused')
r = req(1, {}, {}); check(not r.ok, 'a request name that is a table: refused')
r = req(1, 'open', nil); check(r.ok, 'open without data: fine')
