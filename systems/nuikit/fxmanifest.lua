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

-- The host (docs/host.md, prototype): renders the UI modules of resources that declare
-- `nuikit_ui` in this one frame. `setr nuikit_host 0` turns it off; they use their ui_page.
ui_page 'web/dist/index.html'
nuikit_protocol '1'

-- theme.css is still served: older nuikit UIs (and the fallback path of new ones) read it directly.
files {
  'theme.css',
  'web/dist/index.html',
  'web/dist/**/*',
}

-- client.lua: player UI preferences and the theme for override pages. host.lua: the host.
client_scripts {
  'client/nuikit.lua',
  'client/host.lua',
  'client.lua',
}
