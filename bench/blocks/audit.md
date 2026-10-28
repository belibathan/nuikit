# Blocks audit against components v2 (Oct 21, 2026, `feat/blocks-071`)

The 14 blocks in `registry/nuikit/blocks`, read against the v2 components as they are on `base/071`
(`registry/nuikit/ui`), the component tokens (`docs/tokens.md` 1.1/1.2), the kit utilities
(`packages/create-nuikit/kit.css`) and the rules in `docs/design.md` / `docs/design.md`.

What was looked for, per block:

1. **Own markup where a component exists** (money formatting by hand, a hand-rolled empty state, a
   row that is a `MenuRow`, a card that is a `PlayerCard`, a `nk-panel` div that is a `Panel`).
2. **Hard-coded look**: a fixed colour, a Tailwind type recipe where a kit type style exists
   (`nk-display`, `nk-title`, `nk-caption`), raw durations.
3. **px** in layout (rem only; px for hairlines).
4. **Motion rules**: nothing animating `width`/`all`, no infinite animation on an always-on surface,
   durations from the ladder.
5. **Copy rules**: sentence case, no `A · B` meta strings.
6. **States**: every state the block has reachable from fixtures (`fixtures.ts`) and on `/blocks`.

Legend: **fix** = changed in this branch; **keep** = looked at and left (with why); **request** =
needs another lane.

## Shared findings (every block)

- Six blocks format money with their own `Intl.NumberFormat` (`hud-minimal`, `pause-menu`,
  `death-screen`, `garage`, `bank`, `job-menu`) while `money` ships `Money` / `formatMoney` (tabular,
  the identity's numeric font, locale and currency in one place). **fix**: all on `formatMoney` /
  `<Money>`.
- Seven blocks hand-roll an empty state as `<p className="nk-row text-muted-foreground">` (`settings`,
  `scoreboard`, `garage`, `bank` ×2, `job-menu`) while `empty-state` exists (icon, title, one sentence,
  announced when it's an error). **fix**: `EmptyState`.
- `" · "` joins in `character-select` (job · last played) and `shop` ("Cart · 3"), `vehicle-shop`
  ("Test drive · 30s"): design rule 3. **fix**: commas / parentheses.
- Titles set with Tailwind recipes (`text-2xl leading-8 font-semibold tracking-tight`) where the kit
  has the identity's display/heading face (`nk-display`, `nk-title`): `pause-menu` (server name),
  `loading-screen` (server name, phase line). The identity's `--font-display`, weight and tracking
  never reached them. **fix**.
- Section captions as `nk-label` (`job-menu` "Hire someone nearby", `shop` "Cart", `bank` "Recent"):
  these are the short names of a group, which is `nk-caption` (the identity's label case and
  tracking); `nk-label` is for text as written. **fix**.
- Every block's states were already reachable from props + fixtures and shown on `/blocks`; the
  states added here (below) are the ones a screenshot couldn't reach.

## Per block

### hud-minimal
- Money by hand → `formatMoney`. **fix**
- Job line: own markup with `text-xs font-medium` and a duty dot. **keep** as bare text (rule 8: no
  panels on the HUD), but on `nk-caption` so the identity's caption style applies; the dot is a
  `success`/muted dot like `player-card`'s (it was `bg-primary`: primary is the action, duty is a
  status). **fix**
- `GAUGE = 176` px: `Speedometer`'s `size` prop is a diameter in px at 1080p by contract (it sets
  `${size/16}rem`), so this is rem under the hood. **keep**
- States: driving, warnings, redline, talking, on-foot, standalone. All in fixtures; `/blocks` lacked
  the redline still. **fix** (added).

### death-screen
- Money by hand → `formatMoney`. **fix**
- `animate-pulse` on the red vignette while down: Tailwind's infinite 2 s pulse, on a screen that can
  stay up for minutes (motion rule 8: no infinite animation; and it runs at every motion level). **fix**:
  the vignette is steady; urgency is carried by `Countdown`'s `warnAt` (the clock turns red and blinks
  in the last 30 s, which the component already does on the kit's rules).
- Subtitle and "Waiting for help" use `text-foreground/75` over the game: the death screen is text on
  the game, which has its own tokens (`--world-foreground`, `-muted`, `--world-shadow`;
  `docs/tokens.md`). The block root now wears `nk-on-game`, so `text-foreground`
  reads the world colour and carries the world shadow in any theme (Daylight included), and the
  secondary lines use `text-world-foreground-muted`. **fix**
