fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '{{name}}'
description 'NUI built with nuikit — https://github.com/belibathan/nuikit'
version '0.1.0'

-- `pnpm dev` points this at the Vite dev server for in-game hot reload,
-- and `pnpm build` puts it back. You never have to edit it by hand.
ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

client_scripts {
  'client/nuikit.lua',
  'client/main.lua',
}
