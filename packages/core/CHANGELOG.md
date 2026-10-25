# nuikit-core

## 0.9.0

### Minor Changes

- The system rebuild: one token language (tokens revision 2, four themes as values), the typed API spec with `nk.<domain>.<verb>`, and the layout system.
  The adoption surface: `nuikit install/upgrade/uninstall`, update check, checksums, `docs/install.md`.
  The `nuikit` CLI is now published to npm (`npx nuikit check`); themes arcade, street, studio, signal, vector, velvet, graphite and the `ink` alias are removed.
- 5f4b6dd: Coverage harness: `nuikit-core/coverage` (session/doctor pairing and targets), the doctor prints the framework target and validates `nuikit:intent` payloads, the nuikit resource sends the event to the server.
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
- ed88d66: Design levers (roadmap Track D). `docs/design/levers.md` catalogs every visual decision, its lever, default, range and treatment, and the gaps. Two new shipped themes built from values only: `themes/flat.css` (flat, rounded, upright, soft fills) and `themes/square.css` (zero radius, 1px rims, mono numerals, high contrast). New lever `--nk-tile-key-rim` (the keycap face's rim; `transparent` by default, so nothing shipped changes). Themes set values only, enforced: a core test over `themes/*.css`, and `nuikit check` warns `theme/values-only` on a selector or a non-token declaration in `theme.css` / `themes/*.css`.
- b759139: `fetchNui` rejects with a typed `NuiError` (`code`: `TIMEOUT | TRANSPORT | UNKNOWN_CALLBACK | INVALID | CANCELLED`), takes `{ timeoutMs, signal }`, and the page keeps per-resource call diagnostics (`getNuiDiagnostics`, `configureNui`). Devtools show code and timing per call. The host answers an unregistered forwarded callback with `UNKNOWN_CALLBACK`.
- d67f306: `nuikit install` / `nuikit upgrade` / `nuikit uninstall`: a server console command in the `nuikit` resource that merges the shipped overrides into the resources you run, backs up the stock files to `<resource>/.nuikit-backup/<version>/`, writes a manifest, keeps files you edited (`--force` to overwrite), and restores from the backup. `--dry-run` lists without writing. The zip now ships overrides under `[nuikit]/nuikit/overrides/` and `overrides.json` carries a byte hash per file. `nuikit doctor` reports an override that is outdated or edited and names the command. New in nuikit-core: `planInstall`, `planUninstall`, `formatInstall`, `bytesHash`, `overrideOutdated`. Guide: `docs/install.md`.
- d6eec14: Screen zones reach override pages: `loadServerTheme` takes `zones` from the `https://nuikit/theme` answers (the nuikit resource serves them from `LocalPlayer.state.nuikitZones`), so `useClearOf` works on ox_lib, qbx_taxijob and other override pages. A zone change alone doesn't repaint the theme (`themeHash`). New: `setZones`.
- 031bf9f: A player's own look: prefs `identity`, `treatment` and `density`, applied live to every nuikit UI when the server allows them (`nuikit_identities`, `nuikit_treatments`); a Look settings section (look, style, size, spacing, motion, contrast).
- 7a04527: Screen zones: `NUI.zone(name, rects)` in Lua publishes what a UI covers on screen, and every nuikit page gets the merged set as `nuikit:zones`. `nuikit-core/react` adds `useZones()`, `clearOf(zones, position)` and `useClearOf(position)`, so a corner-anchored stack (notices, prompts) starts clear of the HUD's map or the vehicle cluster.
- 2ea77e5: Selection is the keycap Tile (tokens 1.7, `SELECTION_TOKENS`, docs/design/baseline.md "Selection"): no focus rings anywhere (focus renders the hover state; a text field keeps one caret rim), a lit row, menu item or tab is the primary keycap's face and wall (`--nk-tile-wall`, `--nk-tile-wall-shade`, `--nk-tile-radius`, `--nk-tile-key`, `--nk-tile-key-ink`, `--nk-tile-tint`, `--nk-tile-inset`), one `nk-indicator` per list slides between items by transform (sizes by FLIP), and lists (`nk-list`) space their rows by `--nk-list-gap` so a lit tile never touches a neighbour. The per-row hover fills, the row sweep and the marker are gone; `--nk-row-indicator` no longer changes rows.
- 7e782f3: `nk.settings.register({ id, label, icon, rows })`: any resource adds its own Settings section with toggle, select, range or text rows, saved per player (`nuikit:settings:<resource>:<id>`), read with `nk.settings.get(id)` and followed with `nk.settings.onChange(fn)` or the `nuikit:settings:<resource>` message.
- eb68708: `nk.settings`: resources declare settings rows (options, ranges, toggles) with presets and feature flags; pages show them as a live-preview draft and save or reset (`useSettings`, `loadSettings`, `draftSettings`…, NUI callbacks `https://nuikit/settings*`). Saved per player in KVP, merged over the defaults with a schema version.
- 4f35582: Cluster slots: `NUI.slot(cluster, key, opts)` lets another resource join a cluster (the HUD vitals row: voice, radio, a job); pages read them ordered with `useSlots(cluster)`.
- 014dc32: Tokens 1.4 (docs/design/foundation.md): treatment presets (`--nk-treatment: soft | glass | plate | slab`, defaults under the theme's own values), role colours and ramps (`--role-<name>`, `-deep`, `-light`; vitals, status, faction, rarity, brand, neutral), context materials (`--nk-material-{hud,menu,overlay}-*`, `--nk-slash`), `--nk-legibility`, states (`--nk-focus-style`, `--nk-hold-style`, `--nk-confirm-scale`, `--nk-level-style`), behaviour (thresholds, notify durations by severity, hold, cooldown, rest delay), motion steps (named eases, confirm/retract/fill/pulse rungs, `--nk-motion-profile`), z-layers, offsets and `--nk-glow-budget`. Every 1.3 theme compiles to the same values.
- eece522: Tokens 1.3 adds `--world-success` and `--world-destructive`: gains and losses drawn on the game or the HUD plate, derived from `--success` / `--destructive` with their lightness raised to 0.7, so a light theme's dark status colours still read on the dark plate. The slab delta (`+2`, `−1` on item notices) uses them.

### Patch Changes

- 94ce073: Backdrop filters go through one switch, `--nk-backdrop: on | off` (default on): surfaces set `--nk-backdrop-filter` and kit.css applies it unless `off`, so a server whose clients draw backdrop filters as black boxes turns them all off with one token.
- 6ea19bb: `nk.camera`: a targeted claim defaults its offset by what it targets (vehicles further out, `{ y = 5.5, z = 1.4 }`; peds as before), set in `nk.camera.defaults`. `StaggerGroup` reads `--nk-stagger` once per theme instead of on every flush.
- 401badf: `nuikit doctor` knows `[nuikit-qb]` and `[nuikit-esx]` ship, and counts `nuikit_voice` among the systems `nuikit.cfg` ensures.
- f1fc0b3: `nuikit doctor` warns when a `[nuikit]` system is installed but not running (and says how to start it), and notes when none is known to the server.
- e7c2aea: `nuikit doctor` checks GitHub once per start for a newer release (one console line when there is one; `nuikit_update_check 0` turns it off, `nuikit_update_delay` sets the wait). Version compare now ranks prereleases below their release. Release zips ship with `SHA256SUMS.txt`.
- 92684fc: Kit.css literals become levers with today's value as the default: `--nk-tile-lift`, `--nk-tile-press-ratio`, `--nk-leading-tight`, `--nk-leading-normal`, gauge-track-driven edge fills, `--nk-row-bar-thickness`, `--nk-row-bar-inset-scale`, `--nk-hold-ring-pad`, `--nk-pip-size`, `--nk-pip-gap`, `--nk-meter-segment-gap`, `--nk-glow-radius`.
- bee6e1a: `motionLevel(el)` takes an optional element and reads the nearest `[data-nk-motion]` from it up (a theme painted on a subtree), falling back to `<html>`, like kit.css's identity keywords. `countdown` and `notice`'s time line honour motion off on any ancestor.
- 378c07d: A theme painted on a subtree (`applyTheme(theme, element)`: a preview stage, a host module) now shows its whole identity: `applyTheme` marks the element `data-nk-theme` and kit.css re-declares its component tokens there, so density, radii, the HUD plate and the rest derive from that theme instead of what `<html>` resolved.

## 0.8.0

### Minor Changes

- 71e9442: Intents (docs/intents.md): the nine intent schemas (`packages/core/intents/*.json`) generate the TypeScript types and a Lua schema with LuaLS annotations. `nuikit-core/intents` exports `validateIntent`, the frame's `createIntentStore`, the wire types and the renderer module contract (`defineRenderer`, `rendererContext`); `nuikit-core/intents-react` exports `defineReactRenderer`. `@nuikit/init.lua` now loads `lib/intents.lua`: `nk.notify`, `nk.menu`, `nk.input`, `nk.confirm`, `nk.progress`, `nk.prompt`, `nk.target`, `nk.radial`, `nk.challenge`, validated at the call, yielding like `lib.*` or taking `{ cb = fn }`.
- bc127c3: - `compileTheme` warns on an empty token (`--primary: ;`) and on an alias that resolves to nothing (`var(--nope)`, or an alias to an empty token); the stock value is used (or the token is left out of a patch), and `var(--x, fallback)` pointing at such a token takes its fallback, as in CSS.
  - Runtime context: the server's currency and locale (`nuikit_currency`, `nuikit_locale` convars) reach every page that uses the bridge as `nuikit:context`; `getContext()` / `onContext()` and `useNuiContext()` expose `{ currency, locale }`, and `Money` formats with them by default.
  - Host: a module's queued messages are delivered only once its listeners are attached (`defineReactModule` signals after the first commit's effects), so nothing sent between mount and the first `onNui` is dropped.
- 20f7092: `<Surface>` keeps a closing surface drawn for its exit (up to 250 ms, none under reduced motion) so a Sheet or Dialog inside can slide out; `useSurfaceOpen()` returns false while the surrounding surface is closing, to pass as the Sheet's `open`.
- 22148ce: Renderer packs (docs/intents.md §9). A resource that declares `nuikit_renderer 'notify'` (one line per intent) and ships a module built with `nuikitModule()` whose default export is a renderer (`defineReactRenderer`) or a record of them replaces nuikit's default renderer for that intent, still themed by the server's tokens and stacked by the runtime; the newest started pack wins a kind, a stopped one hands back, and a pack that fails to load falls back to the default with an F8 line. `nuikit-core/host`: `host.fetchModule()` loads a module script for its exports without mounting it, `hoist()` is exported. `npm create nuikit -- -t renderer-pack` scaffolds a pack with a notify renderer on `notice`, a browser preview and `/<name>_test`.
- f510c7d: Services: `nk.camera` and `nk.controls` (`docs/services.md`), the runtime's shared camera and controls next to surfaces. `nk.camera.claim(opts)` takes the screen with a scripted camera started on the current view (or placed around a target entity or point with `offset`, `look`, `fov`, `duration`, `lockHeading`); claims stack client-wide, a claim on top suspends the one below, `release` resumes it or blends back to the gameplay camera, and a resource stopping or the player going down releases everything. `nk.controls.disable(set)` disables presets (`'all'`, `'movement'`, `'look'`, `'weapons'`, `'vehicle'`, `'frontend'`) and control ids as a union across sets, with one per-frame loop only while something is disabled; a surface can declare `controls` in its options and hold them while open. Both load with `@nuikit/init.lua`; the pause menu's camera module is now a thin shim over `nk.camera`.

### Patch Changes

- 30d20ea: `nuikit doctor`: `nuikit_loading` (a loadscreen) and `nuikit_chat` (a chat theme, no page) are listed as on nuikit; a failed contrast pair prints once; new `manifest-changed` finding says `refresh`, then `restart`, when a started resource's fxmanifest.lua changed on disk.

## 0.7.0

### Minor Changes

- a73299a: `nuikit doctor` (docs/doctor.md): the server tells you what's left. `doctor(snapshot)` and `formatDoctor` in nuikit-core (pure, bundled into the nuikit resource's `server/compiler.js`); `systems/nuikit/server/doctor.js` builds the snapshot from FXServer natives. Reports the framework, which adapter packs fit, every UI resource's status (on nuikit, hosted, adapted, override, untouched), conflicts (provide vs library, override missing or changed, newer protocol, start order, missing `dependency 'nuikit'`, theme contrast, newer release via `nuikit_latest`) with a next step each, and live `nuikit:intent` counts by source. `nuikit doctor json` for machines; `exports.nuikit:doctor()`.
- 682de8e: Identity tokens (tokens 1.1): type, shape, surface, density, motion and HUD style are tokens now, not just colour. `compileTheme` reads and derives `--brand`, `--font-display`, `--font-numeric`, `--nk-type-ratio`, the weights and tracking, `--nk-label-case`, `--nk-border-width`, `--nk-cut` (chamfered corners), `--nk-surface-opacity` / `-tint` / `-gradient` / `-edge`, `--nk-elevation`, `--nk-glow`, `--nk-density`, `--nk-ease`, `--nk-duration`, the HUD tokens and `--nk-row-indicator`, fills anything a theme leaves out (a plain TweakCN paste is the Graphite identity), and warns on floor violations (panel opacity under 0.92, HUD text over a white sky). Additive: every v1 name is unchanged. The kit utilities now read component tokens (`--nk-panel-*`, `--nk-row-*`, `--nk-key-*`, `--nk-chip-*`, `--nk-meter-*`, `--nk-gauge-*`, `--nk-heading-*`), each overridable in `theme.css`; new `nk-caption` utility. Four identities ship in `nuikit-core/themes` and the nuikit resource's `themes/`: Graphite (default), Signal, Velvet and Vector. Identity fonts (OFL, woff2) are bundled with every UI and served by the nuikit resource (`fonts/`).
- 677ab7e: Motion system (design v2 §5A, tokens 1.2). `compileTheme` derives a motion ladder from `--nk-duration` (`--nk-time-press` / `-hover` / `-base` / `-exit` / `-move` / `-modal` / `-screen` / `-ambient`, `--nk-stagger` and its cap), five easings and four springs (`--nk-spring-snap` / `-move` / `-soft` / `-pop`), from two new identity inputs, `--nk-motion-feel` (crisp, snap, smooth, stepped) and `--nk-spring-bounce`. Graphite is crisp, Signal snaps, Velvet glides with a slight bounce, Vector steps. Additive.

  Reduced motion now has two levels: a theme's `--nk-motion: 0` is off (as before), and the player's `reducedMotion` pref is "reduced" (`data-nk-motion="reduced"`): no movement, fades kept at most 100 ms. New `--nk-motion-move`. The prefs message is unchanged.

  New `nuikit-core/motion` entry (no dependencies, about 2 kB): springs sampled into Web Animations keyframes, retargeting with velocity, FLIP, timed runs, the selection indicator's key-repeat rule; `useSpring`, `useFlip` and `useIndicator` in `nuikit-core/react`.

  Kit: no text selection or image drag outside fields, themed scrollbars, selection, caret and placeholder; `nk-pop`, `nk-rise`, `nk-press`, `nk-stagger`, `nk-skeleton`, `nk-blink` and `nk-indicator`; keyboard and controller state (rows, tabs, toggles, focus) changes instantly. Components: `meter` and `progress-ring` timed runs and the `skill-check` needle are each one compositor animation (no per-frame JS or React renders); meter segments scale instead of resizing, and a critical meter blinks twice instead of pulsing forever. ox_lib's progress and skill check keep every request and timing.

