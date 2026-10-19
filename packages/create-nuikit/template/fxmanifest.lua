fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '{{name}}'
description 'NUI built with nuikit — https://github.com/belibathan/nuikit'
version '0.1.0'

-- `pnpm dev` points this at the Vite dev server for in-game hot reload,
-- and `pnpm build` puts it back. You never have to edit it by hand.
-- The nuikit runtime, imported from the nuikit resource (like ox_lib): ensure nuikit before this.
-- To run without it, copy nuikit's lib/nuikit.lua to client/ and list it in client_scripts instead.
dependency 'nuikit'
shared_script '@nuikit/init.lua'

ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

client_scripts {
  'client/main.lua',
}
