fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name '{{name}}'
description 'NUI built with nuikit — https://github.com/belibathan/nuikit'
version '0.1.0'

-- `pnpm dev` points this at the Vite dev server for in-game hot reload,
-- and `pnpm build` puts it back. You never have to edit it by hand.
-- The nuikit runtime, imported from the nuikit resource (like ox_lib): ensure nuikit before this.
-- To run without it, copy nuikit's lib/nuikit.lua to client/ and list it in client_scripts instead.
dependency 'nuikit'
shared_scripts {
  '@nuikit/init.lua',
  'helpers/log.lua', -- Log.info / warn / error: colour + [RESOURCE] + ^7 (fivem-foundation §7)
}

ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

client_scripts {
  'client/main.lua',
}
