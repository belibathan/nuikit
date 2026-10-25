fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_loading'
description 'nuikit: loading screen with real load progress, tips, backgrounds and music, themed by nuikit/theme.css.'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

-- The loading screen is a page of its own: it runs before any other resource, so it gets the
-- server theme through the connection handover (server/main.lua), not through NUI messages.
loadscreen 'web/dist/index.html'
loadscreen_cursor 'yes'
-- client/main.lua closes it, or leaves it to your multicharacter when Config.externalShutdown = true.
loadscreen_manual_shutdown 'yes'

files {
  'web/dist/index.html',
  'web/dist/**/*',
  'media/**/*',
}

shared_script 'config.lua'
server_script 'server/main.lua'
client_script 'client/main.lua'
