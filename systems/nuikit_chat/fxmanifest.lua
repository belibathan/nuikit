fx_version 'cerulean'
game 'common'

name 'nuikit_chat'
description 'nuikit: a theme for the cfx chat resource, coloured by nuikit/theme.css'
repository 'https://github.com/belibathan/nuikit'
version '0.6.0'

files {
  'theme/style.css',
  'theme/theme.js',
}

-- The chat resource reads this from every started resource and loads it into its own page.
-- theme.js pulls nuikit/theme.css into the page at runtime; style.css has the stock shadcn
-- neutral (dark) values built in for servers without the nuikit resource.
--
-- Each argument sits in its own <span>: chat's ^0-^9 colour codes close the span they're in
-- (see https://github.com/citizenfx/fivem/pull/3705), so they must never close ours.
chat_theme 'nuikit' {
  styleSheet = 'theme/style.css',
  script = 'theme/theme.js',
  msgTemplates = {
    -- chat's own ids: chatMessage / chat:addMessage with author + text, text only, and print
    default = '<div class="nk"><span class="nk-author"><span>{0}</span></span><span class="nk-text"><span>{1}</span></span></div>',
    defaultAlt = '<div class="nk"><span class="nk-text"><span>{0}</span></span></div>',
    print = '<div class="nk nk-print"><span class="nk-tag">Console</span><span class="nk-text"><span>{0}</span></span></div>',

    -- notices: chat:addMessage { templateId = 'success', args = { 'Vehicle stored' } }
    system = '<div class="nk nk-note nk-system"><i class="nk-icon"></i><span class="nk-text"><span>{0}</span></span></div>',
    info = '<div class="nk nk-note nk-info"><i class="nk-icon"></i><span class="nk-text"><span>{0}</span></span></div>',
    success = '<div class="nk nk-note nk-success"><i class="nk-icon"></i><span class="nk-text"><span>{0}</span></span></div>',
    warning = '<div class="nk nk-note nk-warning"><i class="nk-icon"></i><span class="nk-text"><span>{0}</span></span></div>',
    error = '<div class="nk nk-note nk-error"><i class="nk-icon"></i><span class="nk-text"><span>{0}</span></span></div>',

    -- ids other Qbox resources send (qbx_chat_theme had these), so they keep rendering
    user = '<div class="nk"><span class="nk-author"><span>{0}</span></span><span class="nk-text"><span>{1}</span></span></div>',
    join = '<div class="nk nk-presence nk-join"><span class="nk-text"><span>{0}</span></span></div>',
    quit = '<div class="nk nk-presence nk-quit"><span class="nk-text"><span>{0}</span></span></div>',
  },
}
