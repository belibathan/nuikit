fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_input'
description 'nuikit adapter: stands in for qb-input. ShowInput / CloseMenu land on the nk.intent.input intent; the caller gets the same table back.'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

provide 'qb-input'
nuikit_adapter 'qb-input'

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_script 'client/main.lua'
