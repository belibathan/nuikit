-- {{name}}: server
-- Every player's characters, and every choice the page makes about them. Nothing is taken on
-- trust: a character must be the caller's own (by license), a spawn point must be one of
-- Config.spawns (or 'last', for a character that has one) and the server sends its coordinates,
-- a new character must have real names, an adult date of birth and a listed gender in a free slot,
-- and a character can only be deleted from the select screen. Where a character is is read from
-- the server's own view of the player (OneSync), never sent by the client.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
db.players = db.players or {} -- [license] = { [character id] = { firstName, lastName, birthdate, gender, cash, bank, last?, lastPlayed? } }

-- Last locations come from server-side positions, which need OneSync. Without it everything works
-- but 'last' is never offered; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^3[%s] OneSync is off: "Last location" won\'t be saved or offered (set onesync on in server.cfg).^0'):format(resource))
end

-- A framework's own character screen would show too, and the two would fight over the player.
-- Say so once at start, and again if one starts later.
local OTHERS = { 'qbx_core', 'qb-multicharacter', 'esx_multicharacter', 'um-multicharacter', 'ps-multicharacter' }
local function warnOthers(only)
  for _, name in ipairs(OTHERS) do
    if (not only or only == name) and GetResourceState(name) == 'started' then
      print(('^3[%s] %s is running and has its own character screen: use one or the other (see the README).^0'):format(resource, name))
    end
  end
