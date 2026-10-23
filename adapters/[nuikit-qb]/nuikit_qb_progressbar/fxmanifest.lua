fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_progressbar'
description 'nuikit adapter: stands in for progressbar (QBCore.Functions.Progressbar). Progress / ProgressWithStartEvent / ProgressWithTickEvent / isDoingSomething land on the nk.intent.progress intent; animation, props and control disabling stay in Lua as before.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

provide 'progressbar'
nuikit_adapter 'progressbar'

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_scripts {
  'client/effects.lua',
  'client/main.lua',
}
