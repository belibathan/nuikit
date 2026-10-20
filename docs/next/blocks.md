# Next: premium components and starter blocks (0.5)

**Goal.** 0.4.0 shipped the whole kit as finished resources. 0.5 ships the *standard* those resources are
made of, so anyone (a server owner, a developer, a Tebex seller) can build new FiveM UI that looks as good
and matches the server theme without designing anything:

1. **Components:** premium building blocks in the shadcn registry, each a composition of stock shadcn plus
   the kit utilities (`docs/design.md`).
2. **Blocks:** whole screens (a HUD, a shop, a garage…) assembled from those components, installable with
   `npx shadcn add` and as `create-nuikit` templates.
3. **The systems and overrides rebuilt on them**, so the kit, the registry and the template stay one design.

Read `CLAUDE.md` and `docs/design.md` first. Reference implementation: `systems/nuikit_pause`.

## Part 0: the theme engine (before components)

Status: 1–4 done (tokens v1 in [`docs/tokens.md`](../tokens.md), `compileTheme` in nuikit-core, the
`nuikit` resource compiles and publishes, `nuikit theme reload`, player prefs); 5 (theme studio) and 6 (CI
screenshots) open. Needs in-game verification on a prerelease.

Today a theme is shadcn's ~30 CSS variables, usually pasted from TweakCN. That covers surfaces, text,
primary, radius and fonts, but not what a game UI needs, so UIs hard-code the rest (success/warning
greens and ambers in notifications and inventory, the 45% black behind HUD chips, vitals guessing which
`chart-*` means health). Pasted themes are never checked, and each kind of UI loads the theme its own
way (message, cross-resource fetch, loading-screen handover, chat script). TweakCN stays a convenient
editor; the standard is ours.

1. **Token contract v1** (`docs/design.md`, versioned): shadcn's tokens plus nuikit semantic tokens,
   each with a derived default so any plain shadcn theme still works:
   `--success` `--warning` `--info` (status), `--hud` / `--hud-foreground` (surfaces drawn on the game),
   `--vital-health` `--vital-armor` `--vital-hunger` `--vital-thirst` `--vital-stress` (default to
   `chart-*`), `--nk-scale` (UI size multiplier), `--nk-motion` (on/off). Kit utilities and components read
   only these, so no UI hard-codes a colour.
2. **Theme compiler** in `nuikit-core` (`compileTheme(css) → { vars, warnings }`), used everywhere a theme
   is applied: parse any shadcn/TweakCN paste, lower oklch, fill derived tokens, force the dark set for
   in-game use, and check contrast (foreground on popover/card ≥ 4.5:1, primary-foreground on primary,
   HUD text on `--hud`), returning warnings. Unit-tested against a set of reference themes.
3. **One distribution path:** the `nuikit` resource compiles `theme.css` at start, logs the warnings in
   the server console, and publishes the compiled tokens (GlobalState) to every nuikit UI and override.
   `nuikit theme reload` re-reads the file and repaints every open UI live, with no restarts.
4. **Player preferences** (optional, per player via KVP): UI scale, reduced motion, high contrast. These
   are accessibility, never a different theme.
5. **Theme studio on the site:** paste a TweakCN/shadcn theme or tweak tokens, see the real kit screens
   (HUD, pause, inventory, ox_lib menus) update live, read the contrast warnings, download `theme.css`.
6. **CI:** render the key screens with 4 reference themes (stock neutral, a high-chroma one, a light-mode
   paste, a low-contrast one) and fail on contrast regressions.

## Part A: finalize 0.4 (small, first)

- [ ] `create-nuikit` template: rebuild its demo UI (`packages/create-nuikit/template/web/src/App.tsx`) on the
      kit (panel, rows, Kbd, HUD chips) so a new project starts premium. Keep the surfaces demo (HUD + menu +
      confirm).
- [ ] Turn the remaining hand-rolled patterns from the restyle into kit utilities or components (each was
      flagged by more than one UI):
      a field row (label/value/reset + control), a two-row panel header (title row + tabs), anchoring helpers
      for `--nk-edge`, and a documented first-row alignment for floating menus.
- [ ] `apps/www`: pages for `docs/design.md` (the kit language) and `docs/coverage.md`; update the landing
      copy to "One design system for your whole FiveM server"; screenshots of 0.4.0 screens.
- [ ] README: a short "Use the standard in your own resource" section (registry + kit + theme) linking the
      blocks page.

## Part B: components (`registry/nuikit/ui`)

Each is a registry item with `registryDependencies` on stock shadcn, `data-slot` attributes, `React.ComponentProps`
props, `cva` variants where there are variants, and a docs entry on the site with a live preview over a game
scene. Existing items (`vital`, `speedometer`, `key-hint`, `nui-menu`, `radial-menu`, `task-progress`,
`nui-toaster`) get brought onto the kit first.

