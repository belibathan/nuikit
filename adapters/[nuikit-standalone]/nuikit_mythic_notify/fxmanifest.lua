fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_mythic_notify'
description 'nuikit adapter: mythic_notify → nk.intent.notify. Stand-in (provide). Clean-room from docs/adapters/mythic-notify.md.'
author '@belibathan'
version '0.9.0'

nuikit_adapter 'mythic_notify'
provide 'mythic_notify'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
