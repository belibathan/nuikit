-- {{name}}: server
-- Who works where, at what grade, and who's on duty, kept per player (license) in Config.saveFile.
-- Every request from the page comes through here and is checked against the caller's own record:
-- the page's idea of who's boss, who can be fired or what grade exists is never used. A real
-- server reads and writes its framework's jobs instead (see the README); keep the same checks.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
db.members = db.members or {}   -- [license] = { cid, job, grade, onDuty, name }
db.accounts = db.accounts or {} -- [job] = balance
db.n = db.n or 0

-- Hiring checks that the new hire stands next to the boss, which needs OneSync (server-side
-- positions). Without it everything else works and hiring is refused; say so at start.
local ONESYNC = GetConvar('onesync', 'off') ~= 'off'
if not ONESYNC then
  print(('^3[%s] OneSync is off: bosses can\'t see or hire nearby players (set onesync on in server.cfg). Everything else works.^0'):format(resource))
end

local function save() SaveResourceFile(resource, Config.saveFile, json.encode(db), -1) end
local function license(src) return GetPlayerIdentifierByType(src, 'license') end

--- The caller's own record and job config, or nil.
local function memberOf(src)
  local id = license(src)
  local m = id and db.members[id]
  local job = m and Config.jobs[m.job]
  if not job then return nil end
  return m, job, id
end

local function gradeOf(job, g)
  if type(g) ~= 'number' or g ~= math.floor(g) then return nil end
  for _, x in ipairs(job.grades) do
    if x.grade == g then return x end
  end
end

local function isBoss(job, g) local x = gradeOf(job, g) return x and x.boss == true end
local function lowest(job)
  local low
  for _, x in ipairs(job.grades) do
    if not x.boss and (not low or x.grade < low) then low = x.grade end
  end
  return low or 0
end

--- Online players by license, so the staff list can say who's online and Config.sync can reach them.
local function online()
  local by = {}
  for _, s in ipairs(GetPlayers()) do
    local src = tonumber(s)
    local id = src and license(src)
    if id then by[id] = src end
  end
  return by
end

--- A member of the caller's job by the page's employee id (cid), or nil. Never by license.
local function staffById(jobName, cid)
  if type(cid) ~= 'string' or #cid > 16 then return nil end
  for id, m in pairs(db.members) do
    if m.cid == cid and m.job == jobName then return m, id end
  end
end

local function sync(id, m)
  local src = online()[id]
  if src then Config.sync(src, m and m.job, m and m.grade, m and m.onDuty) end
end