end
warnOthers()
AddEventHandler('onResourceStart', function(name) warnOthers(name) end)

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function license(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end
local function mine(src)
  local id = license(src)
  db.players[id] = db.players[id] or {}
  return db.players[id]
end

local active = {} -- [src] = character id, while playing

local function count(t) local n = 0 for _ in pairs(t) do n = n + 1 end return n end

local function ago(t)
  if not t then return nil end
  local days = math.floor((os.time() - t) / 86400)
  if days <= 0 then return 'Today' elseif days == 1 then return 'Yesterday' elseif days < 30 then return days .. ' days ago' end
  return days < 60 and 'Last month' or 'A while ago'
end

--- What the page shows (nui.ts: CharacterSelectData).
local function snapshot(src)
  local list, anyLast = {}, false
  for id, c in pairs(mine(src)) do
    list[#list + 1] = { id = id, firstName = c.firstName, lastName = c.lastName, birthdate = c.birthdate, gender = c.gender,
      cash = c.cash, bank = c.bank, lastPlayed = ago(c.lastPlayed), _t = c.lastPlayed or 0 }
    anyLast = anyLast or c.last ~= nil
  end
  table.sort(list, function(a, b) return a._t > b._t end)
  for _, c in ipairs(list) do c._t = nil end
  local spawns = {}
  if anyLast and ONESYNC then spawns[1] = { id = 'last', label = 'Last location', description = 'Where you left off', icon = 'last' } end
  for _, s in ipairs(Config.spawns) do spawns[#spawns + 1] = { id = s.id, label = s.label, description = s.description, icon = s.icon } end
  return { title = #list > 0 and 'Welcome back' or 'Welcome', characters = list, slots = Config.slots, spawns = spawns,
    canCreate = #list < Config.slots, canDelete = Config.allowDelete, genders = Config.genders }
end

--- Where the server has the player now, as { x, y, z, w }, or nil.
local function here(src)
  if not ONESYNC then return nil end
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return nil end
  local p = GetEntityCoords(ped)
  return { x = p.x, y = p.y, z = p.z, w = GetEntityHeading(ped) }
end

local function remember(src)
  local id = active[src]
  local c = id and mine(src)[id]
  local at = c and here(src)
  if at then c.last = at end
end

-- ───────────────────────────────── checks for a new character

--- A name: 2–20 characters, starting with a letter; letters (any language), spaces, hyphens, apostrophes.
local function nameOf(v)
  if type(v) ~= 'string' then return nil end
  v = v:gsub('^%s+', ''):gsub('%s+$', '')
  local n = utf8.len(v)
  if not n or n < 2 or n > 20 then return nil end
  for _, code in utf8.codes(v) do
    local ok = code > 127 or (code >= 65 and code <= 90) or (code >= 97 and code <= 122) or code == 32 or code == 39 or code == 45
    if not ok then return nil end
  end
  local first = utf8.codepoint(v, 1)
  if first == 32 or first == 39 or first == 45 then return nil end
  return v
end

--- "YYYY-MM-DD" for someone 18 to 100 years old today, or nil.
local function birthdateOf(v)
  if type(v) ~= 'string' then return nil end
  local y, m, d = v:match('^(%d%d%d%d)%-(%d%d)%-(%d%d)$')
  y, m, d = tonumber(y), tonumber(m), tonumber(d)
  if not y or m < 1 or m > 12 or d < 1 or d > 31 then return nil end
  local check = os.date('!*t', os.time({ year = y, month = m, day = d, hour = 12 }))
  if check.month ~= m or check.day ~= d then return nil end -- 31 February
  local now = os.date('!*t')
  local function before(years) return ('%04d-%02d-%02d'):format(now.year - years, now.month, now.day) end
  if v > before(18) or v < before(100) then return nil end
  return v
end

local function genderOf(v)
  for _, g in ipairs(Config.genders) do
    if g == v then return g end
  end
end

local CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
local function newId()
  for _ = 1, 50 do
    local id = ''
    for _ = 1, 3 do local i = math.random(#CHARS) id = id .. CHARS:sub(i, i) end
    id = id .. ('%05d'):format(math.random(0, 99999))
    local taken = false
    for _, chars in pairs(db.players) do if chars[id] then taken = true end end
    if not taken then return id end
  end
end

-- ───────────────────────────────── what the page asks for

local handlers, lastCreate = {}, {}

handlers.open = function(src)
  remember(src)
  active[src] = nil -- back at the select screen
  save()
  return { ok = true, data = snapshot(src) }
end

handlers.play = function(src, data)
  local chars = mine(src)
  local c = type(data.id) == 'string' and chars[data.id]
  if not c then return { ok = false, error = "That isn't one of your characters." } end
  local at
  if #Config.spawns > 0 or c.last then
    if data.spawn == 'last' then
      if not (c.last and ONESYNC) then return { ok = false, error = "There's no last location yet." } end
      at = c.last
    else
      for _, s in ipairs(Config.spawns) do
        if s.id == data.spawn then at = { x = s.coords.x, y = s.coords.y, z = s.coords.z, w = s.coords.w } end
      end
      if not at then return { ok = false, error = 'Pick where to start.' } end
    end
  end
  local hookOk, kept = pcall(Config.onPlay, src, { id = data.id, firstName = c.firstName, lastName = c.lastName, birthdate = c.birthdate, gender = c.gender, cash = c.cash, bank = c.bank })
  if not (hookOk and kept ~= false) then return { ok = false, error = "You can't play that character right now." } end
  active[src] = data.id
  c.lastPlayed = os.time()
  save()
  return { ok = true, at = at, name = c.firstName }
end

handlers.create = function(src, data)
  local chars = mine(src)
  if count(chars) >= Config.slots then return { ok = false, error = 'Every slot is taken.' } end
  local first, last = nameOf(data.firstName), nameOf(data.lastName)
  if not first or not last then return { ok = false, error = 'Use names of 2 to 20 letters.' } end
  local born = birthdateOf(data.birthdate)
  if not born then return { ok = false, error = 'Characters are 18 to 100 years old.' } end
  local gender = genderOf(data.gender)
  if not gender then return { ok = false, error = 'Pick a gender from the list.' } end
  local now = os.time()
  if lastCreate[src] and now - lastCreate[src] < 3 then return { ok = false, error = 'Not so fast.' } end
  lastCreate[src] = now
  local id = newId()
  if not id then return { ok = false, error = 'Try again.' } end
  chars[id] = { firstName = first, lastName = last, birthdate = born, gender = gender, cash = Config.startCash, bank = Config.startBank }
  save()
  return { ok = true, id = id }
end

handlers.delete = function(src, data)
  if not Config.allowDelete then return { ok = false, error = "Characters can't be deleted here." } end
  local chars = mine(src)
  if type(data.id) ~= 'string' or not chars[data.id] then return { ok = false, error = "That isn't one of your characters." } end
  if active[src] == data.id then return { ok = false, error = 'Go back to the character screen first.' } end
  chars[data.id] = nil
  save()
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'Something went wrong. Try again.' })
end)

-- Where each playing character is, every minute and when they leave (the server's own view).
CreateThread(function()
  while true do
    Wait(60000)
    for src in pairs(active) do remember(src) end
    save()
  end
end)
AddEventHandler('playerDropped', function()
  local src = source
  remember(src)
  active[src], lastCreate[src] = nil, nil
  save()
end)
