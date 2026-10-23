-- {{name}}: server
-- Every inventory (each player's pockets, each stash) lives here, and every move and use is checked
-- here: the containers must be the caller's own pockets or a stash they stand at, the slots must
-- exist, the count must be a whole number the slot really has, stacking only joins the same item,
-- swaps move whole stacks, and nothing may go over a container's weight. The page only asks.
-- (Running ox_inventory or another inventory? Use its own UI override instead: this is a
-- standalone inventory for servers without one, and the example of the rules.)

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
db.players = db.players or {} -- [license] = { [tostring(slot)] = { name, count, durability?, info? } }
db.stashes = db.stashes or {} -- [stash id] = same

-- Stashes are opened where the player stands, which needs OneSync (server-side positions). Without
-- it the pockets work and every stash is refused; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^3[%s] OneSync is off: stashes can\'t be opened (set onesync on in server.cfg). Pockets work.^0'):format(resource))
end

-- Another inventory on the same key (TAB) and the same items would fight this one: say so once at
-- start, and again if one starts later.
local OTHERS = { 'ox_inventory', 'qb-inventory', 'qs-inventory', 'ps-inventory' }
local function warnOthers(only)
  for _, name in ipairs(OTHERS) do
    if (not only or only == name) and GetResourceState(name) == 'started' then
      print(('^3[%s] %s is running. This is a standalone inventory: run one or the other (or give this one another key, Config.key).^0'):format(resource, name))
    end
  end
