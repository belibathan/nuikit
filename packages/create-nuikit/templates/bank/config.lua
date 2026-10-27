-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Where players can open the bank (/{{name}} or F9 within `radius` metres). ATMs: no transfers.
  banks = {
    { label = 'Fleeca, Legion Square', coords = vector3(149.9, -1040.5, 29.4) },
    { label = 'Pacific Standard', coords = vector3(247.9, 223.6, 106.3) },
  },
  atms = {
    vector3(147.6, -1035.8, 29.3),
    vector3(-386.7, 6046.1, 31.5),
  },
  radius = 3.0,
  key = 'F9',

  -- The example keeps cash, a checking and a savings account and the last transactions per player
  -- (license) in bank.json in this resource. On a framework server, fill in Config.money below so
  -- cash and checking are the framework's own; savings stays the example's.
  saveFile = 'bank.json',
  startCash = 500,
  startBank = 2500,
}

-- Server only: the framework's money, or nil to use the example's. Uncomment the one for yours.
if IsDuplicityVersion() then
  Config.money = nil
  -- Qbox:
  -- Config.money = {
  --   get = function(src, account) return exports.qbx_core:GetMoney(src, account) end,            -- account: 'cash' | 'bank'
  --   add = function(src, account, amount, why) return exports.qbx_core:AddMoney(src, account, amount, why) end,
  --   remove = function(src, account, amount, why) return exports.qbx_core:RemoveMoney(src, account, amount, why) end,
  -- }
  -- QBCore: the same with exports['qb-core']:GetCoreObject().Functions.GetPlayer(src).Functions.{GetMoney,AddMoney,RemoveMoney}
  -- ESX: xPlayer.getAccount('money' | 'bank').money, addAccountMoney, removeAccountMoney
end
