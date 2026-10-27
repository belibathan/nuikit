fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_esx_menu_dialog'
description 'nuikit adapter: esx_menu_dialog → nk.intent.input. Stand-in as the ESX.UI.Menu "dialog" type. Clean-room from docs/adapters/esx-menu-dialog.md.'
author '@belibathan'
version '0.9.0'

nuikit_adapter 'esx_menu_dialog'
provide 'esx_menu_dialog'

dependency 'nuikit'
dependency 'es_extended'
shared_script '@nuikit/init.lua'
shared_script '@es_extended/imports.lua'
client_script 'client.lua'
