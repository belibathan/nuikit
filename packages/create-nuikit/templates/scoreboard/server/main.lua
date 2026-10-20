-- {{name}}: server
-- The player list for the scoreboard: server IDs, names, pings, jobs (Config.job) and which
-- activities have enough of a job on duty. Answers one request a second per player at most.

local last = {}

local function title()
  if Config.title and Config.title ~= '' then return Config.title end
  local name = GetConvar('sv_projectName', '')
  if name == '' then name = GetConvar('sv_hostname', '') end
  return (name:gsub('%^%d', '')) -- strip ^1 colour codes
end

--- Config.job, protected: a framework that isn't running must not break the scoreboard.
local function jobOf(src)
  if not Config.job then return nil end
  local ok, job = pcall(Config.job, src)
  return ok and type(job) == 'table' and job or nil
end

RegisterNetEvent('{{name}}:request', function()
  local src = source
  local now = GetGameTimer()
  if last[src] and now - last[src] < 1000 then return end
  last[src] = now

  local players, onDuty = {}, {}
  for _, id in ipairs(GetPlayers()) do
    local n = tonumber(id)
    local job = jobOf(n)
    if job and job.onDuty ~= false and job.name then onDuty[job.name] = (onDuty[job.name] or 0) + 1 end
    players[#players + 1] = {
      id = n,
      name = GetPlayerName(n) or ('Player ' .. id),
      job = job and (job.label or job.name) or nil,
      ping = GetPlayerPing(n),
      you = n == src or nil,
    }
  end

  local activities = {}
  for _, a in ipairs(Config.activities or {}) do
    local have = a.needs and (onDuty[a.needs.job] or 0) or 0
    local need = a.needs and a.needs.count or 0
    activities[#activities + 1] = {
      id = a.id,
      label = a.label,
      available = have >= need,
      detail = a.needs and (have >= need and ('%d %s on duty'):format(have, a.needs.job) or ('Needs %d %s'):format(need, a.needs.job)) or nil,
    }
  end

  TriggerClientEvent('{{name}}:data', src, {
    title = title(),
    players = players,
    max = GetConvarInt('sv_maxclients', 48),
    activities = activities,
  })
end)

AddEventHandler('playerDropped', function()
  last[source] = nil
end)
