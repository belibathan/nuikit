-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- Open the inventory with TAB or /{{name}}; use hotbar slots with 1–5 (players can rebind them).
  key = 'TAB',
  hotbar = 5,

  -- The player's pockets.
  player = { label = 'Pockets', slots = 25, maxWeight = 30000 }, -- grams

  -- What a new player starts with: { item, count }.
  starter = { { 'phone', 1 }, { 'water', 3 }, { 'sandwich', 2 }, { 'bandage', 2 } },

  -- Every item the server knows. weight in grams; stack = false keeps one per slot; icon (drink,
  -- coffee, food, snack, phone, radio, medical, tool, key, box, shirt, fuel, light, battery, money,
  -- weapon, ammo, document) or image (a URL); use = 'name' makes it usable and fires that effect
  -- on the client (client/main.lua: effects), after the server has taken one.
  items = {
    water = { label = 'Water', weight = 500, icon = 'drink', use = 'drink', description = 'Takes the edge off a hot day.' },
    sandwich = { label = 'Sandwich', weight = 250, icon = 'food', use = 'eat' },
    bandage = { label = 'Bandage', weight = 50, icon = 'medical', use = 'heal', description = 'Stops the bleeding. Heals a little.' },
    phone = { label = 'Phone', weight = 190, icon = 'phone', stack = false },
    radio = { label = 'Radio', weight = 350, icon = 'radio', stack = false },
    flashlight = { label = 'Flashlight', weight = 400, icon = 'light', stack = false },
    toolbox = { label = 'Toolbox', weight = 6000, icon = 'tool', stack = false },
  },

  -- Shared stashes: stand within `radius` and open the inventory to see one next to your pockets.
  stashes = {
    { id = 'locker', label = 'Locker', coords = vector3(452.1, -980.0, 30.7), radius = 2.0, slots = 20, maxWeight = 100000 },
  },

  -- The example keeps every inventory in this file in the resource.
  saveFile = 'inventory.json',
}
