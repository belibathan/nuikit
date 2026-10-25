fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_screen'
description 'nuikit: World screen'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

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

client_scripts {
  'client/screen.lua',
  'client/main.lua',
}
