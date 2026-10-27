-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  title = 'Settings',
  -- F10 by default; players can rebind it in Settings → Key Bindings → FiveM.
  key = 'F10',

  -- Your server's settings. Each is saved on the player's PC (KVP) and announced to your scripts:
  --   AddEventHandler('{{name}}:changed', function(id, value) … end)
  --   exports['{{name}}']:get('units')
  -- type = 'toggle' (value true/false) | 'choice' (one of options) | 'slider' (min, max, step, unit)
  sections = {
    {
      id = 'interface',
      title = 'Interface',
      items = {
        { id = 'hud', type = 'toggle', label = 'Show the HUD', description = 'Vitals, money and the speedometer', default = true },
        { id = 'units', type = 'choice', label = 'Speed', default = 'mph',
          options = { { value = 'mph', label = 'mph' }, { value = 'kmh', label = 'km/h' } } },
        { id = 'streamer', type = 'toggle', label = 'Streamer mode', description = 'Hide names and phone numbers', default = false },
      },
    },
  },

  -- nuikit's own player preferences (UI size, reduced motion, high contrast). Every nuikit screen
  -- follows them, so they're real from the start. false hides the section.
  accessibility = true,

  -- Read-only key hints shown in a Keys section ({} hides it).
  keys = {
    { label = 'Radial menu', key = 'Z' },
    { label = 'Phone', key = 'M' },
  },
}
