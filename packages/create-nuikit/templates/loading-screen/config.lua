Config = {
  -- '' uses the server's sv_projectName.
  serverName = '',
  tagline = '',
  -- A file in media/ (e.g. 'media/logo.png') or a URL; '' hides it.
  logo = '',

  -- Shown one after another. A plain string, or { title = '…', text = '…' }.
  tips = {
    { title = 'Read the rules', text = "They're short, and staff will ask you about them." },
    'Out-of-character chat goes in /ooc. Everything else is your story.',
  },
  tipInterval = 8000, -- ms

  -- Files in media/ or URLs, cross-faded. None: the theme's own backdrop.
  backgrounds = {},
  backgroundInterval = 9000, -- ms

  -- Files in media/ (.mp3/.ogg) or URLs. Players can mute it; the choice is remembered.
  music = {},
  musicVolume = 0.15,

  -- For reading: the game can't open a browser.
  links = {
    { label = 'Discord', url = 'discord.gg/yourserver' },
  },

  -- true: leave the loading screen up when the game has loaded, for your multicharacter (or spawn
  -- script) to close with ShutdownLoadingScreenNui(). The screen shows "Ready" meanwhile.
  externalShutdown = false,
}
