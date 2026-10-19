fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_death'
description 'nuikit: death and last-stand screen. Shows what your medical resource is doing; never revives or respawns.'
repository 'https://github.com/belibathan/nuikit'
version '0.4.0'

ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

shared_script 'config.lua'

client_scripts {
  'client/nuikit.lua',
  'client/main.lua',
}

server_script 'server/main.lua'
