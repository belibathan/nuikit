Config = {
  -- Print what the character stand-in and the map are doing to the F8 console (and the client log).
  debug = true,

  -- Shown at the top of the menu. An empty name uses the server's sv_projectName (like the
  -- loading screen). `logo` is short text in a badge (e.g. 'RP', 'V'); '' hides it.
  server = {
    name = '',
    tagline = '',
    logo = '',
  },

  -- Closing GTA's map, settings or key bindings (opened from this menu) brings this menu back,
  -- the way GTA's own pause menu behaves. false: closing them returns straight to the game.
  returnToMenu = true,

  -- Shown as text at the bottom of the menu (the game can't open a browser, so they're for reading).
  -- Remove an entry to hide it.
  links = {
    { label = 'Discord', value = 'discord.gg/yourserver' },
    { label = 'Website', value = 'yourserver.com' },
  },

  -- Which actions appear, in this order. Remove one to hide it.
  --   resume, map (the 3D map, or GTA's if views.map is off), keybinds (live key list, or GTA's
  --   page if views.keys is off), info (your pages below), settings (GTA's), help, disconnect
  buttons = { 'resume', 'map', 'keybinds', 'info', 'settings', 'disconnect' },

  -- Scripted cameras: the focus camera on Home and the inventory, and the 3D map. false turns them
  -- all off (low-end servers): Home blurs the game and Map opens GTA's map. Players who turn on
  -- reduced motion (/nuikit motion off) get the same flat menu whatever this says.
  camera = true,

  -- The bigger menu (docs/pause-3d.md). Turn any part off to fall back to the simple menu.
  --   map: Map opens a 3D view of the real world instead of GTA's map
  --   keys: Key bindings shows the player's current keys, read live from the game
  --   info: the Info pages below
  --   preview: your character stands in the middle of the Home screen (on foot only)
  views = { map = true, keys = true, info = true, preview = true },

  -- The 3D map's camera. Heights are metres above the ground.
  map = {
    startHeight = 900.0,     -- when the map opens
    focusHeight = 350.0,     -- after picking a place or recentering
    startPitch = -60.0,      -- -89 is straight down
    startAtWaypoint = true,  -- open above the waypoint when one is set
    hidePeds = true,         -- hide crowds, traffic and players while looking (this player only)
    timecycle = '',          -- optional timecycle modifier while the map is open ('' = none)
  },

  -- While ox_inventory is open, frame the player between the inventory panels (needs the nuikit
  -- ox_inventory override, and setr inventory:screenblur false in ox.cfg).
  inventory = {
    focus = true,
  },

  preview = {
    facing = 'front',        -- 'front': face the player (head and upper body); 'behind': the 0.7.0 framing
    angle = -20.0,           -- the stand-in starts turned this many degrees
    blendMs = 450,           -- camera blend in and out
    light = 3.0,             -- studio light on the character (only you see it); 0 = off
  },

  -- Places on the 3D map: a pin each, listed and searchable. icon is a lucide icon name
  -- (lucide.dev): building, hospital, shield, plane, car, landmark, shopping-bag, wrench, anchor…
  places = {
    { id = 'pillbox', label = 'Pillbox Medical', category = 'Services', icon = 'hospital', coords = vec3(298.6, -584.5, 43.3) },
    { id = 'mrpd', label = 'Mission Row Police', category = 'Services', icon = 'shield', coords = vec3(428.2, -981.0, 30.7) },
    { id = 'cityhall', label = 'City Hall', category = 'Services', icon = 'landmark', coords = vec3(-544.9, -204.3, 38.2) },
    { id = 'legion', label = 'Legion Square', category = 'Landmarks', icon = 'trees', coords = vec3(195.2, -933.8, 30.7) },
    { id = 'pier', label = 'Del Perro Pier', category = 'Landmarks', icon = 'ferris-wheel', coords = vec3(-1640.0, -1050.0, 13.0) },
    { id = 'vinewood', label = 'Vinewood Sign', category = 'Landmarks', icon = 'mountain', coords = vec3(711.0, 1198.0, 348.0) },
    { id = 'lsc', label = 'Los Santos Customs', category = 'Vehicles', icon = 'wrench', coords = vec3(-337.0, -136.9, 39.0) },
    { id = 'pdm', label = 'Premium Deluxe Motorsport', category = 'Vehicles', icon = 'car', coords = vec3(-56.8, -1098.8, 26.4) },
    { id = 'lsia', label = 'Los Santos Airport', category = 'Travel', icon = 'plane', coords = vec3(-1037.0, -2737.0, 20.2) },
    { id = 'sandy', label = 'Sandy Shores', category = 'Travel', icon = 'tent', coords = vec3(1853.0, 3686.0, 34.3) },
    { id = 'paleto', label = 'Paleto Bay', category = 'Travel', icon = 'anchor', coords = vec3(-448.0, 6008.0, 31.7) },
  },

  -- The Key bindings view. command = a FiveM key mapping (ox_lib keybinds are '+' .. name);
  -- control = a GTA control index. Unbound ones say so.
  keybinds = {
    { group = 'Menus', label = 'Radial menu', command = '+ox_lib-radial' },
    { group = 'Menus', label = 'Inventory', command = '+inv' },
    { group = 'Menus', label = 'Phone', command = 'phone' },
    { group = 'Menus', label = 'Scoreboard', command = '+scoreboard' },
    { group = 'Menus', label = 'Look at (target)', command = '+ox_target' },
    { group = 'Vehicle', label = 'Enter vehicle', control = 23 },
    { group = 'Vehicle', label = 'Seatbelt', command = '+toggleseatbelt' },
    { group = 'Vehicle', label = 'Lock / unlock', command = '+togglelocks' },
    { group = 'Vehicle', label = 'Engine', command = '+toggleengine' },
    { group = 'Vehicle', label = 'Cruise control', command = '+toggle_cruise_control' },
    { group = 'Character', label = 'Hands up', command = '+handsupKey' },
    { group = 'Character', label = 'Crouch', command = '+crouch' },
    { group = 'Character', label = 'Push to talk', control = 249 },
    { group = 'Character', label = 'Chat', control = 245 },
  },

  -- The Info view: plain text, blank lines between paragraphs, '- ' for list items.
  pages = {
    {
      id = 'rules', title = 'Server rules', icon = 'scroll-text',
      body = [[Be respectful to every player, in and out of character.

- No random deathmatch: violence needs a roleplay reason.
- No metagaming: what you hear on Discord or a stream isn't known in character.
- No powergaming: give other players a chance to respond.
- Value your life: act like your character wants to live.

Questions? Ask staff in Discord.]],
    },
    {
      id = 'start', title = 'Getting started', icon = 'compass',
      body = [[Welcome to the city. A few things to do first:

- Get an ID card at City Hall.
- Open your phone to find jobs and contacts.
- Use the map (Esc, then Map) to find places and set a waypoint.]],
    },
  },

  -- Scheduled restarts, server time (24h). Shown on Home as "next restart". {} hides it.
  restarts = {},

  -- The Help page: keys your server uses. Keep it short.
  help = {
    { key = 'Z', label = 'Radial menu' },
    { key = 'F1', label = 'Phone' },
    { key = 'TAB', label = 'Inventory' },
    { key = 'F', label = 'Enter vehicle' },
    { key = 'X', label = 'Hands up' },
    { key = 'T', label = 'Chat' },
    { key = 'P', label = 'Map' },
  },

  -- Reason shown on the player's screen after Disconnect.
  disconnectReason = 'You left the server. See you soon.',

  -- Native frontend menus. Change only if a game build moves them.
  frontend = {
    map = 'FE_MENU_VERSION_MP_PAUSE',
    settings = 'FE_MENU_VERSION_LANDING_MENU',
    keybinds = 'FE_MENU_VERSION_LANDING_KEYMAPPING_MENU',
  },
}
