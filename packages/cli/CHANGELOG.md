# nuikit

## 0.9.0

### Minor Changes

- The system rebuild: one token language (tokens revision 2, four themes as values), the typed API spec with `nk.<domain>.<verb>`, and the layout system.
  The adoption surface: `nuikit install/upgrade/uninstall`, update check, checksums, `docs/install.md`.
  The `nuikit` CLI is now published to npm (`npx nuikit check`); themes arcade, street, studio, signal, vector, velvet, graphite and the `ink` alias are removed.
- 1a68fb0: Themes are named universally. The flagship theme **Ink is renamed Default** (`nuikit-core/themes/default.css`,
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

- 1a68fb0: Default W0 (docs/design/default.md): tokens 1.5. Kit levers every theme gets, with Graphite-equal defaults in kit.css: scales (`--nk-space-*`, `--nk-gap-*`, `--nk-r-{key,chip,control,surface}`, `--nk-h-*`, `--nk-icon-*`), five type roles (`--nk-type-{scan,title,label,num,body}-*`, `.nk-scan`, `.nk-body`), tile (`--nk-tile-*`), plate (`--nk-plate*`) and fill (`--nk-fill-*`) tokens, the motion ladder (`--nk-time-{snap,fast,slow}`, `--nk-exit-factor`, `--nk-time-reduced`, `--nk-lift`, `--nk-rise`, `--nk-land-scale`, `--nk-deny-x`), `--nk-row-indicator: sweep`, and the `--nk-treatment: tile` preset (Default's values). `--nk-hang-*` is removed. Cascade layers `nk.base, nk.kit, nk.theme, nk.app` (a theme writes into `nk.theme`); shadcn's Kbd is drawn as a Tile. Registry: new `tile`, `fill`, `chip`, `icon-text`, `action-bar`; `meter` gains `hue` and `threshold`, `edge-sheet` `back` and `anchor`, `empty-state` `tile`. `nuikit check` gains the Default rules (radius, blur, color-mix, soft shadows, motion, type, class-substring selectors, alert spellings, unlayered themes, off-scale spacing), all warnings for now.

### Patch Changes

- aa35687: `nuikit theme new <name> [--from <theme>] [--out theme.css]` writes a values-only theme file from a shipped theme: the theme's values, then every lever it leaves to the kit, commented out with its default and range. `nuikit theme --list` names the shipped themes.
- ed88d66: Design levers (roadmap Track D). `docs/design/levers.md` catalogs every visual decision, its lever, default, range and treatment, and the gaps. Two new shipped themes built from values only: `themes/flat.css` (flat, rounded, upright, soft fills) and `themes/square.css` (zero radius, 1px rims, mono numerals, high contrast). New lever `--nk-tile-key-rim` (the keycap face's rim; `transparent` by default, so nothing shipped changes). Themes set values only, enforced: a core test over `themes/*.css`, and `nuikit check` warns `theme/values-only` on a selector or a non-token declaration in `theme.css` / `themes/*.css`.
- Updated dependencies
- Updated dependencies [94ce073]
- Updated dependencies [6ea19bb]
- Updated dependencies [5f4b6dd]
- Updated dependencies [1a68fb0]
- Updated dependencies [1a68fb0]
- Updated dependencies [ed88d66]
- Updated dependencies [401badf]
- Updated dependencies [f1fc0b3]
- Updated dependencies [e7c2aea]
- Updated dependencies [92684fc]
- Updated dependencies [bee6e1a]
- Updated dependencies [b759139]
- Updated dependencies [d67f306]
- Updated dependencies [d6eec14]
- Updated dependencies [031bf9f]
- Updated dependencies [7a04527]
- Updated dependencies [2ea77e5]
- Updated dependencies [7e782f3]
- Updated dependencies [eb68708]
- Updated dependencies [4f35582]
- Updated dependencies [378c07d]
- Updated dependencies [014dc32]
- Updated dependencies [eece522]
  - nuikit-core@0.9.0

## 0.8.0

## 0.7.0

## 0.6.0

## 0.5.0

### Minor Changes

- 1c95253: New package `nuikit`, the command line for the nuikit protocol (`docs/protocol.md`). `nuikit check [path]`
  grades a FiveM resource (or every resource under a folder) against the protocol's conformance levels (1 themed,
  2 well-behaved, 3 native) with file:line findings: hard-coded colours and Tailwind palette classes, direct
  `SetNuiFocus` calls, focus not released on stop, ad-hoc Escape, missing surfaces or `nuikit_protocol`, remote
  fonts and per-frame NUI messages. `--json` for tooling, `--level` to fail CI below a level. `nuikit tokens`
  lists the theme tokens (tokens v1).
