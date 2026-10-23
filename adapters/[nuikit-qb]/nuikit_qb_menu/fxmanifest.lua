fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_qb_menu'
description 'nuikit adapter: stands in for qb-menu. openMenu / closeMenu / showHeader (exports and events) land on the nk.menu intent; selections dispatch exactly as qb-menu documents.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

-- Stand-in (docs/architecture.md §3, mechanism 1; spec: docs/adapters/qb-menu.md).
-- `dependency 'qb-menu'` in other resources resolves to this one; stop the real qb-menu.
provide 'qb-menu'

-- The doctor reads this: qb-menu counts as "adapted" while this resource runs (docs/doctor.md §3).
nuikit_adapter 'qb-menu'

dependency 'nuikit'
shared_script '@nuikit/init.lua'

client_script 'client/main.lua'
