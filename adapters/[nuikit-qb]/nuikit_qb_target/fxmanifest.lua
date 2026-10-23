fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_target'
description 'nuikit adapter (recorder stage): logs the messages qb-target sends to its page so the render-only override can be written clean-room. Draws nothing yet; nothing of qb-target is replaced.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

-- Not `nuikit_adapter 'qb-target'` yet: the doctor must not call qb-target adapted until the override draws.

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_script 'client/main.lua'
