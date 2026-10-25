fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_okok_notify'
description 'nuikit adapter: okokNotify → nk.intent.notify. Stand-in (provide). Clean-room from docs/adapters/okok-notify.md.'
author '@belibathan'
version '0.9.0'

nuikit_adapter 'okokNotify'
provide 'okokNotify'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
