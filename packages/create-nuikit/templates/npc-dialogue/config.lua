Config = {
  -- Talk to the nearest NPC with /{{name}} or E (players can rebind it) within its `radius` metres.
  key = 'E',

  -- The people to talk to. `dialogue` names a tree below. The server checks the player stands here.
  npcs = {
    {
      id = 'marty',
      name = 'Marty',
      role = 'Bartender, The Hen House',
      coords = vector3(128.4, -1297.6, 29.2),
      radius = 2.5,
      dialogue = 'bartender',
    },
  },

  -- The conversations: trees of nodes, on the server only (the page sees one node at a time).
  -- A node: `text` (what the NPC says) and `choices`. A choice:
  --   id, label        the page sends only the id; the server only accepts ids of the current node
  --   requires         { job = 'police' (or { 'police', 'sheriff' }), money = 500, item = { name = 'lockpick', count = 1 } }
  --                    not met: the choice is shown locked, with the reason, and refused if sent anyway
  --   reason           the text shown when locked, instead of "Police only" / "Needs $500" / "Needs Lockpick"
  --   take / give      { money = 500, items = { { name = 'water', count = 1 } } }, all or nothing
  --   next             the node it leads to; leave it out and the conversation ends
  --   cooldown         ms before the same player can take it again (give one to every choice that pays
  --                    and can be reached again, or the loop is free money)
  account = 'cash', -- the account money requirements and prices use
  dialogues = {
    bartender = {
      start = 'greet',
      nodes = {
        greet = {
          text = "Evening. You look like someone who needs a drink, or a favour. Which is it?",
          choices = {
            { id = 'drink', label = 'A drink, please', next = 'drink' },
            { id = 'rumours', label = 'Heard anything lately?', next = 'rumours' },
            { id = 'backroom', label = "I'd like a look in the back room", requires = { money = 500 }, take = { money = 500 }, give = { items = { { name = 'keycard', count = 1 } } }, next = 'backroom' },
            { id = 'leave', label = 'Never mind' },
          },
        },
        drink = {
          text = "Two dollars. Pay me and it's yours.",
          choices = {
            { id = 'pay', label = 'Pay $2', requires = { money = 2 }, take = { money = 2 }, give = { items = { { name = 'water', count = 1 } } }, next = 'greet' },
            { id = 'back', label = 'Actually, no', next = 'greet' },
          },
        },
        rumours = {
          text = "The sergeant at Mission Row has been asking questions. Keep your head down.",
          choices = {
            -- it pays, and the tree leads back here: once every 30 minutes, or it's a money tap
            { id = 'tip', label = 'Ask for a better tip', requires = { job = 'police' }, give = { money = 100 }, cooldown = 30 * 60 * 1000, next = 'greet' },
            { id = 'back', label = 'Thanks', next = 'greet' },
          },
        },
        backroom = {
          text = "Here's the keycard. You didn't get it from me.",
          choices = { { id = 'leave', label = 'Understood' } },
        },
      },
    },
  },

  -- The example's player, in memory: their cash, bank and bag. Config.job, Config.money and
  -- Config.items (below) hand these to your framework instead.
  startCash = 800,
  startBank = 0,
  startJob = 'civilian',
}

if IsDuplicityVersion() then
  -- Your framework's job: return the player's job name (e.g. 'police'), or nil for the example's.
  -- Config.job = function(src)
  --   Qbox:    local p = exports.qbx_core:GetPlayer(src); return p and p.PlayerData.job.name
  --   QBCore:  Player.PlayerData.job.name
  --   ESX:     xPlayer.getJob().name
  -- end
  Config.job = nil

  -- Your framework's money, or nil for the example's. Return the balance; true when it went through.
  -- Config.money = {
  --   Qbox:    get = function(src, account) return exports.qbx_core:GetMoney(src, account) end,
  --            remove = function(src, account, n, why) return exports.qbx_core:RemoveMoney(src, account, n, why) end,
  --            add = function(src, account, n, why) return exports.qbx_core:AddMoney(src, account, n, why) end,
  --   QBCore:  Player.PlayerData.money[account], Player.Functions.RemoveMoney / AddMoney(account, n, why)
  --   ESX:     xPlayer.getAccount(account == 'cash' and 'money' or 'bank').money, removeAccountMoney / addAccountMoney
  -- }
  Config.money = nil

  -- Your framework's inventory, or nil for the example's bag. count returns how many the player has;
  -- add returns true when they got them; remove returns true when it took them (false when they don't have them).
  -- Config.items = {
  --   ox_inventory: count = function(src, name) return exports.ox_inventory:GetItemCount(src, name) end,
  --                 add = function(src, name, n) return exports.ox_inventory:CanCarryItem(src, name, n) and exports.ox_inventory:AddItem(src, name, n) == true end,
  --                 remove = function(src, name, n) return exports.ox_inventory:RemoveItem(src, name, n) == true end,
  --   QBCore:       Player.Functions.GetItemByName(name).amount / AddItem / RemoveItem
  --   ESX:          xPlayer.getInventoryItem(name).count / canCarryItem + addInventoryItem / removeInventoryItem
  -- }
  Config.items = nil
end
