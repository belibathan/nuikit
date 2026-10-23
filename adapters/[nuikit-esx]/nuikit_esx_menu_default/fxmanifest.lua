fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_esx_menu_default'
description 'nuikit adapter: esx_menu_default → nk.menu. Stand-in as the ESX.UI.Menu "default" type. Clean-room from docs/adapters/esx-menu-default.md.'
author '@belibathan'
version '0.8.0'

nuikit_adapter 'esx_menu_default'
provide 'esx_menu_default'

dependency 'nuikit'
dependency 'es_extended'
shared_script '@nuikit/init.lua'
shared_script '@es_extended/imports.lua'
client_script 'client.lua'
