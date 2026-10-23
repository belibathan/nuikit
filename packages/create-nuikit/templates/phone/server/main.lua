-- {{name}}: server
-- The phone's numbers, contacts and messages. The page only asks: it never says whose phone it is or
-- who a text is from. Here the number is assigned, the player's own state is looked up by identity,
-- a text's target must be a number in service, its length and type are checked, the sender and the
-- time are stamped, and each player is rate-limited. A text is stored for both ends and pushed to the
-- target's phone if they're online.
--
-- Persistence: everything below lives in memory, so numbers, contacts and messages are gone when the
-- resource restarts. To keep them, load `players` from your database (or a file, like the shop
-- template's) at the top and save after each change (`touch()` is the one place that changes it).

local players = {}  -- identity → { number, contacts = { { name, number } }, threads = { [number] = { messages } } }
local numbers = {}  -- number → identity (a number is "in service" once its owner has opened their phone)
local online = {}   -- identity → server id
local hits = {}     -- server id → timestamps (ms) of recent requests, for the rate limit

local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

AddEventHandler('playerDropped', function()
  local src = source
  hits[src] = nil
  local id = owner(src)
  if online[id] == src then online[id] = nil end
end)

--- A random free number: the prefix and four digits. nil when none is left.
local function newNumber()
  for _ = 1, 100 do
    local n = Config.prefix .. string.format('%04d', math.random(0, 9999))
    if not numbers[n] then return n end
  end
end

--- The player's own state, created (with a number) the first time. nil when no number is left.
local function account(src)
  local id = owner(src)
  local st = players[id]
  if not st then
    local number = newNumber()
    if not number then return nil end
    st = { number = number, contacts = {}, threads = {} }
    players[id], numbers[number] = st, id
  end
  online[id] = src
  return st
end

local function touch() end -- persistence hook: save `players` here

--- What the page shows (registry/nuikit/blocks/phone/nui.ts: PhoneData). No identity in it.
local function snapshot(st)
  local contacts, threads = {}, {}
  for i, c in ipairs(st.contacts) do contacts[i] = { name = c.name, number = c.number } end
  table.sort(contacts, function(a, b) return a.name:lower() < b.name:lower() end)
  for number, t in pairs(st.threads) do
    local messages = {}
    for i, m in ipairs(t.messages) do messages[i] = { from = m.from, text = m.text, time = m.time } end
    threads[#threads + 1] = { number = number, messages = messages }
  end
  return { number = st.number, contacts = contacts, threads = threads, limits = { name = Config.maxName, text = Config.maxText } }
end

-- ───────────────────────────────── checks

--- Allowed to use a phone at all (Config.hasPhone, e.g. owns the item). A throwing hook means no.
local function allowed(src)
  if not Config.hasPhone then return true end
  local ok, has = pcall(Config.hasPhone, src)
  return ok and has == true
end

--- At most `max` requests of a kind ('change', or 'open': a snapshot can be big) per
--- Config.rate.window seconds, per player.
local function limited(src, kind, max)
  local now, window = GetGameTimer(), Config.rate.window * 1000
  local mine, list = hits[src] or {}, {}
  hits[src] = mine
  for _, t in ipairs(mine[kind] or {}) do
    if now - t < window then list[#list + 1] = t end
  end
  mine[kind] = list
  if #list >= max then return true end
  list[#list + 1] = now
  return false
end

--- A trimmed string of 1..max characters with no control characters, or nil and why.
local function clean(s, max)
  if type(s) ~= 'string' then return nil, 'empty' end
  s = s:match('^%s*(.-)%s*$')
  if s == '' then return nil, 'empty' end
  local len = utf8.len(s)
  if not len or s:find('%c') then return nil, 'bad' end
  if len > max then return nil, 'long' end
  return s
end

--- "555-0142" or " 5550142 " → "5550142"; nil when it isn't a number this phone network uses.
local function normalize(n)
  if type(n) ~= 'string' then return nil end
  n = n:gsub('[%s%-]', '')
  if not n:match('^%d+$') or #n ~= #Config.prefix + 4 then return nil end
  return n
end

local function contactNameOf(st, number)
  for _, c in ipairs(st.contacts) do
    if c.number == number then return c.name end
  end
end

--- Store a message on one end of a thread; keep the newest Config.maxMessages, and at most
--- Config.maxThreads threads (the quietest goes first).
local function record(st, other, from, text, time)
  local t = st.threads[other]
  if not t then t = { messages = {} }; st.threads[other] = t end
  t.messages[#t.messages + 1] = { from = from, text = text, time = time }
  while #t.messages > Config.maxMessages do table.remove(t.messages, 1) end
  local count = 0
  for _ in pairs(st.threads) do count = count + 1 end
  while count > Config.maxThreads do
    local oldest, at
    for number, th in pairs(st.threads) do
      local last = th.messages[#th.messages].time
      if number ~= other and (not at or last < at) then oldest, at = number, last end
    end
    st.threads[oldest] = nil
    count = count - 1
  end
end

-- ───────────────────────────────── requests

local handlers = {}

--- Every handler starts here: the player may have a phone and has a number, and isn't
--- spamming. Returns the player's state, or nil and the answer to send.
local function begin(src, changes)
  if not allowed(src) then return nil, { ok = false, error = "You don't have a phone." } end
  local kind = changes and 'change' or 'open'
  if limited(src, kind, changes and Config.rate.max or (Config.rate.opens or 30)) then return nil, { ok = false, error = 'Slow down.' } end
  local st = account(src)
  if not st then return nil, { ok = false, error = 'No numbers are left on the network.' } end
  return st
end

handlers.open = function(src)
  local st, refusal = begin(src, false)
  if not st then return refusal end
  return { ok = true, phone = snapshot(st) }
end

handlers.addContact = function(src, data)
  local st, refusal = begin(src, true)
  if not st then return refusal end
  local name, why = clean(data.name, Config.maxName)
  if not name then
    return { ok = false, error = why == 'long' and ('Names are up to %d characters.'):format(Config.maxName) or why == 'bad' and "That name has characters a phone can't save." or 'Enter a name.' }
  end
  local number = normalize(data.number)
  if not number then return { ok = false, error = ("That isn't a valid number. Numbers have %d digits."):format(#Config.prefix + 4) } end
  if number == st.number then return { ok = false, error = "That's your own number." } end
  if contactNameOf(st, number) then return { ok = false, error = ('%s is already saved.'):format(contactNameOf(st, number)) } end
  if #st.contacts >= Config.maxContacts then return { ok = false, error = ('Your contacts are full (%d).'):format(Config.maxContacts) } end
  st.contacts[#st.contacts + 1] = { name = name, number = number }
  touch()
  return { ok = true, phone = snapshot(st) }
end

handlers.send = function(src, data)
  local st, refusal = begin(src, true)
  if not st then return refusal end
  -- The target must be a number in service. The sender is the player asking, never a field of the request.
  local to = normalize(data.to)
  local target = to and numbers[to] and players[numbers[to]]
  if not target then return { ok = false, error = "That number isn't in service." } end
  if target == st then return { ok = false, error = "You can't text yourself." } end
  local text, why = clean(data.text, Config.maxText)
  if not text then
    return { ok = false, error = why == 'long' and ('Texts are up to %d characters.'):format(Config.maxText) or why == 'bad' and "That text has characters a phone can't send." or 'Write something first.' }
  end

  local time = os.time()
  record(st, to, 'me', text, time)
  record(target, st.number, 'them', text, time)
  touch()

  -- Deliver now if they're online: a fresh snapshot, and the name they know the sender by.
  local dst = online[numbers[to]]
  if dst then
    TriggerClientEvent('{{name}}:push', dst, snapshot(target), { title = contactNameOf(target, st.number) or st.number, text = text })
  end
  return { ok = true, phone = snapshot(st) }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function()
    if not handler then return { ok = false, error = 'Unknown request.' } end
    return handler(src, type(data) == 'table' and data or {})
  end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(tostring(name), result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The phone had a problem. Try again.' })
end)
