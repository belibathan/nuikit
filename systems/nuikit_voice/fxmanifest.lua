fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name 'nuikit_voice'
description 'nuikit: pma-voice range, radio and call as slots in the vitals cluster (reads pma-voice, never changes it)'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

dependency 'nuikit'

shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_script 'client.lua'
