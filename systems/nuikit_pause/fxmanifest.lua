fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_pause'
description 'nuikit: pause menu. Esc opens it in place of GTA\'s; Map, Settings and P still open the game\'s own.'
repository 'https://github.com/belibathan/nuikit'
version '0.4.0'

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
  'client/main.lua',
}

server_script 'server/main.lua'
