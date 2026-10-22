fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_voice'
description 'nuikit: pma-voice range, radio and call as slots in the vitals cluster (reads pma-voice, never changes it)'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

dependency 'nuikit'

shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_script 'client.lua'
