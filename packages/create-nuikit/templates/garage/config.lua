Config = {
  -- Where the garages are. Open one with /{{name}} (or F6) within `radius` metres of it.
  garages = {
    { id = 'legion', label = 'Legion Square', coords = vector3(215.8, -810.1, 30.7), spawn = vector4(229.7, -800.2, 30.6, 160.0) },
    { id = 'pillbox', label = 'Pillbox Hill', coords = vector3(275.2, -345.6, 45.2), spawn = vector4(266.0, -332.1, 44.9, 250.0) },
  },
  radius = 25.0,
  key = 'F6',

  -- The example keeps vehicles in vehicles.json in this resource, per player (license). It lets a
  -- player store any vehicle they drive; a real server checks ownership in its framework's vehicle
  -- table (player_vehicles, owned_vehicles) and keeps the record there.
  saveFile = 'vehicles.json',
}

-- Server only: take the impound fee. Return true when paid. Uncomment the one for your framework.
if IsDuplicityVersion() then
  function Config.charge(src, amount)
    -- Qbox:    return exports.qbx_core:RemoveMoney(src, 'bank', amount, 'impound')
    -- QBCore:  local p = exports['qb-core']:GetCoreObject().Functions.GetPlayer(src); return p and p.Functions.RemoveMoney('bank', amount, 'impound')
    -- ESX:     local x = exports.es_extended:getSharedObject().GetPlayerFromId(src); if x and x.getAccount('bank').money >= amount then x.removeAccountMoney('bank', amount) return true end return false
    return true -- standalone: free
  end
end
