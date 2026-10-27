-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- At the top of the menu. An empty name uses the server's sv_projectName.
  -- `logo` is short text in a badge ('LS', 'RP'); '' hides it.
  server = { name = '', tagline = '', logo = '' },

  -- Which actions appear, in this order. Remove one to hide it.
  --   resume, map (GTA's map), settings (GTA's), keybinds (GTA's key bindings page), disconnect (asks first)
  actions = { 'resume', 'map', 'settings', 'keybinds', 'disconnect' },

  -- At the bottom of the menu, for reading (the game can't open a browser). Remove an entry to hide it.
  links = {
    { label = 'Discord', value = 'discord.gg/yourserver' },
    { label = 'Website', value = 'yourserver.com' },
  },

  -- Closing GTA's map, settings or key bindings (opened from this menu) brings this menu back, like
  -- GTA's own pause menu. false: closing them returns straight to the game.
  returnToMenu = true,

  disconnectReason = 'You left the server. See you soon.',

  -- GTA's frontend menus. Change only if a game build moves them.
  frontend = {
    map = 'FE_MENU_VERSION_MP_PAUSE',
    settings = 'FE_MENU_VERSION_LANDING_MENU',
    keybinds = 'FE_MENU_VERSION_LANDING_KEYMAPPING_MENU',
  },
}
