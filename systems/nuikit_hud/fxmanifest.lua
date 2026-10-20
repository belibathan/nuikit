fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_hud'
description 'nuikit HUD: vitals, needs, voice, money, job and vehicle, on Qbox, QBCore, ESX or standalone.'
repository 'https://github.com/belibathan/nuikit'
version '0.5.0'

dependency 'nuikit'

ui_page 'web/dist/index.html'
nuikit_protocol '1'
-- With the nuikit host running, nuikit renders this module in its own frame and the ui_page
-- above stays an empty page (docs/host.md). Without it, the ui_page renders the HUD as before.
nuikit_ui 'web/dist/module.js'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_scripts {
  'client/minimap.lua',
  'client/main.lua',
}
