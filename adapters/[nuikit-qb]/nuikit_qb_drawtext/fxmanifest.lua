fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_qb_drawtext'
description 'nuikit adapter: listens to qb-core DrawText / ChangeText / HideText / KeyPressed events and draws them with the nk.intent.prompt intent.'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

-- Listener (spec: docs/adapters/qb-drawtext.md). The exports live inside qb-core and cannot be stood in; the
-- silencer page in ../nuikit_qb_notify/override forwards them here through the `nuikit_qb:page` event.
nuikit_adapter 'qb-core'

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_script 'client/main.lua'
