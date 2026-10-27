-- {{name}}: server
-- Who may use the terminal, every search, and every report. The page is only a requester: on each call
-- the server checks the caller's job and duty (Config.jobs), rate-limits them, validates the input's
-- type and length, does the searching itself, and sends back only whitelisted fields under opaque
-- record ids (never a licence or citizen id). A report is stamped here with the author's name and the
-- server's time; whatever author or time the page sends is ignored.

local resource = GetCurrentResourceName()
-- The save file, or nothing yet. An unreadable file stops the resource (Log.fatal) instead of being
-- emptied by the next save: loading never writes (fivem-foundation, kvp_store rule 1).
local db = {}
do
  local raw = LoadResourceFile(resource, Config.saveFile)
  if raw and raw ~= '' then
    local data, reason = JsonSafe.decode(raw)
    if type(data) ~= 'table' then Log.fatal(('%s is unreadable (%s): fix or remove it'):format(Config.saveFile, tostring(reason))) end
    db = data
  end
end
db.players = db.players or {}  -- the example's [license] = { onDuty }
db.reports = db.reports or {}  -- newest last
db.nextReport = db.nextReport or 1

--- Write the save file: encode first, write only when that worked (a save never leaves a half file).
local function save()
  local encoded, reason = JsonSafe.encode(db)
  if not encoded then return Log.error(('%s not saved: %s'):format(Config.saveFile, tostring(reason))) end
  SaveResourceFile(resource, Config.saveFile, encoded, -1)
