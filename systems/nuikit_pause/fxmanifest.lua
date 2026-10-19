fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_pause'
description 'nuikit: pause menu. Esc opens it in place of GTA\'s; Map, Settings and P still open the game\'s own.'
repository 'https://github.com/belibathan/nuikit'
version '0.3.0'

ui_page 'web/dist/index.html'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

shared_script 'config.lua'

client_scripts {
  'client/nuikit.lua',
  'client/bridge.lua',
  'client/main.lua',
}

server_script 'server/main.lua'
