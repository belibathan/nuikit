fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_notify'
description 'nuikit adapter: listens to QBCore:Notify (client and server) and draws it with the nk.intent.notify intent. Optional silencer page for qb-core/html (override/).'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

-- Listener (docs/architecture.md §3, mechanism 2; spec: docs/adapters/qb-core-notify.md). Nothing is provided:
-- qb-core keeps running; this resource only handles its notify event. `nuikit_adapter 'qb-core'` is what the
-- doctor reads to call the [nuikit-qb] pack running.
nuikit_adapter 'qb-core'

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_script 'client/main.lua'
