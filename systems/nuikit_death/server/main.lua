-- nuikit_death: server
-- Doctors on duty, for Qbox: qbx_ambulancejob only offers "request help" (G) while one is on duty,
-- and asks qbx_core the same way (GetDutyCountType('ems')). Read-only.

local last = {}

RegisterNetEvent('nuikit_death:doctors', function()
  local src = source
  local now = GetGameTimer()
  if last[src] and now - last[src] < 5000 then return end
  last[src] = now
  local count = 0
  if GetResourceState('qbx_core') == 'started' then
    local ok, n = pcall(function() return exports.qbx_core:GetDutyCountType('ems') end)
    if ok and type(n) == 'number' then count = n end
  end
  TriggerClientEvent('nuikit_death:doctors', src, count)
end)

AddEventHandler('playerDropped', function()
  last[source] = nil
end)