end
local function license(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

-- ───────────────────────────────── who is asking

--- { name, job, onDuty } for the caller: the framework's (Config.player) or the example's.
local function who(src)
  if Config.player then
    local ok, p = pcall(Config.player, src)
    if ok and type(p) == 'table' then return p end
    return nil
  end
  local rec = db.players[license(src)]
  return { name = GetPlayerName(src) or 'Unknown', job = Config.demoJob, onDuty = rec and rec.onDuty == true }
end

-- Per player and bucket, the times of the recent calls.
local hits = {}
local function tooMany(src, bucket)
  local limit, now = Config.rate[bucket], GetGameTimer()
  hits[src] = hits[src] or {}
  local list, kept = hits[src][bucket] or {}, {}
  for _, t in ipairs(list) do
    if now - t < limit.per then kept[#kept + 1] = t end
  end
  hits[src][bucket] = kept
  if #kept >= limit.count then return true end
  kept[#kept + 1] = now
  return false
end

AddEventHandler('playerDropped', function() hits[source] = nil end)

--- The caller's identity if they may use the terminal now (allowed job, on duty, not spamming), else nil
--- and the answer to send. `bucket` is the rate limit this call counts against.
local function enter(src, bucket)
  local p = who(src)
  if not p or type(p.job) ~= 'string' or not Config.jobs[p.job] then
    return nil, { ok = false, error = 'The terminal is for police and EMS only.' }
  end
  if p.onDuty ~= true then return nil, { ok = false, error = 'Go on duty to use the terminal.' } end
  if tooMany(src, bucket) then return nil, { ok = false, error = 'Not so fast. Try again in a moment.' } end
  return p
end

-- ───────────────────────────────── records

-- A text from the page: a string, trimmed, `min`..`max` characters, no control characters (a newline is
-- fine when `multiline`). Returns the clean text, or nil.
local function clean(v, min, max, multiline)
  if type(v) ~= 'string' or #v > max * 4 then return nil end
  v = v:gsub('\r', ''):match('^%s*(.-)%s*$')
  local bad = multiline and v:gsub('\n', ''):find('%c') or (not multiline and v:find('%c'))
  if bad or #v < min or #v > max then return nil end
  return v
end

local KINDS = { person = true, vehicle = true }

local function search(kind, query)
  if Config.lookup then
    local ok, found = pcall(Config.lookup.search, kind, query, Config.maxResults)
    return ok and type(found) == 'table' and found or {}
  end
  local found, q = {}, query:lower()
  for _, r in ipairs(kind == 'person' and Config.records.people or Config.records.vehicles) do
    local text = (kind == 'person' and r.name or r.plate):lower()
    if text:find(q, 1, true) then
      found[#found + 1] = r
      if #found >= Config.maxResults then break end
    end
  end
  return found
end

local function get(kind, id)
  if Config.lookup then
    local ok, r = pcall(Config.lookup.get, kind, id)
    return ok and type(r) == 'table' and r or nil
  end
  for _, r in ipairs(kind == 'person' and Config.records.people or Config.records.vehicles) do
    if r.id == id then return r end
  end
end

local function flagsOf(r)
  local out = {}
  for _, f in ipairs(type(r.flags) == 'table' and r.flags or {}) do
    if type(f) == 'string' then out[#out + 1] = f end
  end
  return out
end

--- One line of a search result (web/src/components/blocks/mdt/nui.ts: MdtRecordSummary). Whitelisted.
local function summary(kind, r)
  local person = kind == 'person'
  return {
    id = r.id, kind = kind,
    title = person and r.name or r.plate,
    subtitle = person and r.dob and ('Born ' .. r.dob) or ((r.model or '') .. (r.color and (', ' .. r.color:lower()) or '')),
    flagged = #flagsOf(r) > 0,
  }
end

--- An opened record (MdtRecord). Whitelisted: nothing else of `r` is ever sent.
local function detail(kind, r)
  local s, fields = summary(kind, r), {}
  local function add(label, value) if type(value) == 'string' and value ~= '' then fields[#fields + 1] = { label = label, value = value } end end
  if kind == 'person' then
    add('Date of birth', r.dob)
    add('Address', r.address)
  else
    add('Model', r.model)
    add('Colour', r.color)
    add('Owner', r.owner)
  end
  return { id = s.id, kind = kind, title = s.title, subtitle = s.subtitle, fields = fields, flags = flagsOf(r), notes = type(r.notes) == 'string' and r.notes or nil }
end

--- The newest reports, newest first (MdtReport). Only name, time and text: not who filed it by licence.
local function reportList()
  local out = {}
  for i = #db.reports, math.max(1, #db.reports - Config.showReports + 1), -1 do
    local r = db.reports[i]
    out[#out + 1] = { id = r.id, title = r.title, author = r.author, time = r.time, person = r.person, text = r.text }
  end
  return out
end

-- ───────────────────────────────── what the page asks for

local handlers = {}

handlers.open = function(src)
  local p, refused = enter(src, 'read')
  if not p then return refused end
  return {
    ok = true,
    mdt = {
      title = 'MDT',
      officer = { name = p.name, job = Config.jobs[p.job].label, onDuty = true },
      reports = reportList(),
      limits = {
        query = { min = Config.queryMin, max = Config.queryMax },
        title = { min = Config.titleMin, max = Config.titleMax },
        text = { min = Config.textMin, max = Config.textMax },
      },
    },
  }
end

handlers.search = function(src, data)
  local p, refused = enter(src, 'read')
  if not p then return refused end
  if not KINDS[data.kind] then return { ok = false, error = "That isn't something you can search." } end
  local q = clean(data.query, Config.queryMin, Config.queryMax, false)
  if not q then
    return { ok = false, error = ('Search for %d to %d characters.'):format(Config.queryMin, Config.queryMax) }
  end
  local results = {}
  for _, r in ipairs(search(data.kind, q)) do
    if type(r) == 'table' and type(r.id) == 'string' then results[#results + 1] = summary(data.kind, r) end
    if #results >= Config.maxResults then break end
  end
  return { ok = true, results = results }
end

handlers.record = function(src, data)
  local p, refused = enter(src, 'read')
  if not p then return refused end
  if not KINDS[data.kind] or type(data.id) ~= 'string' or #data.id > 32 then return { ok = false, error = 'Record not found.' } end
  local r = get(data.kind, data.id)
  if not r then return { ok = false, error = 'Record not found.' } end
  return { ok = true, record = detail(data.kind, r) }
end

handlers.report = function(src, data)
  local p, refused = enter(src, 'report')
  if not p then return refused end
  local title = clean(data.title, Config.titleMin, Config.titleMax, false)
  if not title then return { ok = false, error = ('The title needs %d to %d characters.'):format(Config.titleMin, Config.titleMax) } end
  local text = clean(data.text, Config.textMin, Config.textMax, true)
  if not text then return { ok = false, error = ('The report needs %d to %d characters.'):format(Config.textMin, Config.textMax) } end
  -- The involved person is optional, and must be a record the server knows.
  local person
  if data.person ~= nil then
    local r = type(data.person) == 'string' and #data.person <= 32 and get('person', data.person)
    if not r then return { ok = false, error = "That person isn't in the records." } end
    person = r.name
  end

  -- The author and the time are the server's; anything the page sends for them is ignored.
  db.reports[#db.reports + 1] = {
    id = 'r' .. db.nextReport, title = title, text = text, person = person,
    author = tostring(p.name):sub(1, 40), time = os.time(), by = license(src),
  }
  db.nextReport = db.nextReport + 1
  while #db.reports > Config.keepReports do table.remove(db.reports, 1) end
  save()
  return { ok = true, reports = reportList() }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then Log.error(('%s failed: %s'):format(tostring(name), result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The terminal had a problem. Try again.' })
end)

-- ───────────────────────────────── the example's duty

-- With the example's players (no Config.player), a player clocks in and out with /{{name}}_duty. They all
-- get Config.demoJob. Your framework's job and duty replace both (Config.player).
RegisterCommand('{{name}}_duty', function(src)
  if src == 0 or Config.player then return end
  local id = license(src)
  db.players[id] = { onDuty = not (db.players[id] and db.players[id].onDuty) }
  save()
  TriggerClientEvent('{{name}}:duty', src, db.players[id].onDuty)
end, false)
