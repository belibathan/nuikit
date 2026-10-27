-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Open the nearest showroom with /{{name}} or E (players can rebind it) within `radius` metres.
  key = 'E',

  -- The showrooms. Prices live here, on the server's side: the page only shows them.
  --   showroom: where the preview car stands; camera: where the camera looks at it from
  --   delivery: where a bought car waits; testDrive: seconds, and where it starts (omit: none)
  -- Vehicles: id (the model name), label, brand, category, price, seats, stats (0–100 bars).
  shops = {
    {
      id = 'pdm',
      label = 'Premium Deluxe',
      description = "Simeon's showroom",
      coords = vector3(-56.5, -1096.6, 26.4),
      radius = 3.0,
      showroom = vector4(-45.6, -1097.5, 25.4, 110.0),
      camera = vector3(-50.6, -1094.0, 27.0),
      delivery = vector4(-31.0, -1090.5, 25.4, 335.0),
      testDrive = { seconds = 60, spawn = vector4(-31.0, -1090.5, 25.4, 335.0) },
      payment = { 'bank', 'cash' },
      categories = { { id = 'sports', label = 'Sports' }, { id = 'muscle', label = 'Muscle' }, { id = 'compact', label = 'Compact' } },
      vehicles = {
        { id = 'sultan', label = 'Sultan', brand = 'Karin', category = 'sports', price = 12000, seats = 4, stats = { speed = 76, acceleration = 70, braking = 58, handling = 74 } },
        { id = 'banshee', label = 'Banshee', brand = 'Bravado', category = 'sports', price = 105000, seats = 2, stats = { speed = 85, acceleration = 79, braking = 55, handling = 77 } },
        { id = 'dominator', label = 'Dominator', brand = 'Vapid', category = 'muscle', price = 35000, seats = 2, stats = { speed = 82, acceleration = 74, braking = 50, handling = 64 } },
        { id = 'gauntlet', label = 'Gauntlet', brand = 'Bravado', category = 'muscle', price = 32000, seats = 2, stats = { speed = 80, acceleration = 72, braking = 48, handling = 60 } },
        { id = 'blista', label = 'Blista', brand = 'Dinka', category = 'compact', price = 8000, seats = 2, stats = { speed = 64, acceleration = 60, braking = 55, handling = 66 } },
        { id = 'panto', label = 'Panto', brand = 'Benefactor', category = 'compact', price = 4500, seats = 2, stats = { speed = 55, acceleration = 58, braking = 52, handling = 70 } },
      },
    },
  },

  -- Paint swatches; any other "#rrggbb" can be typed too (GTA's custom colour).
  colours = { '#0b0b0b', '#f5f5f5', '#7a7d82', '#c8102e', '#1f4fa3', '#f2b705', '#2e7d32', '#e0602f' },

  -- The example's money and owned cars, per player (license), in this file in the resource.
  saveFile = 'vehicle-shop.json',
  startCash = 5000,
  startBank = 50000,
}

if IsDuplicityVersion() then
  -- Your framework's money, or nil for the example's (see the shop template for the same hooks).
  -- Config.money = {
  --   Qbox:  get = function(src, account) return exports.qbx_core:GetMoney(src, account) end,
  --          remove = function(src, account, n, why) return exports.qbx_core:RemoveMoney(src, account, n, why) end,
  --          add = function(src, account, n, why) return exports.qbx_core:AddMoney(src, account, n, why) end,
  -- }
  Config.money = nil

  -- After a purchase went through: record the car in your framework's vehicle table. `car` is
  -- { model, plate, colour, net }. Return false to undo the purchase (the car goes, the money comes back).
  function Config.onBought(src, car)
    -- Qbox:  return exports.qbx_vehicles:CreatePlayerVehicle({ model = car.model, citizenid = exports.qbx_core:GetPlayer(src).PlayerData.citizenid, props = { plate = car.plate } }) ~= nil
    return true
  end
end
