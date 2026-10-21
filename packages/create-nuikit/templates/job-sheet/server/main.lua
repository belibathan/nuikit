-- {{name}}: server
-- Who works where, at what grade, and who's on duty, kept per player (license) in Config.saveFile.
-- The server builds the sheet's pages for the caller's own job and grade, and checks every row the
-- page sends against the same config and record: the page's idea of which page it is on, which rows
-- exist or whether it's on duty is never used. A real server reads and writes its framework's jobs
-- instead (see the README); keep the same checks.

local resource = GetCurrentResourceName()
local db = json.decode(LoadResourceFile(resource, Config.saveFile) or '{}') or {}
db.members = db.members or {} -- [license] = { job, grade, onDuty, name }

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

--- Whether a row or action is visible to this grade.
local function allowed(item, grade) return grade >= (item.minGrade or 0) end

--- The pages the caller may see: rows above their grade are left out, empty sections dropped.
--- Nothing from the record but the job's name, label, grade label and duty reaches the page.
local function snapshot(src)
  local m, job = memberOf(src)
  if not m then return nil end
  local pages = {}
  local function page(id, p)
    local sections = {}
    for _, s in ipairs(p.sections or {}) do
      local rows = {}
      for _, r in ipairs(s.rows or {}) do
        if allowed(r, m.grade) then
          rows[#rows + 1] = { id = r.id, label = r.label, description = r.description, kbd = r.kbd, meta = r.meta, page = r.page, onDutyOnly = r.onDutyOnly, disabled = r.disabled, tone = r.tone }
        end
      end
      if #rows > 0 then sections[#sections + 1] = { id = s.id, title = s.title, rows = rows } end
    end
    local actions = {}
    for _, a in ipairs(p.actions or {}) do
      if allowed(a, m.grade) then
        actions[#actions + 1] = { id = a.id, label = a.label, primary = a.primary, kbd = a.kbd, onDutyOnly = a.onDutyOnly, disabled = a.disabled }
      end
    end
    pages[#pages + 1] = { id = id, title = p.title or job.label, description = p.description, sections = sections, actions = actions }
  end
  page('root', job.pages.root or {})
  for id, p in pairs(job.pages) do
    if id ~= 'root' then page(id, p) end
  end
  return {
    job = { name = m.job, label = job.label, gradeLabel = (gradeOf(job, m.grade) or {}).label, onDuty = m.onDuty == true },
    side = job.side,
    pages = pages,
  }
end

--- The config row or action `id` on page `pageId` of this job, or nil (a `page` row is never one).
local function rowOf(job, pageId, id)
  local p = type(pageId) == 'string' and job.pages[pageId]
  if not p or type(id) ~= 'string' then return nil end
  for _, s in ipairs(p.sections or {}) do
    for _, r in ipairs(s.rows or {}) do
      if r.id == id and not r.page then return r end
    end
  end
  for _, a in ipairs(p.actions or {}) do
    if a.id == id then return a end
  end
end

local function sync(src, m) Config.sync(src, m.job, m.grade, m.onDuty) end

local NO_JOB = { ok = false, error = "You don't have a job." }

local handlers = {}

handlers.open = function(src)
  local data = snapshot(src)
  if not data then return NO_JOB end
  return { ok = true, data = data }
end

local function setDuty(src, m, on)
  m.onDuty = on
  save()
  sync(src, m)
end

handlers.duty = function(src, data)
  local m = memberOf(src)
  if not m then return NO_JOB end
  if type(data.onDuty) ~= 'boolean' then return { ok = false, error = 'On or off?' } end
  setDuty(src, m, data.onDuty)
  return { ok = true }
end

--- A row: checked here (it exists on that page, grade, duty), then announced for the scripts that
--- do the work. `clockin` / `clockout` are built in and only change duty (the sheet stays open).
handlers.row = function(src, data)
  local m, job = memberOf(src)
  if not m then return NO_JOB end
  local r = rowOf(job, data.page, data.id)
  if not r or not allowed(r, m.grade) or r.disabled then return { ok = false, error = "You can't do that." } end
  if r.onDutyOnly and not m.onDuty then return { ok = false, error = 'Go on duty first.' } end
  if r.id == 'clockin' or r.id == 'clockout' then
    setDuty(src, m, r.id == 'clockin')
    return { ok = true, stay = true }
  end
  TriggerEvent('{{name}}:action', src, m.job, r.id) -- server scripts: AddEventHandler('{{name}}:action', function(src, job, id) … end)
  return { ok = true, job = m.job }
end

-- One request at a time per player: a second one while the first runs is refused, not queued.
local busy = {}

RegisterNetEvent('{{name}}:req', function(id, name, data)
  local src = source
  if busy[src] then
    TriggerClientEvent('{{name}}:res', src, id, { ok = false, error = 'One thing at a time.' })
    return
  end
  busy[src] = true
  local handler = type(name) == 'string' and handlers[name]
  local ok, result = pcall(function() return handler and handler(src, type(data) == 'table' and data or {}) end)
  busy[src] = nil
  if not ok then print(('[{{name}}] %s failed: %s'):format(name, result)) end
  TriggerClientEvent('{{name}}:res', src, id, ok and result or { ok = false, error = 'The job sheet had a problem. Try again.' })
end)

AddEventHandler('playerDropped', function() busy[source] = nil end)

-- Give someone a job from the server console (or as an admin with the ace below):
--   {{name}}_setjob <server id> <job> <grade>      e.g. {{name}}_setjob 1 police 1
--   add_ace group.admin command.{{name}}_setjob allow
RegisterCommand('{{name}}_setjob', function(src, args)
  local target, jobName, grade = tonumber(args[1]), args[2], tonumber(args[3])
  local job = Config.jobs[jobName or '']
  local id = target and license(target)
  if not id or not job or not gradeOf(job, grade) then
    print('Usage: {{name}}_setjob <server id> <job> <grade> (jobs and grades are in config.lua)')
    return
  end
  local m = { job = jobName, grade = grade, onDuty = false, name = GetPlayerName(target) }
  db.members[id] = m
  save()
  sync(target, m)
  print(('[{{name}}] %s is now %s, grade %d'):format(m.name, jobName, grade))
end, true)
