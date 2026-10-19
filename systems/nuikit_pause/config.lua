Config = {
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
  --   resume, map, settings, keybinds (FiveM's key bindings page), help, disconnect
  buttons = { 'resume', 'map', 'settings', 'keybinds', 'help', 'disconnect' },

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