### Patch Changes

- 90c84b7: Install: `exec @nuikit/nuikit.cfg` starts nuikit in order and holds its settings (`nuikit_currency`, `nuikit_locale`, `nuikit_host`); per-framework zips with a `server.cfg.snippet`; a txAdmin recipe for Qbox; `overrides.json` page hashes for `nuikit doctor`.
- fcaec05: `loadServerTheme` keeps asking the `nuikit` resource for the server theme when its first ask fails (override pages such as ox_lib start before `nuikit`), and the server's theme replaces the `nuikit/theme.css` stand-in when it answers. Before, such a page kept the client's cached `theme.css` (the theme from when `nuikit` last started) and never repainted on `nuikit theme reload`.

## 0.6.0

## 0.5.0

### Minor Changes

- 5d9eb9d: Import the Lua runtime like ox_lib: `dependency 'nuikit'` + `shared_script '@nuikit/init.lua'` loads it from the running `nuikit` resource, so updating nuikit updates every resource that uses it. `nk` is the new name (`NUI` stays the same table); the framework bridge loads on first use of `nk.player`. New projects from `create-nuikit` import it instead of carrying a copy of `nuikit.lua`. `nuikit check` accepts the import as the runtime.
- afa2e0a: Protocol v1 (docs/protocol.md). The ready handshake is versioned: the page sends `{ protocol, client }`, Lua answers with `protocol` and `capabilities` (`getHandshake()`, `protocolVersion()`, `hasCapability()`). `useNuiVisibility` sends Escape through `nuikit:escape` like any surface, so the topmost UI on the client gets it; `NUI.open({ escape })` sets what it does. The player payload no longer carries the bridge's internal `downed` field. New `scrim` token for darkening the game.
- f7b4d63: Theme engine: tokens v1 and `compileTheme`.

  - **Tokens v1** (`docs/tokens.md`): shadcn's tokens plus nuikit's `success`, `warning`, `info`, `hud`, `vital-health|armor|hunger|thirst|stress`, `nk-scale` and `nk-motion` (with `-foreground` where it applies), all with derived defaults so any shadcn/TweakCN paste works. Published as `nuikit-core/tokens.json` (DTCG 2025.10) and `nuikit-core/theme.schema.json`.
  - **`compileTheme(input, { mode, partial, highContrast })`** → `{ vars, warnings, contrast, version, mode, imports, hash }`: parses CSS pastes (`:root`/`.dark`, `@theme inline`, `prefers-color-scheme`, `@import` fonts), DTCG documents and objects; picks the dark set; resolves `var()`; lowers every colour (also inside shadows) to rgb; derives the nuikit tokens with hue-checked vitals; checks WCAG contrast with plain-language warnings. Also `toDtcg`, `parseDtcg`, `themeToCss`, `checkContrast`, `TOKENS`.
  - **`applyTheme`** compiles first and paints the full token set with rgb channels; plain objects patch the current theme; also accepts compiled themes and DTCG. Colours are now always written as `rgb()`/`rgba()` (a hex value no longer passes through as hex).
  - **Player preferences**: `setPrefs` / `getPrefs` and the `nuikit:prefs` message (UI scale 0.85–1.25, reduced motion, high contrast). `nuikit:theme` now carries the compiled theme (raw CSS still works).
  - **`loadServerTheme()`** for override pages: compiled theme + prefs from the `nuikit` resource with live reload, falling back to `theme.css`.
  - `lua/nuikit.lua`: the theme from `GlobalState.nuikitTheme` with live repaint on `nuikit theme reload`, and `NUI.prefs.get/set`.

