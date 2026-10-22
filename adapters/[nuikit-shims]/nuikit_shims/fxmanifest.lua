fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_shims'
description 'nuikit export shims: old export names (exports[res]:Fn) land in nuikit intents by config. See docs/adapters/shims.md.'
author '@belibathan'
version '0.8.0'

-- One `provide` per old resource name you shim (the same names as in config.lua). Stop the originals.
nuikit_adapter 'shims'
provide 'my_notify'
provide 'my_menu'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_scripts { 'config.lua', 'shim.lua', 'client.lua' }
