-- nuikit_loading: everything here reaches the loading screen through the connection handover.
-- Files are paths inside this resource (put them in media/), or full https:// URLs.
-- GLOBAL: this resource's config (fivem-foundation §9)
Config = {
  -- nil uses the sv_projectName convar, then sv_hostname.
  serverName = nil,
  tagline = 'A nuikit server',
  logo = nil, -- e.g. 'media/logo.png'

  -- Shown one at a time. A string, or { title = '...', text = '...' }.
  tips = {
    { title = 'Press Z for the radial menu', text = 'Emotes, vehicle options, your phone and more live in one place.' },
    { title = 'Read the rules', text = 'They are short, and staff will ask you about them. Find them on our Discord.' },
    { title = 'Stay in character', text = 'Out-of-character chat goes in /ooc. Everything else is your story.' },
    { title = 'Need help?', text = 'Use /report in game. A staff member will get back to you.' },
  },
  tipInterval = 8000, -- ms

  -- Background images, cross-faded. Leave empty for the theme's own backdrop.
  backgrounds = {
    -- 'media/background-1.jpg',
    -- 'https://example.com/background-2.jpg',
  },
  backgroundInterval = 9000, -- ms

  -- Background music. Players can mute it; the choice is remembered.
  music = {
    -- 'media/music.mp3',
  },
  musicVolume = 0.15, -- 0 to 1

  -- Shown bottom right as text (a loading screen can't open links).
  links = {
    { label = 'Discord', url = 'discord.gg/yourserver' },
    { label = 'Website', url = 'yourserver.com' },
  },

  -- 'auto': keep it up for Qbox's own character menu (qbx_core closes it), close it right away elsewhere.
  -- false: close the loading screen as soon as the game has loaded.
  -- true: keep it up until another resource (e.g. your multicharacter) calls ShutdownLoadingScreenNui().
  externalShutdown = 'auto',
  -- 'auto' only: if Qbox hasn't closed it after this many seconds on "Ready", close it anyway (with a
  -- yellow line in the F8 console). true never times out.
  externalShutdownTimeout = 60,
}
