Config = {
  -- Open the nearest shop with /{{name}} or E (players can rebind it) within `radius` metres.
  key = 'E',

  -- The shops. Prices and stock live here, on the server's side: the page only shows them.
  -- Items: id (your item name), label, price, icon (drink, coffee, food, snack, phone, radio,
  -- medical, tool, key, box, shirt, fuel, light, battery) or image (a URL, e.g.
  -- 'nui://ox_inventory/web/images/water.png'), category, stock (omit for unlimited; it refills
  -- on restart), max per purchase.
  shops = {
    {
      id = '247-innocence',
      label = '24/7, Innocence Blvd',
      coords = vector3(25.7, -1347.3, 29.5),
      radius = 3.0,
      payment = { 'cash', 'bank' },
      categories = { { id = 'food', label = 'Food & drink' }, { id = 'tools', label = 'Tools' }, { id = 'tech', label = 'Tech' } },
      items = {
        { id = 'water', label = 'Water', price = 2, icon = 'drink', category = 'food', stock = 50, max = 10 },
        { id = 'cola', label = 'eCola', price = 3, icon = 'drink', category = 'food', stock = 30, max = 10 },
        { id = 'sandwich', label = 'Sandwich', price = 6, icon = 'food', category = 'food', stock = 20 },
        { id = 'bandage', label = 'Bandage', price = 25, icon = 'medical', category = 'tools', stock = 15, max = 5 },
        { id = 'flashlight', label = 'Flashlight', price = 40, icon = 'light', category = 'tools', stock = 5 },
        { id = 'phone', label = 'Phone', price = 450, icon = 'phone', category = 'tech', stock = 3, max = 1 },
        { id = 'radio', label = 'Radio', price = 250, icon = 'radio', category = 'tech', stock = 5, max = 1 },
      },
    },
  },

  -- The example's wallet and bag, per player (license), in this file in the resource. Config.money
  -- and Config.items (below) hand them to your framework instead.
  saveFile = 'shop.json',
  startCash = 500,
  startBank = 2500,
}

if IsDuplicityVersion() then
  -- Your framework's money, or nil for the example's. Return the balance; true when it went through.
  -- Config.money = {
  --   Qbox:    get = function(src, account) return exports.qbx_core:GetMoney(src, account) end,
  --            remove = function(src, account, n, why) return exports.qbx_core:RemoveMoney(src, account, n, why) end,
  --            add = function(src, account, n, why) return exports.qbx_core:AddMoney(src, account, n, why) end,
  --   QBCore:  Player.PlayerData.money[account], Player.Functions.RemoveMoney / AddMoney(account, n, why)
  --   ESX:     xPlayer.getAccount(account == 'cash' and 'money' or 'bank').money, removeAccountMoney / addAccountMoney
  -- }
  Config.money = nil

  -- Your framework's inventory, or nil for the example's bag. add returns true when the player got
  -- them (false when they can't carry them); remove takes them back after a failed purchase.
  -- Config.items = {
  --   ox_inventory: add = function(src, name, n) return exports.ox_inventory:CanCarryItem(src, name, n) and exports.ox_inventory:AddItem(src, name, n) == true end,
  --                 remove = function(src, name, n) return exports.ox_inventory:RemoveItem(src, name, n) end,
  --   QBCore:       Player.Functions.AddItem(name, n) / RemoveItem(name, n)
  --   ESX:          xPlayer.canCarryItem(name, n) and xPlayer.addInventoryItem(name, n) / removeInventoryItem(name, n)
  -- }
  Config.items = nil
end
