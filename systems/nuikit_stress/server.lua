-- Same event names as qbx_hud / qb-hud, so consumables and scripts that call them keep working:
--   TriggerServerEvent('hud:server:GainStress', amount)
--   TriggerServerEvent('hud:server:RelieveStress', amount)

local function getPlayer(src)
  if GetResourceState('qbx_core') == 'started' then return exports.qbx_core:GetPlayer(src) end
  if GetResourceState('qb-core') == 'started' then return exports['qb-core']:GetCoreObject().Functions.GetPlayer(src) end
end

local function valid(amount)
  return type(amount) == 'number' and amount == amount and amount > 0 and amount <= 100
end

local function change(src, delta)
  if not Config.enabled then return end
  local player = getPlayer(src)
  if not player then return end
  local data = player.PlayerData
  if delta > 0 and Config.disableForLeo and data.job and data.job.type == 'leo' then return end
  local next = math.max(0, math.min(100, (data.metadata.stress or 0) + delta))
  player.Functions.SetMetaData('stress', next)
  -- qb-core has no stress statebag; this event is what QBCore HUDs (and nuikit's bridge) listen to
  TriggerClientEvent('hud:client:UpdateStress', src, next)
  if delta > 0 and Config.notify then
    TriggerClientEvent('nuikit_stress:notify', src)
  end
end

RegisterNetEvent('hud:server:GainStress', function(amount)
  if valid(amount) then change(source, amount) end
end)

RegisterNetEvent('hud:server:RelieveStress', function(amount)
  if valid(amount) then change(source, -amount) end
end)

exports('AddStress', function(src, amount) if valid(amount) then change(src, amount) end end)
exports('RelieveStress', function(src, amount) if valid(amount) then change(src, -amount) end end)