## 0.4.0

### Minor Changes

- 8ff1605: The whole kit: one `nuikit.zip` with `[nuikit]` systems (HUD, stress, pause, death, loading screen, chat theme) and `overrides/` for ox_lib, ox_inventory, ox_target, illenium-appearance, Renewed-Banking, mm_radio, qbx_scoreboard, qbx_idcard, qbx_taxijob and qbx_vehiclesales. Pages that replace another resource's UI can opt out of the `nuikit:ready` handshake with `<meta name="nuikit-handshake" content="off">`.

### Patch Changes

- 677860a: Surfaces are `position: fixed`, so a Radix dialog opened inside one (which locks scroll by making `<body>` relative) no longer collapses the surface.

## 0.3.0

### Minor Changes

- 2ddceb9: `lua/bridge.lua`: one player shape for Qbox, QBCore, ESX and standalone (health, armor, needs, money, job, gang, voice, dead), sent as `nuikit:player` only when it changes; `usePlayer()` in React. Server-wide theming: `theme.css` in the `nuikit` resource is applied to every nuikit UI. The UI now tells Lua when it's listening (`nuikit:ready`), so surfaces, player and theme sent before the page loaded aren't lost.
- 79748d6: Surfaces: declare each piece of UI with `NUI.surface(name, opts)` and nuikit owns focus, cursor, stacking (hud < world < panel < modal < system), Escape order, exclusive panels, `hides` and `blockedBy` states across every resource that uses it, with no extra resource to install. React gets `<Surface>`, `useSurface`, `useNuiStates`, `openSurface`/`closeSurface`; the devtools get a Surfaces tab with state toggles. The Lua manager is tested under real Lua 5.4 in CI. The template now shows a HUD, a menu and a confirm dialog stacking correctly. `NUI.open`/`NUI.close` keep working.

### Patch Changes

- f8a3fe1: `applyTheme()` accepts a full TweakCN export as-is: `@import url(...)` lines (Google Fonts) become `<link>` tags, loaded once, and `@theme inline` blocks are ignored.
