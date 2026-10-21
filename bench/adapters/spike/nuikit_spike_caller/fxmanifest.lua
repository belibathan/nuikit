fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_spike_caller'
description 'nuikit adapter spike: plays the scripts that call the libraries (qb-menu exports and events, notify events) and the ox_lib page that routes intents to nuikit.'
version '0.0.1'

-- The dependency under test: with nuikit_spike_standin providing qb-menu and no real qb-menu
-- installed, this must still start (and after the stand-in). If it refuses to start, provide
-- does not resolve dependencies and results.md says so.
dependency 'qb-menu'

client_script 'client.lua'
server_script 'server.lua'

-- The "ox_lib override page": a page in THIS resource that posts intents to another resource's
-- NUI callback (https://nuikit_spike_route/intent), as the real ox_lib override page would post
-- to https://nuikit/intent. Nothing else; no build step.
ui_page 'web/index.html'
files { 'web/index.html' }
