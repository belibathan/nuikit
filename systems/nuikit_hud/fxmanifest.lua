fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_hud'
description 'nuikit HUD: vitals, needs, voice, money, job and vehicle, on Qbox, QBCore, ESX or standalone.'
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
