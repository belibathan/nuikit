fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_esx_progressbar'
description 'nuikit adapter: esx_progressbar → nk.intent.progress. Stand-in (provide). Clean-room from docs/adapters/esx-progressbar.md.'
author '@belibathan'
version '0.9.0'

nuikit_adapter 'esx_progressbar'
provide 'esx_progressbar'

dependency 'nuikit'
shared_script '@nuikit/init.lua'
client_script 'client.lua'