| Component | What | Built from |
|---|---|---|
| `panel` | `Panel`, `PanelHeader` (title, description, actions, optional tabs row), `PanelBody` (`scroll`), `PanelFooter`. The one floating surface. | `nk-panel*`, ScrollArea |
| `menu-row` | 40px action row: icon, label, description, trailing meta / chevron / `Kbd` / checkbox / value stepper; `active`, `disabled`, `destructive`. | `nk-row`, Kbd, Checkbox |
| `stat` | Label + big tabular value + optional delta/meta. Sizes `sm` / `md` / `display`. | `nk-label`, `nk-num` |
| `meter` | Slim bar on a theme or game track, with label/value, thresholds (`low` → destructive), optional segments. Replaces ad-hoc bars. | Progress, `nk-track` |
| `hud-chip` | Always-on pill/tile on the game: icon + text, `active` (talking, selected), `warning`. | `nk-chip`, `nk-hud`, `nk-shadow` |
| `key-prompt` | "[E] Open garage" prompt, hold-to-confirm, multiple keys. (Supersedes `key-hint`.) | Kbd, Progress |
| `item-slot` | Inventory/shop slot: image, count, durability line, hotkey number, price/stock, states (empty, hover, drop-target, locked). | `nk-*`, `muted` wells |
| `money` | Formatted currency with tabular numbers, sign/direction, compact mode. | `nk-num`, Intl |
| `countdown` | Big timer (`mm:ss`), progress line, warning threshold. | `nk-display`, Progress |
| `notice` | Toast/notification item (icon, title, description, time-left line) and a stack. (Supersedes `nui-toaster` styling.) | `nk-panel` |
| `confirm` | Confirm dialog preset (title, body, cancel, destructive or primary action). | AlertDialog |
| `field` | Form row presets for game forms: label, hint, error, inline value, reset. | Field, Input, Slider, Select |
| `player-card` | Avatar/initials, name, role/job with duty dot, stats. | `panel`, `stat`, Avatar |
| `empty` | Empty and error state: one sentence of what to do next, optional action. | Empty |

Rules: no new colours, no px sizes, every state reachable from props (so blocks can be screenshotted),
keyboard + mouse, and tests where there's logic (countdown, money formatting, meter thresholds).

## Part C: blocks (`registry/nuikit/blocks`, type `registry:block`)

A block is a full screen wired to typed NUI messages (`nui.d.ts`) with `dev.tsx` fixtures, built only from
Part B components. Each also becomes a `create-nuikit` template (`npm create nuikit -- -t <block>`) that
includes the Lua side (`client/main.lua` with `NUI.surface` and example events).

| Block | Screen |
|---|---|
| `hud-minimal` | Vitals, money, voice, speedometer (from `nuikit_hud`). |
| `pause-menu` | From `nuikit_pause`. |
| `death-screen` | From `nuikit_death`. |
| `loading-screen` | From `nuikit_loading` (handover + progress). |
| `interaction` | Target eye + options list + key prompt. |
| `inventory` | Two-pane grid with drag/split, tooltip, hotbar (from the ox_inventory override, protocol-agnostic). |
| `shop` | Catalogue grid, cart, checkout with `confirm`. |
| `garage` | Vehicle list with stats (fuel/engine/body meters), take out / store, impound state. |
| `vehicle-shop` | Showroom: categories, vehicle detail, colour swatches, test drive, buy. |
| `bank` | Accounts, balance, transactions, deposit/withdraw/transfer (from the banking override). |
| `character-select` | Character slots, create, delete with confirm, spawn location list. |
| `job-menu` | Duty toggle, actions list, boss menu (employees table, hire/fire). |
| `settings` | Server-side player settings: toggles, sliders, keybind hints. |
| `scoreboard` | Players, activities, ping. |

## Part D: site (`apps/www`)

- `/blocks`: every block as a live preview over a blurred game scene, with a theme switcher (a few TweakCN
  presets + paste your own) and the install command.
- `/components`: every component with its states.
- `/design`: `docs/design.md` and the token contract.
- Registry builds via `pnpm registry:build`; keep `registry.json` valid against shadcn's schema.

## Order and acceptance

1. Part 0, then Part A, then `panel`, `menu-row`, `stat`, `meter`, `hud-chip` (most blocks need them), then the rest of B.
2. Rebuild `nuikit_pause` and `nuikit_hud` on the new components as the proof, then the blocks, then the
   other systems and overrides where it simplifies them (overrides must keep their protocol behaviour; re-run
   their POST checks).
3. Each step: typecheck, tests, build, Playwright screenshots at 1080p/1440p/720p, POST logs for anything
   that talks to Lua. Prerelease on `next/blocks` for the owner's in-game test before merging.

Done when: every component and block is in the registry and on the site, `npm create nuikit -- -t <block>`
works for each block, the systems use the shared components, and the owner has tested the prerelease in game.

Out of scope for 0.5: the phone (npwd), minigames, the reseller badge kit.
