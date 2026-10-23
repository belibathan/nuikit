fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'nuikit'
description 'nuikit: the design system for your whole server. theme.css here themes every [nuikit] UI.'
repository 'https://github.com/belibathan/nuikit'
version '0.8.0'

-- The server compiles theme.css into the nuikit tokens (docs/tokens.md) at start and on
-- `nuikit theme reload`, logs contrast warnings, and publishes GlobalState.nuikitTheme.
-- compiler.js is nuikit-core's compiler, doctor and installer, copied by `pnpm sync`. doctor.js: `nuikit doctor`.
-- install.js: `nuikit install | upgrade | uninstall` (the overrides under overrides/ here; docs/install.md).
server_scripts {
  'server/compiler.js',
  'server/main.js',
  'server/install.js',
  'server/doctor.js',
}

-- The host (docs/host.md, prototype): renders the UI modules of resources that declare
-- `nuikit_ui` in this one frame. `setr nuikit_host 0` turns it off; they use their ui_page.
ui_page 'web/dist/index.html'
nuikit_protocol '1'
nuikit_level '3'

-- init.lua + lib/: the runtime other resources import (shared_script '@nuikit/init.lua'), loaded into
-- each of them from here. theme.css is still served: older nuikit UIs (and the fallback path of new ones)
-- read it directly.
files {
  'init.lua',
  'lib/nuikit.lua',
  'lib/bridge.lua',
  'lib/camera.lua',
  'lib/controls.lua',
  'lib/settings.lua',
  'lib/keys.lua',
  'lib/intents.lua',
  'lib/intents.schema.lua',
  'theme.css',
  -- identity fonts, served to every UI that loads them from here (docs/tokens.md#fonts)
  'fonts/*.woff2',
  -- a theme's own stylesheets, which theme.css can @import (https://cfx-nui-nuikit/theme/…)
  'theme/*.css',
  'web/dist/index.html',
  'web/dist/**/*',
}

-- client.lua: player UI preferences and the theme for override pages. host.lua: the host.
-- client/intents.lua: the intent runtime (docs/intents.md): nk.notify, nk.menu… from every resource
-- land here and are drawn in this frame by the renderers in web/. client/renderers.lua: renderer
-- packs (resources declaring nuikit_renderer '<kind>') replace a default renderer in that frame.
-- client/images.lua: the image resolver's lookups (docs/images.md): https://nuikit/images, https://nuikit/vehicle.
client_scripts {
  'lib/nuikit.lua',
  'lib/camera.lua',
  'lib/controls.lua',
  'lib/settings.lua',
  'lib/keys.lua',
  'lib/host.lua',
  'lib/intents.lua',
  'client.lua',
  'client/intents.lua',
  'client/renderers.lua',
  'client/images.lua',
}
