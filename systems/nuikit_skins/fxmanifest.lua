fx_version 'cerulean'
game 'common'

name 'nuikit_skins'
description 'nuikit: skins, the server theme on resources nuikit does not override yet (looks only)'
repository 'https://github.com/belibathan/nuikit'
version '0.9.0'

-- Other resources' pages load these by URL (https://cfx-nui-nuikit_skins/...), so they only need to
-- be served. skin.js is nuikit_chat's theme.js (the same file): it brings the server theme into the
-- page and adds skins/<name>.css after it. See README.md.
files {
  'skin.js',
  'skins/*.css',
}
