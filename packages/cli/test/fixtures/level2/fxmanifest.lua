fx_version 'cerulean'
game 'gta5'
lua54 'yes'

-- Well-behaved: nuikit.lua owns focus and Escape, but the page is hand-written (no nuikit-core).
ui_page 'html/index.html'
nuikit_protocol '1'

files { 'html/*' }

client_scripts {
  'client/nuikit.lua',
  'client/main.lua',
}
