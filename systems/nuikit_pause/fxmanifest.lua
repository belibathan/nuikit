fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_pause'
description 'nuikit: pause menu. Esc opens it in place of GTA\'s; a focus camera on the player, a 3D map, live key bindings and info pages.'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

dependency 'nuikit'

ui_page 'web/dist/index.html'
nuikit_protocol '1'
nuikit_level '3'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_scripts {
  'client/camera.lua',
  'client/map3d.lua',
  'client/focus.lua',
  'client/keys.lua',
  'client/settings.lua',
  'client/main.lua',
  'client/inventory.lua',
}

server_script 'server/main.lua'
