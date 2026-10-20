fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'fixture_hud'
-- Built like systems/nuikit_hud: nuikit.lua + bridge.lua, a React page on nuikit-core and shadcn.
ui_page 'web/dist/index.html'
nuikit_protocol '1'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

client_scripts {
  'client/nuikit.lua',
  'client/bridge.lua',
  'client/main.lua',
}
