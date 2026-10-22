Config = {
  -- Open the nearest counter with /{{name}} or E (players can rebind it) within `radius` metres.
  key = 'E',

  -- The least time (ms) between one player's requests. Anything faster is refused.
  rateMs = 200,

  -- The most one product can hold when an employee restocks it (a business can set its own maxStock).
  maxStock = 500,

  -- The businesses. Prices and stock live on the server: the page only shows them, and the
  -- business's employees change them inside the range you set here.
  -- Business: id, label, description, coords, radius, job (who works there), manageGrade (the lowest
  -- grade that can manage), payment, open (the starting state), maxStock.
  -- Product: id (your item name), label, price (the starting price), minPrice and maxPrice (the range
  -- employees can set), icon (burger, drink, fries, dessert, part, tool, fuel, box) or image (a URL,
  -- e.g. 'nui://ox_inventory/web/images/water.png'), stock (omit for unlimited: it can't be
  -- restocked), max per order, enabled (false hides it until an employee turns it on).
  businesses = {
    {
      id = 'burgershot',
      label = 'Burger Shot',
      description = 'Open until late',
      coords = vector3(-1194.7, -892.7, 13.9),
      radius = 3.0,
      job = 'burgershot',
      manageGrade = 1,
      payment = { 'cash', 'bank' },
      open = true,
      products = {
        { id = 'burger', label = 'Burger', price = 9, minPrice = 5, maxPrice = 18, icon = 'burger', stock = 30, max = 10 },
        { id = 'fries', label = 'Fries', price = 4, minPrice = 2, maxPrice = 8, icon = 'fries', stock = 40, max = 10 },
        { id = 'cola', label = 'eCola', price = 3, minPrice = 1, maxPrice = 6, icon = 'drink', stock = 40, max = 10 },
        { id = 'shake', label = 'Milkshake', price = 6, minPrice = 3, maxPrice = 12, icon = 'dessert', stock = 0 },
      },
    },
    {
      id = 'bennys',
      label = "Benny's parts",
      description = 'Parts and kits',
      coords = vector3(-211.5, -1325.0, 30.9),
      radius = 3.0,
      job = 'mechanic',
      manageGrade = 1,
      payment = { 'cash', 'bank' },
      open = true,
      products = {
        { id = 'repairkit', label = 'Repair kit', price = 220, minPrice = 120, maxPrice = 400, icon = 'tool', stock = 8, max = 3 },
        { id = 'tyre', label = 'Tyre', price = 85, minPrice = 50, maxPrice = 160, icon = 'part', stock = 16 },
        { id = 'jerrycan', label = 'Jerry can', price = 40, minPrice = 20, maxPrice = 80, icon = 'fuel' },
      },
    },
  },

  -- The example's employees, by license: { job, grade }. A real server reads the player's job from
  -- its framework instead (Config.job, below).
  staff = {
    -- ['license:0123456789abcdef'] = { job = 'burgershot', grade = 1 },
  },

  -- The example's wallet and bag, per player (license), and the businesses' prices, stock and takings,
  -- in this file in the resource. Config.money, Config.items, Config.account (below) hand them to your
  -- framework instead.
  saveFile = 'storefront.json',
  startCash = 500,
  startBank = 2500,
  startBag = { burger = 30, fries = 30, cola = 30, repairkit = 5, tyre = 5 },
}

if IsDuplicityVersion() then
  -- The player's job, or nil for the example's Config.staff. Return the job name and the grade.
  -- Config.job = function(src)
  --   Qbox:    local p = exports.qbx_core:GetPlayer(src); return p.PlayerData.job.name, p.PlayerData.job.grade.level
  --   QBCore:  Player.PlayerData.job.name, Player.PlayerData.job.grade.level
  --   ESX:     xPlayer.getJob().name, xPlayer.getJob().grade
  -- end
  Config.job = nil

  -- Your framework's money for the buyer, or nil for the example's. Return the balance; true when it went through.
  -- Config.money = {
  --   Qbox:    get = function(src, account) return exports.qbx_core:GetMoney(src, account) end,
  --            remove = function(src, account, n, why) return exports.qbx_core:RemoveMoney(src, account, n, why) end,
  --            add = function(src, account, n, why) return exports.qbx_core:AddMoney(src, account, n, why) end,
  --   QBCore:  Player.PlayerData.money[account], Player.Functions.RemoveMoney / AddMoney(account, n, why)
  --   ESX:     xPlayer.getAccount(account == 'cash' and 'money' or 'bank').money, removeAccountMoney / addAccountMoney
  -- }
  Config.money = nil

  -- The business's account (where takings go), or nil for the example's. add returns true when the
  -- money arrived; remove takes it back when a purchase is undone.
  -- Config.account = {
  --   Renewed-Banking: add = function(id, n, why) return exports['Renewed-Banking']:addAccountMoney(id, n) end,
  --                    remove = function(id, n, why) return exports['Renewed-Banking']:removeAccountMoney(id, n) end,
  --   qb-management:   exports['qb-management']:AddMoney(job, n) / RemoveMoney(job, n)
  --   esx_society:     TriggerEvent('esx_addonaccount:getSharedAccount', 'society_' .. job, function(a) a.addMoney(n) end)
  -- }
  Config.account = nil

  -- Your framework's inventory, or nil for the example's bag. add returns true when the player got
  -- them (false when they can't carry them); remove takes them (true when it did: a restock and an
  -- undone purchase use it); count is how many the player has.
  -- Config.items = {
  --   ox_inventory: add = function(src, name, n) return exports.ox_inventory:CanCarryItem(src, name, n) and exports.ox_inventory:AddItem(src, name, n) == true end,
  --                 remove = function(src, name, n) return exports.ox_inventory:RemoveItem(src, name, n) end,
  --                 count = function(src, name) return exports.ox_inventory:GetItemCount(src, name) end,
  --   QBCore:       Player.Functions.AddItem(name, n) / RemoveItem(name, n), GetItemByName(name).amount
  --   ESX:          xPlayer.canCarryItem(name, n) and xPlayer.addInventoryItem(name, n) / removeInventoryItem(name, n), getInventoryItem(name).count
  -- }
  Config.items = nil
end
