fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '{{name}}'
description 'A loading screen built with nuikit — https://github.com/belibathan/nuikit'
version '0.1.0'

-- A loading screen is a page of its own: it starts before any other resource, so it can't use
-- NUI messages or surfaces. The server hands it everything (and the nuikit theme) while the player
-- connects (server/main.lua); the game posts its own load progress to it.
loadscreen 'web/dist/index.html'
loadscreen_cursor 'yes'
-- client/main.lua closes it once the game has loaded (or leaves it to your multicharacter).
loadscreen_manual_shutdown 'yes'

files {
  'web/dist/index.html',
  'web/dist/**/*',
  'media/**/*',
}

shared_script 'config.lua'
server_script 'server/main.lua'
client_script 'client/main.lua'
