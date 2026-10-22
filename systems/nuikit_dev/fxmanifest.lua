fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_dev'
description 'Test commands: /nk test <what> opens every nuikit intent and ox_lib dialog, or grants test items. Off unless nuikit_dev is 1.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

dependency 'nuikit'
dependency 'ox_lib'

shared_scripts {
  '@nuikit/init.lua',
  '@ox_lib/init.lua',
  'shared.lua',
}
client_script 'client.lua'
server_script 'server.lua'
