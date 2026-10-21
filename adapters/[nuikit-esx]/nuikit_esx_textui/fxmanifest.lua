fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_esx_textui'
description 'nuikit adapter: esx_textui → nk.prompt. Stand-in (provide). Clean-room from docs/adapters/esx-textui.md.'
author '@belibathan'
version '0.7.0'

nuikit_adapter 'esx_textui'
provide 'esx_textui'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
