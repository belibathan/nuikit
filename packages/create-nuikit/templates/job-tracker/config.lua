-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Press this near a job's start to take it, and near the current step's place to do it
  -- (players can rebind it). /{{name}}manage (default J) focuses the panel to abandon.
  key = 'E',
  manageKey = 'J',

  -- The jobs. The server owns all of this: the page never sends a place, a pay or a count.
  --   start:  where to take the job { coords, radius }
  --   job, grade: optional; the player's framework job (and the lowest grade) needed to take it
  --   pay:    paid once, when the last step is done
  --   steps:  in order. Each: id, label, description, action (the prompt: "Load a box"),
  --           coords + radius (where it can be done), count (it takes this many reports, default 1),
  --           unit ("boxes", for the meter), item = { name, count } (the player must hold them; they
  --           are taken when the step completes)
  jobs = {
    parcels = {
      label = 'Parcel run',
      description = 'Collect, deliver',
      pay = 850,
      start = { coords = vector3(-1081.0, -2243.0, 13.2), radius = 3.0 },
      -- job = 'courier', grade = 0,
      steps = {
        { id = 'collect', label = 'Collect the parcels', description = 'Sorting office', action = 'Take a parcel',
          coords = vector3(-1085.5, -2250.0, 13.2), radius = 3.0, count = 3, unit = 'parcels' },
        { id = 'deliver', label = 'Deliver them', description = 'Marked on your map', action = 'Hand them over',
          coords = vector3(-47.0, -1757.0, 29.4), radius = 3.0, item = { name = 'parcel', count = 3 } },
      },
    },
  },

  -- The least time between two requests from one player, in ms (the server's rate limit).
  minInterval = 750,

  -- The example's wallet and bag, per player (license), in this file in the resource. Config.money
  -- and Config.items (below) hand them to your framework instead.
  saveFile = 'jobtracker.json',
  startItems = { parcel = 3 },
}

if IsDuplicityVersion() then
  -- The player's framework job, or nil for "no job" (then jobs that ask for one are refused).
  -- Return { job = 'courier', grade = 0 }.
  -- Config.player = function(src)
  --   Qbox:    local p = exports.qbx_core:GetPlayer(src); return p and { job = p.PlayerData.job.name, grade = p.PlayerData.job.grade.level }
  --   QBCore:  Player.PlayerData.job.name / .grade.level
  --   ESX:     xPlayer.job.name / xPlayer.job.grade
  -- }
  Config.player = nil

  -- Your framework's pay, or nil for the example's. add returns true when it went through.
  -- Config.money = {
  --   add = function(src, n, why) return exports.qbx_core:AddMoney(src, 'cash', n, why) end,
  --   QBCore: Player.Functions.AddMoney('cash', n, why) · ESX: xPlayer.addMoney(n, why)
  -- }
  Config.money = nil

  -- Your framework's inventory, or nil for the example's bag. count returns how many the player
  -- holds; remove takes them; add gives them back (only used to undo a failed payment).
  -- Config.items = {
  --   ox_inventory: count = function(src, name) return exports.ox_inventory:GetItemCount(src, name) end,
  --                 remove = function(src, name, n) return exports.ox_inventory:RemoveItem(src, name, n) end,
  --                 add = function(src, name, n) return exports.ox_inventory:AddItem(src, name, n) end,
  --   QBCore: Player.Functions.GetItemByName / RemoveItem / AddItem · ESX: xPlayer.getInventoryItem(name).count / removeInventoryItem / addInventoryItem
  -- }
  Config.items = nil
end
