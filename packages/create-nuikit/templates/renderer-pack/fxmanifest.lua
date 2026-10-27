fx_version 'cerulean'
game 'gta5'
lua54 'yes'
use_fxv2_oal 'yes'

name '{{name}}'
description 'A nuikit renderer pack — https://github.com/belibathan/nuikit'
version '0.1.0'

-- A renderer pack has no page of its own: nuikit's frame loads web/dist/renderers.js and uses the
-- renderer it exports instead of the default for each intent listed here (docs/intents.md §9).
-- Several packs may claim the same intent: the one started last draws it.
dependency 'nuikit'
shared_script '@nuikit/init.lua'

nuikit_renderer 'notify'
-- nuikit_renderer 'menu'                         -- one line per intent; export a renderer per kind
-- nuikit_renderer_module 'web/dist/renderers.js' -- the default path

files {
  'web/dist/renderers.js',
}

client_scripts {
  'client/main.lua',
}
