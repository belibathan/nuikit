# Dispatch: parallel agents on the kit

*How several coding agents work on nuikit at once without colliding. The lead session owns the platform
(0.6, `docs/architecture.md`); agents own the lanes below. Status lives in [`../roadmap.md`](../roadmap.md).*

## Lead decisions log

- Oct 20: `form-field` naming accepted; Blocks owns `create-nuikit/src` for `-t <block>`; `nuikit check` accepts
  `nk.surface` / `nk.open`. Component requests (menu-row muted stepper tone, meter additions, speedometer on HUD
  tokens, `countdown`) belong to the Components lane; site requests (`@theme` tokens, ThemePicker applying the
  preset on load, `react-day-picker` if a calendar is wanted) to Blocks + site. One session per lane: a second
  session on the same branch must stop.

## Every agent, before anything

1. Read `CLAUDE.md`, then `docs/vision.md`, `docs/architecture.md`, `docs/design.md`, `docs/tokens.md`, and this file.
2. nuikit is **the shared layer between scripts and screens on any FiveM server**. The kit is the default look
   and the showcase. Rules: every step ships something useful on its own; test mechanisms before building on
   them; be honest about what's unproven.
3. Branch from `main` as `feat/<lane>`. Small PRs into `main`, often. Rebase on `main` daily. Never push to
   `main`; the lead reviews and merges.
4. Only touch the files your lane owns (table below). Need a change elsewhere (a token, a kit utility, Lua, a
   shared component another lane owns)? Write it in your PR description under "Requests"; don't make it.
5. Every PR: `pnpm typecheck && pnpm test && pnpm build:systems`, the conformance gate
   (`node packages/cli/dist/cli.js check systems/nuikit_death systems/nuikit_hud systems/nuikit_loading systems/nuikit_pause addons packages/create-nuikit/template --level 3`),
   Playwright screenshots at 1920×1080, 2560×1440 and 1280×720 (look at them), POST logs for anything that
   talks to Lua.
6. In-game test: push `next/<lane>` for a prerelease and give the owner a short checklist. Nothing merges
   untested in game.
7. Update your lane's row in `docs/roadmap.md` in each PR. Credit is `@belibathan` only. Never print or commit
   secrets.

## File ownership

| Lane | Owns | Branch |
|---|---|---|
| Lead (platform) | `packages/core` (src, lua, intents, tokens), `packages/cli`, `packages/vite`, `systems/nuikit` (the runtime resource), `scripts/`, `docs/architecture.md` `protocol.md` `tokens.md` `host.md` | `feat/intents`, … |
| Components | `registry/nuikit/ui/*`, `registry/nuikit/hooks/*`, `registry.json`, `apps/www/src/components.tsx` and component previews | `feat/components` |
| Screens | `systems/nuikit_death`, `nuikit_loading`, `nuikit_chat`, `addons/*` **except** `addons/ox_inventory` | `feat/screens` |
| Blocks + site | `registry/nuikit/blocks/*`, `packages/create-nuikit` (templates, `src/` for `-t <block>`, its build script; not `kit.css` / `index.css.tpl`), `apps/www` (except the components page) | `feat/blocks` |
| Showcase | `systems/nuikit_pause`, `systems/nuikit_hud`, `systems/nuikit_stress`, `addons/ox_inventory` | `feat/showcase` |

Shared and append-only: `registry.json` entries, `.changeset/*.md` (one file per PR). `packages/create-nuikit/kit.css`
and `index.css.tpl` belong to the lead: propose new `nk-*` utilities under "Requests". Synced copies
(`web/src/index.css`, `web/src/components/ui/*`, `lib/`) are never edited by hand: `pnpm sync`.

## Lane: Components (`feat/components`)

Finish and redesign the component set (`docs/next/blocks.md` Part B) **as the default renderers for the
intents** (`docs/architecture.md` §2). In 0.6 each intent is drawn by these components, so their props should
already carry every field the intent needs:

