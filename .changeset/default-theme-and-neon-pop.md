---
"nuikit-core": minor
"nuikit": minor
"create-nuikit": minor
---

Themes are named universally. The flagship theme **Ink is renamed Default** (`nuikit-core/themes/default.css`,
id `default`): it is the theme a new project and the stock `nuikit` resource ship with, and the one the site
wears. The nuikit resource's `theme/ink.css` and `theme/ink-fonts.css` are `theme/default.css` and
`theme/default-fonts.css`; its theme-layer keyframes are `nk-theme-{reveal,rise-x,rise-y,deny}`. The built-in
token defaults are unchanged, so `compileTheme("")` and a plain TweakCN paste still compile to Graphite, which
stays a named theme. The id `ink` resolves to `default` for one minor (in `nuikit_identities` and in a saved
player pref) with a deprecation line in the log; `nuikit-cli`'s `INK_RULES` is now `KIT_RULES`, with the old
name kept as a deprecated alias.

New theme **Neon Pop** (`nuikit-core/themes/neon-pop.css`): Default's structure — the `tile` treatment, keycap
tiles, fills and motion — with a vivid palette. A blue → violet → rose `--nk-accent-gradient`, solid brand
`#8A8CFF`, a colour per vital, and a grey → green → blue → violet → amber rarity ladder on near-black surfaces
with white text.

Conventions are written down in `docs/design/naming.md` (themes, treatments, token families, components, data
attributes, files and folders), and `docs/design/ink.md` is `docs/design/default.md`.
