fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit'
description 'nuikit: the design system for your whole server. theme.css here themes every [nuikit] UI.'
repository 'https://github.com/belibathan/nuikit'
version '0.4.0'

-- The server compiles theme.css into the nuikit tokens (docs/tokens.md) at start and on
-- `nuikit theme reload`, logs contrast warnings, and publishes GlobalState.nuikitTheme.
-- compiler.js is nuikit-core's compiler, copied by `pnpm sync`.
server_scripts {
  'server/compiler.js',
  'server/main.js',
}

-- Player UI preferences (scale, reduced motion, high contrast) and the theme for override pages.
client_script 'client.lua'

-- Still served: older nuikit UIs (and the fallback path of new ones) read the file directly.
files { 'theme.css' }
