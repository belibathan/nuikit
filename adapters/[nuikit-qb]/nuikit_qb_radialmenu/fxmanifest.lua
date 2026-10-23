fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_radialmenu'
description 'nuikit adapter: stands in for qb-radialmenu. Config.MenuItems / JobInteractions and AddOption / RemoveOption land on the nk.radial intent; selections dispatch by type. UI only: vehicle doors, extras and seats are not translated.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

provide 'qb-radialmenu'
nuikit_adapter 'qb-radialmenu'

dependency 'nuikit'
shared_scripts {
  '@nuikit/init.lua',
  'config.lua',
}

client_script 'client/main.lua'