--- Players within Config.hireRadius of the boss who don't work here yet.
local function nearby(src, jobName)
  if not ONESYNC then return {} end
  local me = GetPlayerPed(src)
  if not me or me == 0 then return {} end
  local p, out = GetEntityCoords(me), {}
  for _, s in ipairs(GetPlayers()) do
    local other = tonumber(s)
    local ped = other and other ~= src and GetPlayerPed(other)
    if ped and ped ~= 0 then
      local q = GetEntityCoords(ped)
      local dx, dy, dz = p.x - q.x, p.y - q.y, p.z - q.z
      local m = db.members[license(other) or '']
      if dx * dx + dy * dy + dz * dz <= Config.hireRadius ^ 2 and not (m and m.job == jobName) then
        out[#out + 1] = { id = other, name = GetPlayerName(other) }
      end
    end
  end
  return out
end

--- What the page shows (web/src/components/blocks/job-menu/nui.ts: JobMenuData).
local function snapshot(src)
  local m, job = memberOf(src)
  if not m then return nil end
  local actions = {}
  for _, a in ipairs(job.actions or {}) do
    if m.grade >= (a.minGrade or 0) then
      actions[#actions + 1] = { id = a.id, label = a.label, description = a.description, onDutyOnly = a.onDutyOnly }
    end
  end
  local data = {
    job = { name = m.job, label = job.label, gradeLabel = (gradeOf(job, m.grade) or {}).label, onDuty = m.onDuty == true },
    actions = actions,
  }
  if isBoss(job, m.grade) then
    local on, me, staff = online(), license(src), {}
    for id, x in pairs(db.members) do
      if x.job == m.job then
        local s = on[id]
        staff[#staff + 1] = { id = x.cid, name = x.name or 'Unknown', grade = x.grade, online = s ~= nil, onDuty = s ~= nil and x.onDuty == true, you = id == me or nil }
      end
    end
    local grades = {}
    for _, x in ipairs(job.grades) do grades[#grades + 1] = { grade = x.grade, label = x.label, boss = x.boss } end
    data.boss = { employees = staff, grades = grades, balance = db.accounts[m.job] or job.startBalance, nearby = nearby(src, m.job) }
  end
  return data
end

local NO_JOB = { ok = false, error = "You don't have a job." }
local BOSS_ONLY = { ok = false, error = 'Only the boss can do that.' }

local handlers = {}

handlers.open = function(src)
  local data = snapshot(src)
  if not data then return NO_JOB end
  return { ok = true, data = data }
end

handlers.duty = function(src, data)
  local m, _, id = memberOf(src)
  if not m then return NO_JOB end
  if type(data.onDuty) ~= 'boolean' then return { ok = false, error = 'On or off?' } end
  m.onDuty = data.onDuty
  save()
  sync(id, m)
  return { ok = true }
end

--- A job action: checked here (grade, duty), then announced for the scripts that do the work.
handlers.action = function(src, data)
  local m, job = memberOf(src)
  if not m then return NO_JOB end
  for _, a in ipairs(job.actions or {}) do
    if a.id == data.id and m.grade >= (a.minGrade or 0) then
      if a.onDutyOnly and not m.onDuty then return { ok = false, error = 'Go on duty first.' } end
      TriggerEvent('{{name}}:action', src, m.job, a.id) -- server scripts: AddEventHandler('{{name}}:action', function(src, job, id) … end)
      return { ok = true, job = m.job }
    end
  end
  return { ok = false, error = "You can't do that." }
end

-- Staff: the caller must be the boss of their own job, checked from the store on every request.

handlers.hire = function(src, data)
  local m, job = memberOf(src)
  if not m then return NO_JOB end
  if not isBoss(job, m.grade) then return BOSS_ONLY end
  if not ONESYNC then return { ok = false, error = 'Hiring needs OneSync on the server.' } end
  local target = data.player
  if type(target) ~= 'number' or target ~= math.floor(target) or not GetPlayerName(target) then return { ok = false, error = "They're not online." } end
  if target == src then return { ok = false, error = "That's you." } end
  local id = license(target)
  if not id then return { ok = false, error = "They're not online." } end
  local ok = false
  for _, p in ipairs(nearby(src, m.job)) do if p.id == target then ok = true end end
  local them = db.members[id]
  if them and them.job == m.job then return { ok = false, error = 'They already work here.' } end
  if not ok then return { ok = false, error = 'Stand next to them to hire them.' } end
  db.n = db.n + 1
  them = { cid = (them and them.cid) or ('E%05d'):format(db.n), job = m.job, grade = lowest(job), onDuty = false, name = GetPlayerName(target) }
  db.members[id] = them
  save()
  sync(id, them)
  return { ok = true }
end

--- The target must work in the caller's job, not be the caller, and not hold the boss grade.
local function staffTarget(src, data)
  local m, job, me = memberOf(src)
  if not m then return nil, NO_JOB end
  if not isBoss(job, m.grade) then return nil, BOSS_ONLY end
  local them, id = staffById(m.job, data.id)
  if not them then return nil, { ok = false, error = "They don't work here." } end
  if id == me then return nil, { ok = false, error = "You can't do that to yourself." } end
  if isBoss(job, them.grade) then return nil, { ok = false, error = "The boss can't be fired or regraded from here." } end
  return them, id, job
end

handlers.fire = function(src, data)
  local them, id = staffTarget(src, data)
  if not them then return id end
  db.members[id] = nil
  save()
  sync(id, nil)
  return { ok = true }
end

handlers.grade = function(src, data)
  local them, id, job = staffTarget(src, data)
  if not them then return id end
  local g = gradeOf(job, data.grade)
  if not g then return { ok = false, error = "That grade doesn't exist." } end
  if g.boss then return { ok = false, error = "You can't make someone boss from here." } end
  them.grade = g.grade
  save()
  sync(id, them)
  return { ok = true }
end

-- At most RATE requests a second per player: the menu asks far less often, and each one may save,
-- sync the framework or announce an action that spawns something.
local hits, RATE = {}, 10
local function limited(src)
  local now, h = GetGameTimer(), hits[src]
  if not h or now - h.at >= 1000 then h = { at = now, n = 0 }; hits[src] = h end
  h.n = h.n + 1
  return h.n > RATE
end
AddEventHandler('playerDropped', function() hits[source] = nil end)

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if limited(src) then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'Not so fast.' })
    return
  end
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The job menu had a problem. Try again.' })
end)

-- Give someone a job from the server console (or as an admin with the ace below):
--   {{name}}_setjob <server id> <job> <grade>      e.g. {{name}}_setjob 1 police 4
--   add_ace group.admin command.{{name}}_setjob allow
RegisterCommand('{{name}}_setjob', function(src, args)
  local target, jobName, grade = tonumber(args[1]), args[2], tonumber(args[3])
  local job = Config.jobs[jobName or '']
  local id = target and license(target)
  if not id or not job or not gradeOf(job, grade) then
    print('Usage: {{name}}_setjob <server id> <job> <grade> (jobs and grades are in config.lua)')
    return
  end
  local m = db.members[id]
  if not m then db.n = db.n + 1 end
  m = { cid = (m and m.cid) or ('E%05d'):format(db.n), job = jobName, grade = grade, onDuty = false, name = GetPlayerName(target) }
  db.members[id] = m
  save()
  sync(id, m)
  print(('[{{name}}] %s is now %s, grade %d'):format(m.name, jobName, grade))
end, true)
