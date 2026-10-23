-- Same event names as qbx_hud / qb-hud, so consumables and scripts that call them keep working:
--   TriggerServerEvent('hud:server:GainStress', amount)
--   TriggerServerEvent('hud:server:RelieveStress', amount)
-- Those come from the client, so a cheat can send them too: each player gets a few per window, and
-- what a client may relieve per minute is capped (Config.limits). Server scripts use the exports,
-- which are not limited.

local function getPlayer(src)
  if GetResourceState('qbx_core') == 'started' then return exports.qbx_core:GetPlayer(src) end
  if GetResourceState('qb-core') == 'started' then return exports['qb-core']:GetCoreObject().Functions.GetPlayer(src) end
end

local function valid(amount)
  return type(amount) == 'number' and amount == amount and amount > 0 and amount <= 100
end

local LIMITS = Config.limits or {}
local EVENTS = LIMITS.events or 10            -- client events per player per window
local WINDOW = LIMITS.window or 10000         -- ms
local RELIEVE = LIMITS.relievePerMinute or 60 -- stress a client may relieve per minute

local budget = {} -- src → { at, n, reliefAt, relief }

--- May this client event go through? `relief` is the amount it would relieve (nil for a gain).
local function allowed(src, relief)
  local now = GetGameTimer()
  local b = budget[src]
  if not b then
    b = { at = now, n = 0, reliefAt = now, relief = 0 }
    budget[src] = b
  end
  if now - b.at >= WINDOW then b.at, b.n = now, 0 end
  if b.n >= EVENTS then return false end
  if relief then
    if now - b.reliefAt >= 60000 then b.reliefAt, b.relief = now, 0 end
    if b.relief + relief > RELIEVE then return false end
    b.relief = b.relief + relief
  end
  b.n = b.n + 1
  return true
end

local function change(src, delta)
  if not Config.enabled then return end
  local player = getPlayer(src)
  if not player or type(player.PlayerData) ~= 'table' then return end
  local data = player.PlayerData
  if delta > 0 and Config.disableForLeo and data.job and data.job.type == 'leo' then return end
  local next = math.max(0, math.min(100, ((data.metadata or {}).stress or 0) + delta))
  player.Functions.SetMetaData('stress', next)
  -- qb-core has no stress statebag; this event is what QBCore HUDs (and nuikit's bridge) listen to
  TriggerClientEvent('hud:client:UpdateStress', src, next)
  if delta > 0 and Config.notify then
    TriggerClientEvent('nuikit_stress:notify', src)
  end
end

RegisterNetEvent('hud:server:GainStress', function(amount)
  local src = source
  if valid(amount) and allowed(src) then change(src, amount) end
end)

RegisterNetEvent('hud:server:RelieveStress', function(amount)
  local src = source
  if valid(amount) and allowed(src, amount) then change(src, -amount) end
end)

AddEventHandler('playerDropped', function() budget[source] = nil end)

local function isPlayer(src) return type(src) == 'number' and src > 0 and src == math.floor(src) end
exports('AddStress', function(src, amount) if isPlayer(src) and valid(amount) then change(src, amount) end end)
exports('RelieveStress', function(src, amount) if isPlayer(src) and valid(amount) then change(src, -amount) end end)