- Background gradients in inline `style` read `var(--destructive)` / `var(--scrim)`: tokens, no
  `color-mix`, fine on 103. **keep**
- States: down, down-ems, down-urgent, dead, dead-respawn, dead-untimed. **keep** (all present).

### pause-menu
- Money by hand → `formatMoney`; `pauseInitials` duplicates `player-card`'s `initials`. **fix**:
  `pauseInitials` stays exported (it was public API) as an alias of `initials`.
- The player card is a hand-built `Panel` with an `Avatar`, a role line and a duty dot. `PlayerCard`
  is exactly that (avatar/initials, name, job + grade, duty dot and words, stats grid). **fix**: on
  `PlayerCard`, with the players-online meter and server ID as its children.
- Server name as `text-xl leading-7 font-semibold tracking-tight` → `nk-display` ("the pause title"
  is one of the four display moments in `docs/tokens.md`). **fix**
- `links` list: a `dl` with `text-sm` → `nk-label` / `nk-num`. **fix**
- Keyboard: W/S and arrows between rows; local, no POST. **keep**
- States: full, opening (no server answer yet), no-character, minimal, confirming. `/blocks` lacked
  the confirm. **fix** (added "Disconnect?").

### loading-screen
- Server name and the phase line on Tailwind recipes → `nk-display` / `nk-title`. **fix**
- Tip dots: `transition-all duration-500` animating `width` (motion rule 4). **fix**: the dots change
  instantly (keyboard-like state) and only opacity eases over `--nk-time`.
