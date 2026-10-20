-- nuikit minimap paint spike (bench only: not part of nuikit.zip, streams nothing).
-- Drop this folder into resources/, `ensure nuikit_minimap_spike`, then follow bench/minimap/results.md.
fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit_minimap_spike'
description 'Measures whether GTA radar tiles can be repainted at runtime (results in bench/minimap/results.md).'

files { 'tint.html' }
client_script 'client.lua'
