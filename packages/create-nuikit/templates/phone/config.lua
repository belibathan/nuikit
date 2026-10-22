Config = {
  -- Open and close the phone with /{{name}} or this key (players can rebind it in Settings → Key Bindings → FiveM).
  key = 'F1',

  -- Numbers are `prefix` plus four digits (555-0142), assigned by the server the first time a player
  -- opens their phone.
  prefix = '555',

  -- Limits, all checked on the server (the page shows them, it doesn't enforce them).
  maxContacts = 50,  -- contacts per player
  maxName = 24,      -- characters in a contact's name
  maxText = 240,     -- characters in a text
  maxMessages = 100, -- messages kept per thread (the newest)
  maxThreads = 30,   -- threads kept per player (the quietest goes first)

  -- At most `max` requests (adding a contact, sending a text) per `window` seconds, per player.
  rate = { max = 5, window = 10 },
}

if IsDuplicityVersion() then
  -- Who may use a phone: return true or false for the player `src`, or leave nil to allow everyone.
  -- Config.hasPhone = function(src)
  --   ox_inventory: return exports.ox_inventory:GetItemCount(src, 'phone') > 0
  --   QBCore:       local p = exports['qb-core']:GetCoreObject().Functions.GetPlayer(src); return p and p.Functions.GetItemByName('phone') ~= nil
  --   ESX:          return ESX.GetPlayerFromId(src).getInventoryItem('phone').count > 0
  -- end
  Config.hasPhone = nil
end
