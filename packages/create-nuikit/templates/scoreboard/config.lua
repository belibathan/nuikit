Config = {
  -- '' uses the server's sv_projectName.
  title = '',
  -- HOME by default; players can rebind it in Settings → Key Bindings → FiveM.
  key = 'HOME',

  -- What can be done right now, and the job it needs on duty. Counting jobs needs Config.job below;
  -- without it every `needs` reads 0 and those activities show as unavailable. {} hides the panel.
  activities = {
    { id = 'store', label = 'Store robbery', needs = { job = 'police', count = 2 } },
    { id = 'bank', label = 'Fleeca bank', needs = { job = 'police', count = 4 } },
    { id = 'pacific', label = 'Pacific Standard', needs = { job = 'police', count = 6 } },
  },
}

-- Server only: a player's job, for the list and for counting `needs`. Return a table
-- { name = 'police', label = 'LSPD', onDuty = true } or nil. Uncomment the one for your framework.
if IsDuplicityVersion() then
  function Config.job(src)
    -- Qbox:
    -- local p = exports.qbx_core:GetPlayer(src)
    -- return p and { name = p.PlayerData.job.name, label = p.PlayerData.job.label, onDuty = p.PlayerData.job.onduty }
    -- QBCore:
    -- local p = exports['qb-core']:GetCoreObject().Functions.GetPlayer(src)
    -- return p and { name = p.PlayerData.job.name, label = p.PlayerData.job.label, onDuty = p.PlayerData.job.onduty }
    -- ESX:
    -- local x = exports.es_extended:getSharedObject().GetPlayerFromId(src)
    -- return x and { name = x.job.name, label = x.job.label, onDuty = true }
    return nil
  end
end