- Background cross-fade `duration-[1600ms]`: a raw duration. **fix**: `calc(1600ms × --nk-motion)`
  (an image cross-fade has no step on the ladder; it's zero under motion off, as the kit requires).
- Percent uses `nk-display nk-num`: `nk-display` sets the heading font; `Stat size="display"` pins the
  numeric face. **fix**: the percent is a `Stat size="display"`.
- States: full/plain/minimal/none handovers × map/afterMap/ready. **keep**

### settings
- Empty state → `EmptyState`. **fix**
- The `key` row is its own `nk-row` markup; `MenuRow readOnly kbd=…` is that row (shown, not used,
  not dimmed). **fix**
- Everything else is on `MenuRow` (checkbox, stepper) and `SliderField`. **keep**
- States: full, single, disabled, empty. **keep** (`/blocks` gains "Empty").

### scoreboard
- Empty states (no one online, no match) → `EmptyState`. **fix**
- Activities: own `nk-row` markup with a dot → `MenuRow readOnly` with the dot as its icon and the
  detail as its description. **fix**
- Player rows: a table with four aligned columns (ID, name, job, ping). A `MenuRow` has one trailing
  slot, so the row stays a kit `nk-row` with cells; it's a kit utility, not private markup. **keep**
- Search `Input` with its own icon overlay → `TextField` from `form-field` has `icon` and the same
  height; but it adds a label row the header doesn't want. **keep** (stock Input is allowed).
- Ping legend dots and tones: tokens. **keep**
- States: full, search, standalone, alone, no match. `/blocks` lacked "alone" and "no match". **fix**

### garage
- Money by hand → `formatMoney`. **fix**
- Empty states → `EmptyState` (both: no vehicles, nothing in this tab). **fix**
- Rows on `MenuRow` (description tone through a selector on `menu-row-description`): the warning tone
  for impounded is a state, and the selector is the documented `data-slot` hook. **keep**
- States: full, impounded, on-foot (refused), empty. **keep**

### bank
- Money by hand (`money`, `signed`) → `Money` with `sign="always"`; gains in `success`, losses in the
  text colour (a withdrawal isn't an error). **fix**
- Transactions: own `nk-row` markup → `MenuRow readOnly` (icon, title, time + note, amount as meta).
  **fix**
- Empty states (no accounts, no transactions) → `EmptyState`. **fix**
- "Recent" divider: `nk-panel-header` with a `nk-label` → `nk-caption`. **fix**
- The money dialog is already `Confirm` + `TextField`. **keep**
- States: full, atm, frozen, new, plus the dialog (deposit/withdraw/transfer) which was only reachable
  by clicking. **fix**: a `dialog` prop opens one for stills; `/blocks` gains "Transfer".

### job-menu
- Money by hand → `Money`. **fix**
- Empty state → `EmptyState`. **fix**; "Hire someone nearby" → `nk-caption`. **fix**
- Employee rows: `nk-row` with three icon buttons trailing. `MenuRow` has no slot for a button group
  and a `readOnly` row is `role="menuitem"`, so the row stays a kit `nk-row` (status dot, name,
  grade line, buttons). **keep**
- Error line in the panel: `border-b px-4 py-2 text-sm text-destructive`, `role="alert"`. **keep**
- States: boss (actions/staff), officer, off-duty, no-one-nearby, mechanic, refused, firing. `/blocks`
  lacked the fire confirm. **fix** (`firing` prop for stills; "Fire?" state).

### interaction
- Options list is a `nk-panel … p-1.5` div with a `nk-label` title → `Panel size="sm"` + `PanelBody`
  with the label as a `nk-caption`. **fix**
- The hint is a hand-made `nk-hud rounded-md px-2 py-1 text-xs` → `HudChip`. **fix**
- The eye: `nk-hud` circle, `transition-colors` with Tailwind's default 150 ms on a Lua-driven state
  (`live`). **fix**: `duration-(--nk-time)`.
- Error line inside the list: `text-xs text-destructive`, `role="alert"`. **keep**
- States: idle, vehicle, picking, person, prompt, hold, several, both. **keep**

### inventory
- Tooltip is a `nk-panel … p-3` div → `Panel size="sm"` with `PanelBody variant="form"`. **fix**
- Tooltip placement: `window.innerHeight - 220` px → rem-based (`14rem` in page px). **fix**
- Ghost offset `-mt-10 -ml-10` (rem). **keep**
- Footer hint "Drag to move. Shift drags half, Ctrl one." **keep**
- Everything else on `ItemSlot`, `Meter`, `Panel`. **keep**
- States: pockets, locker (stash), heavy, empty, hotbar. `/blocks` lacked "Empty". **fix**

### shop
- "Cart · 3" → "Cart" + count as `nk-num` meta; caption on `nk-caption`. **fix**
- Already on `Money`, `EmptyState`, `ItemSlot`, `MenuRow` steppers, `Confirm`. **keep**
- States: store (cart, confirm), broke (not enough), vending (empty). **keep**

### vehicle-shop
- "Test drive · 30s" → "Test drive (30 s)". **fix**
- `PanelBody className="flex flex-col gap-4 p-4"` → `variant="form"` (the body padding token). **fix**
- Already on `Money`, `Meter`, `ColorField`, `Confirm`. **keep**
- States: pdm (showroom, confirm, locked), budget (not enough). **keep**

### character-select
- `job · lastPlayed` → comma. **fix**
- The slot's initials bubble is private markup (`size-7 rounded-full bg-muted text-xs font-semibold`)
  → `Avatar` with `AvatarFallback` through `MenuRow`'s `image` slot. **fix**
- `PanelBody className="flex flex-col gap-4 p-4"` → `variant="form"`. **fix**
- Already on `PlayerCard`, `Money`, form fields, `Confirm`. **keep**
- States: three (characters, spawn, delete), first (create), full. **keep**

## Requests (other lanes)

- **kit.css (lead):** the `fill` row indicator, the `stepped` feel and the reduced/off motion rules
  select on `html[data-nk-row]`, `html[data-nk-feel]`, `html[data-nk-motion]`. A theme applied to a
  subtree (`applyTheme(theme, element)`: the site's game stages, the host's per-module themes) paints
  those attributes on the element, where no kit rule sees them. The site mirrors the attributes onto
  `<html>` for now (one theme per page). Suggested: `:is(html, [data-nk-scope])[data-nk-row="fill"]`
  or simply `[data-nk-row="fill"]` (any ancestor).
- **menu-row (Components):** a trailing `actions` slot (a button group) would let `job-menu`'s staff
  rows and any "row with buttons" be a `MenuRow`.

## Screenshots

`bench/blocks/shots.mjs` renders every block state full-viewport (no stage scaling) through the
site's `/blocks/shot` route at 1920×1080, 2560×1440 and 1280×720 in Graphite over a game scene,
into `bench/blocks/shots/<block>/<state>-<w>x<h>.jpg`; `--ids=` picks other identities.
`bench/blocks/shots/site/` holds `/blocks` and `/theme` at 1440 wide. Results: `results.md`.
