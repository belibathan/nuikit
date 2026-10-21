fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_hud'
description 'nuikit HUD: vitals, voice, money, a vehicle, aircraft and boat cluster, a framed minimap and location, on Qbox, QBCore, ESX or standalone.'
repository 'https://github.com/belibathan/nuikit'
version '0.7.0'

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
  'client/layout.lua',
  'client/adapters.lua',
  'client/minimap.lua',
  'client/location.lua',
  'client/vehicle.lua',
  'client/weapon.lua',
  'client/main.lua',
}
