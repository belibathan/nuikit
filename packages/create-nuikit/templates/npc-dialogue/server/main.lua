-- {{name}}: server
-- The conversations. The trees live in Config.dialogues, only here: the page gets one node at a time
-- and sends back only the id of a choice. The server remembers which node each player is on and
-- accepts only ids that node offers; it checks the player stands at the NPC, re-checks the choice's
-- requirements (job, money, item), rate-limits, and applies its actions (money and items, taken and
-- given) all or nothing: if any step fails, the steps already done are undone.

local resource = GetCurrentResourceName()

-- The NPC check uses the player's position, which needs OneSync (server-side positions). Without it
-- the dialogue refuses to open; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  Log.error('OneSync is off. This dialogue needs it (set onesync on in server.cfg); every request will be refused.')
end

local ACCOUNT = Config.account or 'cash'
local MIN_GAP = 400 -- ms between two choices from one player

-- ───────────────────────────────── the world: the framework's (Config.*) or the example's

local players = {} -- the example's players, in memory, by license
local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function record(src)
  local id = owner(src)
  players[id] = players[id] or { cash = Config.startCash, bank = Config.startBank, job = Config.startJob, items = {} }
  return players[id]
end

local function jobOf(src)
  if Config.job then return Config.job(src) end
  return record(src).job
end

local function balance(src, account)
  if Config.money then return Config.money.get(src, account) or 0 end
  return record(src)[account] or 0
end
local function moneyRemove(src, account, amount, why)
  if Config.money then return Config.money.remove(src, account, amount, why) ~= false end
  local r = record(src)
  if (r[account] or 0) < amount then return false end
  r[account] = r[account] - amount
  return true
end
local function moneyAdd(src, account, amount, why)
  if Config.money then return Config.money.add(src, account, amount, why) ~= false end
  local r = record(src)
  r[account] = (r[account] or 0) + amount
  return true
end

local function itemCount(src, name)
  if Config.items then return Config.items.count(src, name) or 0 end
  return record(src).items[name] or 0
end
local function itemAdd(src, name, count)
  if Config.items then return Config.items.add(src, name, count) == true end
  local bag = record(src).items
  bag[name] = (bag[name] or 0) + count
  return true
end
local function itemRemove(src, name, count)
  if Config.items then return Config.items.remove(src, name, count) == true end
  local bag = record(src).items
  if (bag[name] or 0) < count then return false end
  bag[name] = bag[name] - count
  return true
end

-- ───────────────────────────────── the trees

local function npcById(id)
  if type(id) ~= 'string' then return nil end
  for _, n in ipairs(Config.npcs) do
    if n.id == id then return n end
  end
end

local function nodeOf(npc, id)
  local tree = Config.dialogues[npc.dialogue]
  return tree and tree.nodes[id]
end

-- Catch a broken tree at start, not in front of a player: a missing tree, start node or `next`.
for _, npc in ipairs(Config.npcs) do
  local tree = Config.dialogues[npc.dialogue]
  if not tree or not tree.nodes[tree.start] then
    Log.error(('npc %s: dialogue "%s" or its start node is missing'):format(npc.id, tostring(npc.dialogue)))
  else
    for nodeId, node in pairs(tree.nodes) do
      for _, c in ipairs(node.choices or {}) do
        if c.next and not tree.nodes[c.next] then
          Log.error(('dialogue %s, node %s, choice %s: next "%s" does not exist'):format(npc.dialogue, nodeId, c.id, c.next))
        end
      end
    end
  end
end

local function near(src, npc)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return false end
  local p, c = GetEntityCoords(ped), npc.coords
  local dx, dy, dz = p.x - c.x, p.y - c.y, p.z - c.z
  return dx * dx + dy * dy + dz * dz <= (npc.radius + 2.0) ^ 2
end

local function cap(s) return (tostring(s):gsub('^%l', string.upper)) end

