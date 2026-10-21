fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_esx_context'
description 'nuikit adapter: esx_context → nk.menu (with inline input rows). Stand-in (provide). Clean-room from docs/adapters/esx-context.md.'
author '@belibathan'
version '0.7.0'

nuikit_adapter 'esx_context'
provide 'esx_context'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
