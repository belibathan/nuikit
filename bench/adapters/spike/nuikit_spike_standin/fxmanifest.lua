fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_spike_standin'
description 'nuikit adapter spike: a stand-in for qb-menu (provide + exports under its name). Logs every call, draws nothing.'
version '0.0.1'

-- The mechanism under test (docs/architecture.md §3, mechanism 1):
--   provide 'qb-menu'  →  `dependency 'qb-menu'` in other resources resolves to this one.
-- Cfx staff say `provide` does NOT redirect exports['qb-menu'] here; client.lua registers the
-- export events under qb-menu's name itself. Whether that holds in game is what results.md records.
provide 'qb-menu'

client_script 'client.lua'