end
warnOthers()
AddEventHandler('onResourceStart', function(name) warnOthers(name) end)

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function license(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function stashById(id)
  for _, s in ipairs(Config.stashes) do
    if s.id == id then return s end
  end
end

local function near(src, coords, radius)
  if not ONESYNC then return false end
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return false end
  local p = GetEntityCoords(ped)
  local dx, dy, dz = p.x - coords.x, p.y - coords.y, p.z - coords.z
  return dx * dx + dy * dy + dz * dz <= (radius + 1.0) ^ 2
end

--- The pockets, with the starter items the first time.
local function pockets(src)
  local id = license(src)
  local inv = db.players[id]
  if not inv then
    inv = {}
    for i, s in ipairs(Config.starter or {}) do
      if Config.items[s[1]] then inv[tostring(i)] = { name = s[1], count = s[2] } end
    end
    db.players[id] = inv
  end
  return inv
end

--- A container the caller may touch: 'player' (their own), or 'stash:<id>' when they stand at it.
--- Returns its slots table and its definition, or nil.
local function container(src, ref)
  if ref == 'player' then return pockets(src), { slots = Config.player.slots, maxWeight = Config.player.maxWeight } end
  local id = type(ref) == 'string' and ref:match('^stash:(.+)$')
  local stash = id and stashById(id)
  if not stash or not near(src, stash.coords, stash.radius) then return nil end
  db.stashes[stash.id] = db.stashes[stash.id] or {}
  return db.stashes[stash.id], stash
end

local function weight(slots)
  local w = 0
  for _, it in pairs(slots) do w = w + ((Config.items[it.name] or {}).weight or 0) * it.count end
  return w
end

local function slotOf(def, n)
  if type(n) ~= 'number' or n ~= math.floor(n) or n < 1 or n > def.slots then return nil end
  return tostring(math.floor(n))
end

local function stacks(a, b)
  local item = Config.items[a.name]
  return a.name == b.name and item and item.stack ~= false and not a.durability and not b.durability and not a.info and not b.info
end

--- What the page shows for a container (nui.ts: InventoryContainer).
local function view(id, label, def, slots)
  local items = {}
  for key, it in pairs(slots) do
    local item = Config.items[it.name] or {}
    items[#items + 1] = { slot = tonumber(key), name = it.name, label = item.label or it.name, count = it.count, icon = item.icon, image = item.image,
      weight = item.weight, durability = it.durability, info = it.info, description = item.description, usable = item.use ~= nil or nil }
  end
  table.sort(items, function(a, b) return a.slot < b.slot end)
  return { id = id, label = label, slots = def.slots, maxWeight = def.maxWeight, items = items }
end

-- Who's looking at which stash, so a move there refreshes everyone else's view.
local viewers = {} -- [stash id] = { [src] = true }
local function watching(src, stashId)
  for _, set in pairs(viewers) do set[src] = nil end
  if stashId then
    viewers[stashId] = viewers[stashId] or {}
    viewers[stashId][src] = true
  end
end
-- At most RATE requests a second per player: the page asks far less often, and every move saves
-- the whole file and refreshes the other viewers.
local hits, lastUse, RATE = {}, {}, 10
local function limited(src)
  local now, h = GetGameTimer(), hits[src]
  if not h or now - h.at >= 1000 then h = { at = now, n = 0 }; hits[src] = h end
  h.n = h.n + 1
  return h.n > RATE
end

AddEventHandler('playerDropped', function()
  local src = source
  watching(src, nil)
  hits[src], lastUse[src] = nil, nil
end)

local handlers = {}

handlers.open = function(src, data)
  local data_ = { player = view('player', Config.player.label, Config.player, pockets(src)), hotbar = Config.hotbar }
  local stash = type(data.stash) == 'string' and stashById(data.stash)
  if stash then
    if not ONESYNC then return { ok = false, error = 'Stashes need OneSync on the server.' } end
    if not near(src, stash.coords, stash.radius) then return { ok = false, error = "You're not at the stash." } end
    local slots = container(src, 'stash:' .. stash.id)
    data_.other = view('stash:' .. stash.id, stash.label, stash, slots)
  end
  watching(src, stash and stash.id)
  return { ok = true, data = data_ }
end

handlers.close = function(src)
  watching(src, nil)
  return { ok = true }
end

handlers.hotbar = function(src)
  local inv, items = pockets(src), {}
  for n = 1, Config.hotbar do
    local it = inv[tostring(n)]
    if it then
      local item = Config.items[it.name] or {}
      items[#items + 1] = { slot = n, name = it.name, label = item.label or it.name, count = it.count, icon = item.icon, image = item.image, durability = it.durability }
    end
  end
  return { ok = true, items = items }
end

handlers.move = function(src, data)
  local from, to, count = data.from, data.to, data.count
  if type(from) ~= 'table' or type(to) ~= 'table' then return { ok = false, error = "That can't be moved." } end
  local fromSlots, fromDef = container(src, from.container)
  local toSlots, toDef = container(src, to.container)
  if not fromSlots or not toSlots then return { ok = false, error = "You can't reach that." } end
  local a, b = slotOf(fromDef, from.slot), slotOf(toDef, to.slot)
  if not a or not b then return { ok = false, error = "That slot doesn't exist." } end
  if fromSlots == toSlots and a == b then return { ok = false, error = 'It is already there.' } end
  local item, target = fromSlots[a], toSlots[b]
  if not item then return { ok = false, error = "There's nothing there." } end
  if type(count) ~= 'number' or count ~= math.floor(count) or count < 1 or count > item.count then return { ok = false, error = "You don't have that many." } end
  local unit = (Config.items[item.name] or {}).weight or 0
  local across = fromSlots ~= toSlots

  if not target or stacks(item, target) then
    -- into an empty slot, or onto the same item: the destination must hold the weight
    if across and toDef.maxWeight and weight(toSlots) + unit * count > toDef.maxWeight then return { ok = false, error = "That's too heavy for there." } end
    if target then
      target.count = target.count + count
    else
      toSlots[b] = { name = item.name, count = count, durability = item.durability, info = item.info }
    end
    item.count = item.count - count
    if item.count == 0 then fromSlots[a] = nil end
  else
    -- onto a different item: swap whole stacks, and both sides must hold their new weight
    if count ~= item.count then return { ok = false, error = 'Move the whole stack to swap.' } end
    if across then
      local tunit = (Config.items[target.name] or {}).weight or 0
      local fromAfter = weight(fromSlots) - unit * item.count + tunit * target.count
      local toAfter = weight(toSlots) - tunit * target.count + unit * item.count
      if (fromDef.maxWeight and fromAfter > fromDef.maxWeight) or (toDef.maxWeight and toAfter > toDef.maxWeight) then
        return { ok = false, error = "That's too heavy to swap." }
      end
    end
    fromSlots[a], toSlots[b] = target, item
  end
  save()
  -- everyone else looking at a stash that changed sees it
  for _, ref in ipairs({ from.container, to.container }) do
    local id = type(ref) == 'string' and ref:match('^stash:(.+)$')
    for other in pairs(id and viewers[id] or {}) do
      if other ~= src then TriggerClientEvent('{{name}}:refresh', other) end
    end
  end
  return { ok = true }
end

handlers.use = function(src, data)
  local inv = pockets(src)
  local key = slotOf(Config.player, data.slot)
  local it = key and inv[key]
  local item = it and Config.items[it.name]
  if not item or not item.use then return { ok = false, error = "That can't be used." } end
  local now = GetGameTimer()
  if lastUse[src] and now - lastUse[src] < 1000 then return { ok = false, error = 'Not so fast.' } end
  lastUse[src] = now
  it.count = it.count - 1
  if it.count <= 0 then inv[key] = nil end
  save()
  TriggerClientEvent('{{name}}:effect', src, item.use, it.name)
  return { ok = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if limited(src) then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'Not so fast.' })
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The inventory had a problem. Try again.' })
end)

-- Give an item from the server console (or as an admin with the ace below):
--   {{name}}_give <server id> <item> <count>      e.g. {{name}}_give 1 toolbox 1
--   add_ace group.admin command.{{name}}_give allow
RegisterCommand('{{name}}_give', function(src, args)
  local target, name, count = tonumber(args[1]), args[2], math.floor(tonumber(args[3]) or 1)
  local item = Config.items[name or '']
  if not target or not GetPlayerName(target) or not item or count < 1 then
    print('Usage: {{name}}_give <server id> <item> <count> (items are in config.lua)')
    return
  end
  local inv = pockets(target)
  local per = item.stack == false and 1 or count
  local left = count
  for n = 1, Config.player.slots do
    if left <= 0 then break end
    local key = tostring(n)
    if not inv[key] then
      local put = math.min(per, left)
      inv[key] = { name = name, count = put }
      left = left - put
    end
  end
  save()
  TriggerClientEvent('{{name}}:refresh', target)
  print(('[{{name}}] gave %d %s to %s%s'):format(count - left, name, GetPlayerName(target), left > 0 and (' (%d didn\'t fit)'):format(left) or ''))
end, true)