--- Why this player can't take the choice, in a few words, or nil. The money and items it takes
--- count as requirements too, so a choice can't be taken that it couldn't pay for.
local function unmet(src, c)
  local req, take = c.requires or {}, c.take or {}
  local reason
  if req.job then
    local jobs = type(req.job) == 'table' and req.job or { req.job }
    local mine = jobOf(src)
    local ok = false
    for _, j in ipairs(jobs) do if j == mine then ok = true end end
    if not ok then
      local names = {}
      for i, j in ipairs(jobs) do names[i] = cap(j) end
      reason = table.concat(names, ' or ') .. ' only'
    end
  end
  local need = math.max(req.money or 0, take.money or 0)
  if not reason and need > 0 and balance(src, ACCOUNT) < need then reason = ('Needs $%d'):format(need) end
  if not reason then
    local items = {}
    if req.item then items[#items + 1] = req.item end
    for _, i in ipairs(take.items or {}) do items[#items + 1] = i end
    for _, i in ipairs(items) do
      if itemCount(src, i.name) < (i.count or 1) then reason = 'Needs ' .. cap(i.name) break end
    end
  end
  if reason then return c.reason or reason end
end

--- What the page shows (components/blocks/npc-dialogue/nui.ts: DialogueData).
local function view(src, npc, nodeId)
  local node = nodeOf(npc, nodeId)
  local choices = {}
  for i, c in ipairs(node.choices or {}) do
    local why = unmet(src, c)
    choices[i] = { id = c.id, label = c.label, locked = why and true or nil, lockedReason = why }
  end
  return { speaker = npc.name, role = npc.role, text = node.text, choices = choices }
end

-- ───────────────────────────────── actions, all or nothing

--- Take and give what the choice says, in order. A step that fails (refused, or throws) undoes the
--- steps before it, newest first. Returns true when every step went through.
local function apply(src, npc, c)
  local take, give, why = c.take or {}, c.give or {}, 'dialogue ' .. npc.id
  local steps = {} -- { run, undo }
  if take.money then
    local n = take.money
    steps[#steps + 1] = { function() return moneyRemove(src, ACCOUNT, n, why) end, function() return moneyAdd(src, ACCOUNT, n, why .. ' refund') end }
  end
  for _, i in ipairs(take.items or {}) do
    steps[#steps + 1] = { function() return itemRemove(src, i.name, i.count or 1) end, function() return itemAdd(src, i.name, i.count or 1) end }
  end
  for _, i in ipairs(give.items or {}) do
    steps[#steps + 1] = { function() return itemAdd(src, i.name, i.count or 1) end, function() return itemRemove(src, i.name, i.count or 1) end }
  end
  if give.money then
    local n = give.money
    steps[#steps + 1] = { function() return moneyAdd(src, ACCOUNT, n, why) end, function() return moneyRemove(src, ACCOUNT, n, why .. ' undo') end }
  end

  for i, step in ipairs(steps) do
    local ran, ok = pcall(step[1])
    if not (ran and ok) then
      for j = i - 1, 1, -1 do
        local undone, back = pcall(steps[j][2])
        if not (undone and back) then
          Log.error(('could not undo a step of "%s" for %s: fix it by hand'):format(c.id, owner(src)))
        end
      end
      return false
    end
  end
  return true
end

-- ───────────────────────────────── requests

local talking = {}  -- src → { npc = id, node = id }
local busy, lastAt = {}, {}
local usedAt = {}   -- license .. '|' .. npc .. '|' .. choice → GetGameTimer() when it last went through (choice.cooldown)
AddEventHandler('playerDropped', function()
  local src = source
  talking[src], busy[src], lastAt[src] = nil, nil, nil
end)

local handlers = {}

handlers.open = function(src, data)
  local npc = npcById(data.npc)
  if not npc then return { ok = false, error = 'Unknown person.' } end
  if not near(src, npc) then return { ok = false, error = "You're not close enough to talk." } end
  local tree = Config.dialogues[npc.dialogue]
  if not tree or not tree.nodes[tree.start] then return { ok = false, error = "They have nothing to say." } end
  talking[src] = { npc = npc.id, node = tree.start }
  return { ok = true, data = view(src, npc, tree.start) }
end

handlers.leave = function(src)
  talking[src] = nil
  return { ok = true }
end

handlers.choose = function(src, data)
  local now = GetGameTimer()
  if lastAt[src] and now - lastAt[src] < MIN_GAP then return { ok = false, error = 'Slow down a moment.' } end
  lastAt[src] = now

  local st = talking[src]
  if not st then return { ok = false, error = "You're not talking to anyone." } end
  local npc = npcById(st.npc)
  if not near(src, npc) then
    talking[src] = nil
    return { ok = false, error = 'You walked away.' }
  end
  if busy[src] then return { ok = false, error = 'Hold on, one moment.' } end

  -- Only an id the current node offers. Anything else, whatever the page believes, is refused.
  local id = data.choice
  local choice
  if type(id) == 'string' then
    for _, c in ipairs(nodeOf(npc, st.node).choices or {}) do
      if c.id == id then choice = c break end
    end
  end
  if not choice then return { ok = false, error = "That's not an option." } end

  local why = unmet(src, choice)
  if why then return { ok = false, error = "You can't choose that: " .. why:lower() .. '.' } end
  if choice.next and not nodeOf(npc, choice.next) then return { ok = false, error = "They don't know what to say." } end
  -- A choice with a cooldown (one that pays, say) goes through once per `cooldown` ms per player,
  -- however often the tree leads back to it. Keyed by license, so a reconnect doesn't reset it.
  local key = owner(src) .. '|' .. npc.id .. '|' .. choice.id
  if choice.cooldown and usedAt[key] and now - usedAt[key] < choice.cooldown then
    return { ok = false, error = 'Not again so soon.' }
  end

  busy[src] = true
  local done = apply(src, npc, choice)
  busy[src] = nil
  if not done then return { ok = false, error = "That didn't go through. Nothing changed." } end
  if choice.cooldown then usedAt[key] = now end

  if choice.next then
    st.node = choice.next
    return { ok = true, data = view(src, npc, choice.next) }
  end
  talking[src] = nil
  return { ok = true, ended = true }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if not ONESYNC then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'This dialogue needs OneSync on the server.' })
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then
    busy[src] = nil
    Log.error(('%s failed: %s'):format(name, result))
  end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'They had a problem. Try again.' })
end)
