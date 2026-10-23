# Handoff: where nuikit stands (Oct 23, 2026)

*For the next lead or planning agent. Read this first, then [`../design/baseline.md`](../design/baseline.md),
[`../design/components.md`](../design/components.md), [`../design/default.md`](../design/default.md),
[`../design/naming.md`](../design/naming.md) and [`decisions.md`](decisions.md). Owner screenshots referenced
below are in [`feedback/2026-10-23/`](feedback/2026-10-23/).*

## 1. Where we are

`main` at the time of writing: `6b66abbc`. CI and Release green. Everything below is merged and deployed to the
owner's local Qbox server; the owner has played most of it.

- **Tokens 1.7** (`packages/core/src/tokens.ts`): scales (space, radius, heights, icons), type roles, tile,
  plate, fill (`--nk-fill-style: solid | soft`, default solid), accent gradient (`--nk-accent-*`), motion ladder,
  baseline (1.6) and selection (1.7) groups. Graphite's compiled values are kept stable; the treatment `tile`
  carries the flagship look.
- **Themes** (`packages/core/themes/`): **Default** (the flagship, was "Ink": monochrome, Barlow Condensed italic
  caps + Geist, slanted keycap tiles), **Neon Pop** (Default's structure, vivid palette and accent gradient),
  Graphite and the older identities. `ink` resolves to `default` until 0.10.
- **Registry** (`registry/nuikit/ui`): a network of ~10 foundations (Tile/Kbd, Fill, Chip, Text, IconText, Dial,
  Stack/Cluster, Panel, ActionBar, `useLinearRun`) + `SelectionTile`/`useSelectionIndicator`; composites are
  built from them (Meter, ProgressRing = segmented Dial, Notice, Countdown, DialogShell, SheetSection,
  Speedometer…). Deprecated aliases (HudChip, Vital, NuiMenu) live until 0.10.
- **Baseline** ([`baseline.md`](../design/baseline.md)): what made the speedometer premium, written as rules every
  component and theme inherits: generous spacing, two type voices, one icon size in a tile column, solid fills,
  segmented progress, keycap primary buttons, no focus rings, the selection is one sliding keycap per list, rows
  never touch.
- **Screens on it**: HUD (one Tile for vitals/voice/gear, fill-based status, speedometer with fuel arc, minimap
  with keycap cardinals), pause menu, inventory, ox_lib (context, list, input, alert, notify, progress, textui),
  the other overrides (banking, scoreboard, idcard, doorlock, radio, appearance, taxi, vehiclesales, target),
  chat, death, loading. Security pass done ([`security.md`](security.md)); health pass done ([`health.md`](health.md)).
- **Presentation**: README landing page, social preview and banner (`docs/assets/`), community files, docs site
  (`apps/www`) in the Default theme with a page per component. **Site not deployed.** GitHub About text, topics
  and launch-post drafts are suggestions in [`presentation.md`](presentation.md), not applied.

## 2. What the owner has said is right (keep it)

- The **speedometer and minimap** are the quality bar. The **HUD vitals** are the model of "clean": they use the
  space they have, compact motion, controlled depth (a light face over a dark wall dropped straight down,
  rounded all round), hold alignment, and reuse one geometry for several jobs (the tile is also the tag and the
  fill). See `speedometer-reference.png`, `vitals-two-layer-reference.png`.
- The **keycap kbd** (bold italic legend, slanted face, hard wall). Flat, solid, vibrant fills over weak gradients.
- **Motion that moves with you.** The pause menu's selection tile sliding from row to row "feels so smooth and
  just right". This is a design philosophy, not a feature: *the active state is one object that travels with the
  user's focus*. Carry it to every menu, tab set, segmented control, stepper, radial, grid (inventory slots),
  and list, in every theme.
- Flatter, clearer, compact; "a real game UI design language", not a web app.

## 3. Open bugs (owner, Oct 23; screenshots in `feedback/2026-10-23/`)

1. **Kbd legends aren't horizontally centred in their keycap** (`kbd-centering-action-bar.png`: A, D, ESC). The
   face is skewed; the legend must be centred on the face's optical centre (counter-skew or centre in the face
   box, not the bounding box). Fix once in Tile/Kbd; every keycap inherits.
2. **The appearance (clothing) menu clips the selection tile** at the panel's right edge and doesn't carry the
   menu design (no icon column, an emoji + "|" in the title from the resource) (`clothing-menu-clipping.webp`).
   It's ox_lib's context menu as illenium-appearance drives it: the list needs inline padding equal to the
   tile's inset + skew overhang so the lit tile never touches the panel edge, and resource-supplied titles
   should be normalised (strip a leading emoji/pipe into the icon slot).
3. **Stepper: the middle value box is taller than its arrow buttons** (`stepper-height-and-roll.png`,
   illenium-appearance drawable/texture). One control height (`--nk-h-control`) for all three parts, joined as
   one segmented control.
4. **TextRoll rolls the whole string.** `1 / 243` rolls entirely; only the changing number should roll, never the
   total or the separator. Same for the number inside the stepper field. Roll per numeric token (or per changed
   digit), static text stays still.
