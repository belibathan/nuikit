fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_esx_notify'
description 'nuikit adapter: esx_notify → nk.intent.notify. Stand-in (provide) + listener. Clean-room from docs/adapters/esx-notify.md.'
author '@belibathan'
version '0.8.0'

-- What this resource draws for (the doctor reads it, docs/doctor.md) and what it replaces.
nuikit_adapter 'esx_notify'
provide 'esx_notify'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