| Intent | Component(s) | Props must cover |
|---|---|---|
| `notify` | `notice` (+ stack) | title, description, status (info/success/warning/error), icon, duration with a time-left line, position |
| `menu` | `panel` + `menu-row` (shipped; extend) | items: icon, label, description, metadata rows, image, progress, disabled, submenu arrow, active |
| `input` | `form-field` (not `field`: shadcn's `field` exists and a registry item of that name would overwrite it) | text, number, select, checkbox, slider, date, colour; label, hint, error, required, min/max |
| `confirm` | `confirm` | title, body, cancel and confirm labels, destructive or primary |
| `progress` | `meter` (shipped), `progress-ring` (new) | label, value or duration, cancellable, bar or circle |
| `prompt` | `key-prompt` | keys, label, hold-to-confirm with progress, multiple prompts |
| `target` | `menu-row` list near a point | options with icon, label, disabled |
| `radial` | `radial-menu` (exists; redesign) | items, submenus, centre label |
| `challenge` | `skill-check` (new) | zone size and position, speed, key, result |

Also from Part B: `item-slot`, `money`, `countdown`, `player-card`, `empty`. Supersede `key-hint`, `nui-toaster`,
`task-progress` (keep them working, mark deprecated).

Bar: built from stock shadcn + kit utilities only; tokens only; rem not px; every state reachable from props
(for screenshots and the site); keyboard and mouse; motion through `--nk-motion` (none when reduced); `data-slot`
attributes; `cva` variants; tests where there's logic (countdown, money, skill-check timing, meter thresholds);
each one on `/components` with all its states over a game scene. Premium, minimal, consistent with
`systems/nuikit_pause` and `docs/design.md`.

Order: `notice`, `form-field`, `confirm`, `key-prompt`, `progress-ring` first (the intents need them), then the rest.

## Lane: Screens (`feat/screens`)

Rebuild the remaining screens on the shared components, where it simplifies them: `nuikit_death`,
`nuikit_loading`, `nuikit_chat`, then the overrides in this order: **ox_lib** (it themes 40+ Qbox scripts),
ox_target, Renewed-Banking, illenium-appearance, qbx_scoreboard, qbx_idcard, qbx_taxijob, qbx_vehiclesales,
mm_radio.

- Overrides are **clean-room** and **protocol-exact**: every POST payload and timing must match
  `docs/<name>-protocol.md`, verified with Playwright POST logs before and after. Never copy upstream code,
  markup or styles.
- Use the components as Lane Components ships them (rebase on `main` after each merge); until a component
  exists, keep the screen's current markup rather than building a private copy.
- The ox_lib override's notify, menu, input, alert, progress, text UI and skill check are the first users of
  the intent renderers: keep their structure close to the component props above so 0.6 can route ox_lib calls to
  the shared renderers.

## Lane: Blocks + site (`feat/blocks`)

`docs/next/blocks.md` Parts C and D, plus the theme studio (Part 0 item 5):

- Blocks (`registry/nuikit/blocks`, `registry:block`), each a full screen wired to typed NUI messages with
  `dev.tsx` fixtures, built only from registry components, each also a `create-nuikit` template
  (`npm create nuikit -- -t <block>`, with Lua using `@nuikit/init.lua` and `nk.surface`). Start with the blocks
  the shipped components cover: `hud-minimal`, `pause-menu`, `death-screen`, `loading-screen`, `settings`,
  `scoreboard`. Then the rest as components land.
- Site: `/blocks` with live previews over a game scene, a theme switcher (TweakCN presets + paste your own),
  the install command per block; theme studio (paste a theme or tweak tokens, see the kit update live, read the
  contrast warnings from `compileTheme`, download `theme.css`).

## Lane: Showcase (`feat/showcase`, the owner's existing agent)

Pause, HUD and inventory: fix the 0.5.0 minimap restart quirk; keep the FPS budget (report numbers in PRs);
move to the shared components as they land. The camera module stays self-contained: the lead moves it into the
runtime as `nk.camera` (0.6 step 3), and the pause menu then calls that.

## How the lead integrates

Reviews each PR against this file and `CLAUDE.md`, merges into `main` in small batches, cuts one combined
prerelease per batch for the owner's in-game test, and keeps `docs/roadmap.md` current. Conflicts outside a
lane's files mean a rule was broken: the lane rebases and moves the change into "Requests".
