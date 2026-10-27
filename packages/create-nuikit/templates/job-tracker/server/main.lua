-- {{name}}: server
-- The jobs, each player's progress through one, and the pay. The page and the client only ask: start
-- a job by id, report a step, abandon. Everything is decided here against Config.jobs: the job
-- exists and the player may take it (job and grade), they stand at its start or at the step's place,
-- the step reported is the current one (order), the items it needs are held, and the pay is paid
-- once, when the last step completes. Requests are rate-limited and one at a time per player.

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

-- Presence checks need OneSync (server-side positions). Without it every request is refused.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  Log.error('OneSync is off. This resource needs it (set onesync on in server.cfg); every request will be refused.')
end

--- Write the save file: encode first, write only when that worked (a save never leaves a half file).
local function save()
  local encoded, reason = JsonSafe.encode(db)
  if not encoded then return Log.error(('%s not saved: %s'):format(Config.saveFile, tostring(reason))) end
  SaveResourceFile(resource, Config.saveFile, encoded, -1)
end
local function owner(src) return GetPlayerIdentifierByType(src, 'license') or ('src:' .. src) end

local function record(src)
  local id = owner(src)
  if not db[id] then
    db[id] = { cash = 0, items = {} }
    for name, n in pairs(Config.startItems or {}) do db[id].items[name] = n end
  end
  return db[id]
end

-- Pay: the framework's (Config.money) or the example's cash.
local function payOut(src, amount, why)
  if Config.money then return Config.money.add(src, amount, why) ~= false end
  local r = record(src)
  r.cash = (r.cash or 0) + amount
  return true
end

-- Items: the framework's (Config.items) or the example's bag.
local function held(src, name)
  if Config.items then return tonumber(Config.items.count(src, name)) or 0 end
  return record(src).items[name] or 0
end
local function takeItems(src, name, n)
  if Config.items then return Config.items.remove(src, name, n) ~= false end
  local bag = record(src).items
  bag[name] = math.max(0, (bag[name] or 0) - n)
  return true
end
local function giveItems(src, name, n)
  if Config.items then return Config.items.add(src, name, n) ~= false end
  local bag = record(src).items
  bag[name] = (bag[name] or 0) + n
  return true
end

-- Progress, in memory: { job = id, step = index, progress = reports done on this step }.
-- It ends with the session (and the job is then free to take again).
local active = {}
local busy, last = {}, {}
AddEventHandler('playerDropped', function()
  local src = source
  active[owner(src)] = nil
  busy[src], last[src] = nil, nil
end)

local function near(src, place)
  local ped = GetPlayerPed(src)
  if not ped or ped == 0 then return false end
  local p, c = GetEntityCoords(ped), place.coords
  local dx, dy, dz = p.x - c.x, p.y - c.y, p.z - c.z
  return dx * dx + dy * dy + dz * dz <= (place.radius + 2.0) ^ 2
end

--- May this player take this job? Fails closed: a job that asks for a framework job needs Config.player.
local function allowed(src, job)
  if not job.job then return true end
  local ok, p = pcall(function() return Config.player and Config.player(src) end)
  if not (ok and type(p) == 'table') or p.job ~= job.job then return false end
  return job.grade == nil or (tonumber(p.grade) or -1) >= job.grade
end

--- What the page shows (registry blocks/job-tracker/nui.ts: JobTrackerData). No coordinates.
local function snapshot(a)
  local job = Config.jobs[a.job]
  local steps = {}
  for i, s in ipairs(job.steps) do
    steps[i] = { id = s.id, label = s.label, description = s.description, count = s.count, unit = s.unit }
  end
  local step = job.steps[a.step]
  return {
    title = job.label, description = job.description, pay = job.pay, steps = steps,
    current = a.step - 1, progress = a.progress,
    action = step and { key = Config.key or 'E', label = step.action or 'Do it' } or nil,
  }
end

local function ok(a) return { ok = true, job = a and snapshot(a) or nil, id = a and a.job or nil } end
local function no(msg) return { ok = false, error = msg } end

local handlers = {}

--- The player's current job (the client asks when it starts, to show it again).
handlers.state = function(src)
  return ok(active[owner(src)])
end

handlers.start = function(src, data)
  local id = owner(src)
  if active[id] then return no('You already have a job. Abandon it first.') end
  local job = type(data.job) == 'string' and Config.jobs[data.job]
  if not job then return no('Unknown job.') end
  if not allowed(src, job) then return no("You can't take this job.") end
  if not near(src, job.start) then return no("You're not at the start of this job.") end
  active[id] = { job = data.job, step = 1, progress = 0 }
  return ok(active[id])
end

handlers.abandon = function(src)
  local id = owner(src)
  if not active[id] then return no("You don't have a job.") end
  active[id] = nil
  return ok(nil)
end

handlers.step = function(src, data)
  local id = owner(src)
  local a = active[id]
  if not a then return no("You don't have a job.") end
  local job = Config.jobs[a.job]
  local step = job.steps[a.step]
  -- Order: only the current step counts. A done, a later or an unknown step is refused.
  if type(data.step) ~= 'string' or data.step ~= step.id then return no("That's not your current step.") end
  if not near(src, step) then return no("You're not at the right place for this step.") end
  local need = step.item
  if need and held(src, need.name) < need.count then return no(("You need %d %s."):format(need.count, need.name)) end

  local count = step.count or 1
  if a.progress + 1 < count then
    a.progress = a.progress + 1
    return ok(a)
  end

  -- The step completes: take its items, move on; the last step pays. The job is cleared before
  -- paying so a second report can't pay twice; if the payment fails, everything is put back.
  busy[src] = true
  local took = true
  if need then
    local tookOk, r = pcall(takeItems, src, need.name, need.count)
    took = tookOk and r
  end
  if not took then
    busy[src] = nil
    return no("Couldn't take what the step needs. Nothing changed.")
  end
  if a.step < #job.steps then
    a.step, a.progress = a.step + 1, 0
    busy[src] = nil
    return ok(a)
  end
  active[id] = nil
  local paidOk, paid = pcall(payOut, src, job.pay, 'job ' .. a.job)
  if not (paidOk and paid) then
    active[id] = { job = a.job, step = a.step, progress = count - 1 }
    if need then pcall(giveItems, src, need.name, need.count) end
    busy[src] = nil
    return no("The payment didn't go through. Try the last step again.")
  end
  busy[src] = nil
  save()
  return { ok = true, job = nil, completed = true, pay = job.pay }
end

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if not ONESYNC then
    TriggerClientEvent('{{name}}:res', src, id, no('This needs OneSync on the server.'))
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  if not handler then
    TriggerClientEvent('{{name}}:res', src, id, no('Unknown request.'))
    return
  end
  -- Rate limit and one at a time: a request that arrives too soon, or while the last one is still
  -- being paid, is refused. (state is a read and is not limited.)
  if name ~= 'state' then
    local now = GetGameTimer()
    if busy[src] or (last[src] and now - last[src] < (Config.minInterval or 750)) then
      TriggerClientEvent('{{name}}:res', src, id, no('Slow down.'))
      return
    end
    last[src] = now
  end
  local good, result = pcall(handler, src, type(data) == 'table' and data or {})
  busy[src] = nil
  if not good then Log.error(('%s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, good and result or no('The job had a problem. Try again.'))
end)
