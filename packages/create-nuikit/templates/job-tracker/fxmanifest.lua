fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '{{name}}'
description 'A job tracker built with nuikit — https://github.com/belibathan/nuikit'
version '0.1.0'

-- `pnpm dev` points this at the Vite dev server for in-game hot reload,
-- and `pnpm build` puts it back. You never have to edit it by hand.
-- The nuikit runtime, imported from the nuikit resource (like ox_lib): ensure nuikit before this.
dependency 'nuikit'

ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_script 'client/main.lua'
server_script 'server/main.lua'