5. **Duplicate exit in the appearance action bar** (`kbd-centering-action-bar.png`: "ESC Exit" hint and an "Exit"
   button). One action, one place: a key hint *or* a button, with the action bar deciding.
6. Known gaps: nuikit's own host renderers (`systems/nuikit/web/src/renderers` menu, target) draw the tile per
   row but don't slide; the inventory item menu is unverified in game; "QBOX MULTICHAR" (qbx_core) is assumed to
   inherit ox_lib's context styling but unverified; Confirm can't use DialogShell (Radix swallows Escape).

## 4. Feature direction (owner + lead)

- **"Moves with you" everywhere** (see §2): a shared selection indicator for tabs, segmented controls, steppers,
  radial menus, inventory grid focus, scoreboard rows, pause map list; `useSelectionIndicator` is the foundation.
- **Steppers and pickers as one component** (value, prev/next keycaps, roll on change, hold-to-repeat), used by
  appearance, settings, input dialogs.
- **Normalised resource input**: titles, icons, emoji, colour codes from third-party resources pass through one
  sanitiser into the slots (icon column, title voice), so every override looks native.
- **HUD editor polish**: the editor was simplified (Layout vs Style, live preview, Save/Cancel/Reset); bring it
  onto the baseline and the sliding selection.
- **Presentation when the owner says go**: deploy the site, apply the GitHub About/topics, upload the social
  preview, launch posts.

## 5. How to build it so philosophy changes are cheap (the strategy)

The lesson of the last two days: every inconsistency came from a screen drawing something itself. Changes
landed fast only when they were made once, in a foundation, and inherited.

1. **One concept, one component.** Every visual idea (keycap, fill, selection, row, panel, action bar, stepper,
   dial) has exactly one implementation in `registry/nuikit/ui`. Screens compose; they never restyle internals.
   If a screen needs something new, add a prop or lever to the foundation, not CSS to the screen.
2. **Levers, not values.** Every number a designer might change (spacing, radius, heights, skew, wall depth,
   fill style, gaps, durations) is a `--nk-*` token with a good default. A design-philosophy change is a token
   change, previewable on the site in every theme at once.
3. **Themes set values only** (`@layer nk.theme`): a palette plus a treatment plus lever values. No component
   rules in themes; if a theme needs a rule, the kit is missing a lever.
4. **Behaviour is shared too**: motion (`useLinearRun`, `useSelectionIndicator`, TextRoll, the ladder),
   selection, focus, Escape, hold. Behaviour drift is as visible as style drift.
5. **Write the rule, then enforce it**: each convention goes into `baseline.md` and, where possible, a
   `nuikit check` rule (warnings today; flip to errors per folder as each is clean).
6. **Verify visually before shipping**: Playwright shots of the dev fixtures under Default, Neon Pop and Graphite,
   compared against the reference shots; the owner judges in game. Keep the fixtures realistic (mixed vital
   levels, long titles, third-party strings).
7. **Third-party input is hostile to design**: sanitise strings, icons and sizes at the boundary (the adapter
   layer), so overrides look native without per-resource CSS.

## 6. Working on the owner's machine (practical)

- Repo `C:\dev\nuikit`; server data `C:\FXServer\txData\Qbox_D52860.base` (`server.cfg` holds secrets: never
  print). Systems are junctioned into the server; addons deploy with `.local\deploy.ps1` after `pnpm build`.
- **`systems/nuikit/theme.css` is locally modified** (the owner's private server palette; its source copy is in
  `.local/`): never commit it; `git stash push -- systems/nuikit/theme.css` around merges, and restore it from the
  `.local/` copy if lost. The committed stock is Default; `.local/theme-ink-server.css` is a backup of it.
- Live loop: `pnpm --filter ./systems/<x>/web dev` hot-reloads that page in game (the vite plugin rewrites
  `ui_page`, restored on exit); `.local\nk-restart.ps1 <resource>` restarts a resource via `nuikit_dev`.
  **Never queue `nuikit` or `ox_lib`** (refused: restarting them stops `nuikit_dev` mid-command and crashed
  FXServer). Those need the txAdmin console or a full restart.
- Full restart: txAdmin (owner logs in; the agent must not enter credentials) or stop/start `FXServer.exe` in a
  terminal tab. ox_lib/ox_target UI changes need a full restart.
- Don't use worktree isolation from a session whose cwd might be another repo: create worktrees explicitly with
  `git -C C:/dev/nuikit worktree add …`. Never touch the owner's private server repo.
- Credit `@belibathan` only. No server names (the private palette ships publicly only as "Neon Pop").

## 7. Suggested next steps (for the planner to order)

1. Fix the §3 bugs in the foundations (Tile/Kbd centring, list inline padding, stepper as one control, TextRoll
   per token, action-bar de-dup), then re-shoot and re-test in game.
2. Generalise the sliding selection (§4) to every collection component; migrate the host renderers.
3. Burn down `nuikit check` warnings per folder and flip rules to errors as each folder is clean.
4. Verify the unverified (inventory item menu, multichar, Confirm) in game.
5. Presentation: deploy the site, apply the GitHub metadata, launch, when the owner says go.
