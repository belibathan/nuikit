fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_esx_context'
description 'nuikit adapter: esx_context → nk.intent.menu (with inline input rows). Stand-in (provide). Clean-room from docs/adapters/esx-context.md.'
author '@belibathan'
version '0.9.0'

nuikit_adapter 'esx_context'
provide 'esx_context'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
