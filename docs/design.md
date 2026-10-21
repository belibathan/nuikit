# The nuikit kit language

Every nuikit screen is stock shadcn, coloured only by the server's theme, and proportioned by the
rules below. The theme decides *what colour*; these rules decide *how big, how far apart, how loud,
and how it moves*. A server that pastes a new theme changes every screen at once and they still look
like one product.

The rules in **Surfaces**, **Motion** and **Universal glue** are the owner's, judged in game on the
v0.7.0 experiment server (`releases/v0.7.0-handoff.md` §2–§4, `releases/v0.7.0-design-patterns.md`).
They are the system; where an older rule or screen disagrees, these win.

## Token contract

The full contract is **[tokens v1](tokens.md)**: names, derived defaults, the compiler, contrast checks
and how the theme reaches every UI. In short, what a nuikit UI reads:

| Token | Used for |
|---|---|
| `--background` / `--foreground` | Full-screen surfaces (pause, loading, death scrim) |
| `--popover` / `--popover-foreground` | Every floating panel and sheet (`nk-panel`, `edge-sheet`) |
| `--card` / `--card-foreground` | Raised blocks on a full-screen surface (not inside a panel: in many themes card = popover) |
| `--muted` / `--muted-foreground` | Tracks, slots and wells inside a panel, secondary text |
| `--accent` / `--accent-foreground` | Hover and keyboard highlight |
| `--primary` / `--primary-foreground` | The one main action per surface, progress fills, selection |
| `--destructive` / `--success` / `--warning` / `--info` (+ `-foreground`) | Status: danger and low values, done, caution, notices |
| `--hud` / `--hud-foreground` | Surfaces and text drawn straight on the game (`nk-chip`, `nk-hud`) |
| `--vital-health` … `--vital-stress` | Health, armor, hunger, thirst, stress |
| `--border` / `--input` / `--ring` | Hairlines, fields, focus |
| `--chart-1` … `--chart-5` | Other categorical meaning (transaction types, charts) |
| `--radius` | Panel corners = radius + 4px, controls = radius − 2px, chips = full |
| `--font-sans` / `--font-mono` | Text / codes and IDs only |
| `--nk-scale` / `--nk-motion` | UI size multiplier, animations on/off (theme × player preference) |

A server theme is any shadcn / TweakCN paste; the nuikit tokens are derived when it doesn't set them.
A UI never hard-codes a colour that one of these covers. Fixed colours are allowed only for things
the theme can't know: GTA's own palettes (hair colours, chat `^1` codes), item images, and shadows.

## Scale

`1rem` is 16px at 1080p and scales with the game's height (`html { font-size: 1.4815vh }`), so a
screen is the same size relative to the game at every resolution. Design at 1080p.

| | Values |
|---|---|
| Spacing | 4, 8, 12, 16, 24 px (`1 2 3 4 6`) inside panels; 48 (`12`) for the inner column of a flush sheet. Nothing in between. |
| Screen edge | 24px (`--nk-edge`, 1.5rem) for anything anchored to or inset from an edge |
| Control height | 32 (compact), 36 (default), **48 (a row in a sheet)**; 44 × `--nk-density` for `nk-row` in a legacy panel |
| Text | 13 label · 16 body · 17–18 panel title · 23 section · 36+ numbers that are the point (balance, timer); 18+ HUD values. Graphite at ratio 1.2; identities change the ratio (tokens 1.1) |
| Weight | 400 body, 500 labels and rows, 600 titles and key numbers |
| Icons | 16px lucide, `muted-foreground` unless the icon is the state |
| Sheet column | floating: 24px all round; flush: 48px from the screen edge, 24px from the open edge |

## Surfaces

**One family: every window is a shadcn Sheet** (`edge-sheet` in the registry wraps it). Hand-built
boxes, nested cards and bespoke frames are out. A sheet has two placements, and the placement is
decided by what the game is doing behind it, not by taste:

| Placement | When | Shape | Examples |
|---|---|---|---|
| **Flush** (`<EdgeSheet variant="flush">`) | **The game is paused or replaced.** One system screen at a time: pause, the full map, character select, creation | The backdrop touches the top, bottom and its screen edge; a hairline on the open edge only; a scrim falloff from the edge; the content in an **inner column** (48px from the screen edge, 24px from the open edge) | the pause menu with the map inside the same sheet |
| **Floating** (`variant="floating"`, **the default**) | **The game keeps running behind it.** Anything opened from the world: inventory, banking, shops, clothing, job menus, context and list menus, dialogs, trays | Inset `--nk-edge` (1.5rem) from the top, bottom and its side; a border all round; the identity's corner shape on every corner; the panel shadow | the two inventory sheets, a job sheet, the ox_lib context menu |
| **Tray** | Actions and key hints for the window above it | A floating bar along the bottom; it never touches the screen bottom | inventory use / give / amount |

Flush is reserved for one top-level system screen; everything else floats, picks a side (right for
menus opened from the world, left for "your stuff") and never designs its own frame. A `fit` floating
sheet is as tall as its content, from the top edge down.

**Inside a sheet: rows, not cards.**

1. **Rows are 48px** (3rem), icon + label + trailing meta or control, with a hairline between them and a
   `Separator` between sections. Rows are the unit of everything inside a sheet: an action, a setting, a
   person, a slot group. No cards inside a sheet, no card inside a card; group with a section title
   (`nk-caption`) and a hairline.
2. **One ScrollArea column** with a gutter (`<EdgeSheetBody scroll>`), so the scrollbar never covers content.
   The header and the actions row stay put; only the column scrolls.
3. **Sub-pages swap in place** inside the same sheet: change `page`, the column fades to the new one,
   a back row (`onBack`) leads the header, and Escape goes back before it closes. A sub-page never opens
   a second card beside the first.
4. **Exactly one primary action per surface**, drawn as a filled button in the actions row (`EdgeSheetFooter`);
   everything else is a row or a ghost button. Key hints are `Kbd` next to the action they trigger.
5. **A level along the edge.** A weight, a capacity or a progress that belongs to the whole sheet is traced
   along the header's bottom hairline (`meter`), the way a vital is traced along its chip: the hairline is the
   track, the fill is the brand, destructive past `meterDanger`.
6. **A sheet never closes itself.** Outside clicks, focus and Escape go to the owner (the surface, the
   resource); several floating sheets can be open at once (an inventory's two sides), staggered with `delay`.

`edge-sheet` props: `open`, `side` (`left` | `right`), `variant` (`floating` | `flush`), `fit`, `width`
(rem, default `36rem`), `delay` (ms), `modal` (default false), `icon`, `title`, `description`, `actions`
(right of the title), `meter` / `meterDanger`, `page`, `onBack`, `onClose`, `onOpenChange`. Parts:
`EdgeSheetBody` (`scroll`, `onViewportScroll`), `EdgeSheetFooter`, `EdgeSheetEdge`.

The legacy recipe `nk-panel` + `nk-panel-header` / `-body` / `-footer` (the `panel` component) stays for
small popovers that are not windows (a tooltip-sized card, a confirm); a window is a sheet.

## Rules

1. **Sheets, not boxes.** A window is an `edge-sheet` ([Surfaces](#surfaces)). `nk-panel` is for small
   popovers only. No nested cards anywhere; group with spacing and a hairline instead.
2. **Quiet by default.** Neutral surfaces; `primary` appears once per surface (the main action or
   the progress fill). Colour carries meaning, never decoration.
3. **Sentence case.** No uppercase tracked labels, no eyebrow text above titles, no `A · B · C` meta
   strings. Labels say what the value is in plain words. Write text in sentence case; an identity may
   uppercase captions and headings (`--nk-label-case`, `--nk-heading-case`, tokens 1.1), never in markup.
4. **Numbers are tabular** (`nk-num`). Mono only for codes a player might type (plate, citizen ID).
5. **Rows, not tiles,** for lists of anything: 48px in a sheet (`nk-row` 44 × density in a legacy panel),
   icon + label + trailing meta.
6. **Keys** are shadcn `Kbd`, next to the action they trigger.
7. **Motion with a purpose** ([Motion](#motion)). Sheets slide in from their edge and rows stagger after
   them; values that change in place roll; nothing else animates on its own except things that are live
   (progress, timers, talking). Keyboard and controller state is instant.
8. **HUD stays out of the way.** Always-on elements use `nk-chip` / `vital-chip` or bare text with a
   shadow, no panels, and sit on the `--nk-edge` margin.
9. **Empty and error states** say what to do next in one sentence.
10. **Stock components.** Compose shadcn; never fork its files. If shadcn has it, use it (Sheet, Dialog,
    AlertDialog, ScrollArea, Separator, Item, Kbd, Tooltip, Progress, Slider, ToggleGroup…). The nuikit
    layer on top (`edge-sheet`, `text-roll`, `smooth-input`, `vital-chip`, `nui-image`) is composition,
    not forks. Drawer (vaul) is modal underneath even with `modal={false}` and breaks drag between panels:
    trays are a bottom Sheet.
11. **Subtle over spectacular.** A focus camera keeps the player's current view and moves in; it never
    spins or swings round to the face. No studio light on a pause or inventory (lighting stays an opt-in
    `nk.light` idea). Nothing glows, pulses or breathes to be noticed.
12. **Replace native, fully.** A nuikit screen that stands in for a GTA one does everything the native did
    (the pause map shows every blip, filters them, click sets a waypoint).

**shadcn is the foundation.** Every new-york-v4 component is vendored in `vendor/shadcn/ui` (plus its
`use-mobile` hook), and `pnpm sync` follows their imports, so listing `sidebar` in a `nuikit.json` brings
`sheet`, `tooltip`, … and the hook along; `tw-animate-css` is in every page's `index.css`, so shadcn's
enter/exit animations always work. Compose from it first: Sheet (side panels and trays), Dialog and
AlertDialog (confirms), ScrollArea, Separator, Item (rows with media, title, description and actions), Kbd,
Tooltip, Progress, Slider, ToggleGroup, Tabs, Command (searchable lists), Table, Skeleton, Empty — and
nuikit's layer on top only for what the game needs (`panel`, `menu-row`, `meter`, `stat`, `hud-chip`,
`key-prompt`, the toaster). Do not reach for vaul's `Drawer` for a tray: it is modal even with
`modal={false}` (it leaves `body { pointer-events: none }` behind, which breaks drag and drop and anything
else on the page), so a bottom tray is a `Sheet` with `side="bottom"`. Components that bring a heavy or
unproven runtime (`chart`/recharts, `form`/react-hook-form, `combobox` on `@base-ui/react`,
`message-scroller` on `@shadcn/react`, `carousel`/embla) are vendored but no page uses them yet; sync warns
when a page lists a component whose npm packages its `web/package.json` lacks.

## Kit utilities

`nk-panel` `nk-panel-header` `nk-panel-header-stack` `nk-panel-title-row` `nk-panel-body` `nk-panel-footer` ·
`nk-title` `nk-display` `nk-label` `nk-caption` `nk-num` · `nk-row` `nk-scroll` · `nk-field` `nk-field-label` ·
`nk-chip` `nk-chip-active` `nk-hud` `nk-track` `nk-shadow` · `nk-edge` (`--nk-edge`) `nk-anchor-*` `nk-first-row` ·
`nk-enter` `nk-rise` `nk-pop` `nk-stagger` `nk-press` `nk-skeleton` `nk-blink` `nk-indicator`.
Defined once in `packages/create-nuikit/kit.css` and inlined into every synced `index.css`; never redefine an
`nk-*` name locally. `nk-panel`'s depth is a `box-shadow`, so mark a selected panel with `outline`, not `ring-*`.

Sizes are in rem (Tailwind's scale), never px, so they follow the resolution scale.
Building or changing a registry component? The **[component contract](design/contract.md)** is the merge checklist:
tokens, states, motion, controller focus, registry metadata, and which items CI checks.

## Motion

Motion is a first-class, out-of-the-box nuikit feature, not polish added per screen. Tokens and the helper:
[`tokens.md#motion-12`](tokens.md#motion-12). Proof: `bench/motion/results.md`. The owner's rules first,
then the mechanics.

**The rules**

1. **Entrances.** A sheet slides in from its edge (panel time × 2.2, ≤ 360ms, `--nk-ease-out`); the rows
   stagger in after it (`nk-stagger` + `--i`, the first five, first open only). A sub-page fades in place
   (`nk-enter`); the sheet itself only slides on open.
2. **Exits.** A sheet slides back out on close, faster than it came (× 1.4, ≤ 200ms, `--nk-ease-in`).
   `nuikit-core`'s `<Surface>` keeps the surface drawn for up to 250ms after close (`useSurfaceOpen()`),
   and **input is released at once**, so the game never feels stuck behind an animation.
3. **Text roll** for every value that changes in place: location, money, counts, speed, ammo, labels
   (`TextRoll`, `NumberRoll`; `NumberRoll` rolls each digit on its own, up when the value grows). Not for
   text the player reads while it moves (lists, paragraphs). The rule learned the hard way: **rolls are
   vertical only; alignment is resolved per layer; width changes move neighbours, never the rolling text.**
   Each layer (the word going out, the word coming in) sits at its own final alignment in the reel (`align`,
   else read from `text-align` or a centring flex parent), so a centred word leaves straight up from its
   centre and the next arrives straight up on the same centre; the reel's width tweens and slides the
   neighbours. Before this rule, centred text slid diagonally and jolted at the end.
4. **Synchronized selection layer.** A selection indicator is **one element** (`nk-indicator`, `useIndicator`):
   the fill and the ring glide together, rows never paint their own selected background, and dividers sit
   under it. Key-repeat: moves sooner than `--nk-time` apart glide in `--nk-time-press`; from the third, it
   jumps, so it never trails a held d-pad.
5. **Smooth caret and typing** on every text field (`SmoothInput`, `SmoothTextarea`: drop-ins for shadcn
   `Input` / `Textarea`). A caret that glides and breathes in the primary, typed characters that ease in;
   the real field stays underneath (selection, IME, paste, forms).
6. **Everything obeys motion off and reduced motion.** `/nuikit motion off` (`data-nk-motion="off"`) is
   instant: no slide, no roll, no caret glide; sheets show and hide at once. Reduced motion
   (`data-nk-motion="reduced"`) keeps a fade of **100ms or less** and nothing moves: shadcn's enter / exit
   animations lose their slide and zoom, rolls become a cross-fade, the caret is the native one. Colour
   still carries state; progress still plays.

**The mechanics**

7. **Instant state.** Row highlight, tabs, toggles, checkboxes and focus driven by the keyboard or a
   controller change with no transition (kit.css zeroes them, shadcn's included). Only pointer hover eases
   (`--nk-time-hover`). Highlight locally first; the POST confirms.
8. **Fast, and exits faster.** Use the ladder, never raw ms: press ≤ 100, panel `--nk-time`, exit
   `--nk-time-exit`, full screen ≤ 400. Enter with `--nk-ease-out`, exit with `--nk-ease-in`.
9. **Transform and opacity only.** Never animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`,
   `filter`, `clip-path` or a CSS variable. No `transition: all` in new code. Meters move by `scaleX` or
   `translateX`; needles and rings by `rotate`; a level traced on an outline by `stroke-dashoffset`.
10. **Chromium 103.** cubic-bezier only (no `linear()`), no `@starting-style`, no individual `translate` /
    `scale` / `rotate` properties, nothing essential on `:has()`. Springs come from `nuikit-core/motion`
    (sampled WAAPI keyframes), never a requestAnimationFrame loop. `tw-animate-css` must be loaded by
    every page, or shadcn's Sheet and Dialog don't animate at all (the 0.7.0 pause menu's lesson).
11. **Never on a centred dialog's own element** (its transform centres it): `nk-pop`, `nk-rise` and
    `nk-press` go on an inner wrapper there. `nk-pop` handles its own `[data-state=closed]` exit; use it
    plain, not behind a `data-[state=open]:` variant.
12. **Stagger the first open only**, never on updates, filtering or navigation.
13. **Zero cost when idle.** No infinite animation on an always-on surface: a threshold gets `nk-blink`
    (two blinks), not a pulse. A finished animation leaves nothing running (`document.getAnimations()` is
    empty). Timed runs are one animation for the whole run, and `onComplete` stays on a timer.
14. **Identity, not code, sets the feel.** Signal snaps, Velvet glides, Vector steps: read the tokens and
    `data-nk-feel`, never branch on the identity's name.

**Motion components** (registry, `npx shadcn add https://nuikit.vercel.app/r/<name>.json`, or list them in a
system's `nuikit.json` and `pnpm sync`):

- `edge-sheet` → `import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet"`.
  The sheet with its entrance, exit, stagger and in-place sub-pages built in ([Surfaces](#surfaces)).
- `text-roll` → `import { TextRoll, NumberRoll } from "@/components/ui/text-roll"`. Props: `direction`,
  per-character `stagger`, `align`.
- `smooth-input` → `import { SmoothInput, SmoothTextarea } from "@/components/ui/smooth-input"`. Same props
  and ref as shadcn's `Input` / `Textarea`.

All of them read `html[data-nk-motion]`: off swaps at once, reduced keeps a ≤ 100ms fade with no movement.

**The HUD status row** (`vital-chip`, `import { VitalChip } from "@/components/ui/vital-chip"`): vitals are
**one chip family**, no labelled special cases. The chip is composable (`Root`, `Shape`, `Level`, `Icon`,
`Label`, `Pop`) and one SVG path per shape drives its surface, border, level trace, liquid fill and anchors,
so the level is traced along the chip's own outline in the identity's shape, never a circle inside a square.
A change pops a flag out of the chip's side, in line with the row, so several vitals changing at once sit side
by side and never collide. The other variants (`--nk-chip-shape`, `--nk-level-style`, `--nk-label-attach`,
`--nk-vital-icon`; in game `/hudstyle`) are **experimental**: tried with the owner and shelved (too small, weak
as an aesthetic); the parts structure stays. Voice and radio are the always-on layer; vitals surface on change.

Reference implementations: `systems/nuikit_pause` (flush), the `job-sheet` block (floating, sub-pages, actions
row). The registry components (`edge-sheet`, `menu-row`, `stat`, `meter`, `hud-chip`, …) are these rules with
props; prefer them over the raw classes.

## Universal glue

nuikit is a universal glue, not a kit for its own surfaces only. It connects to what servers already have
instead of inventing a nuikit-only format, and when a convention isn't there it falls back silently.

1. **Images by convention** (`docs/images.md`, `resolveImage` in `nuikit-core`, `<NuiImage>` in the registry).
   One resolver for every picture: `kind` + key → candidate URLs, best first → an icon fallback. Out of the box:
   - **Items and weapons:** `nui://ox_inventory/web/images/{name}.png` (and ox_inventory's own `inventory:imagepath`),
     then qb-inventory, ps-inventory, lj-inventory. A weapon is an item (`WEAPON_PISTOL.png`). HUD weapon and
     item icons come from here, never from nuikit glyphs.
   - **Vehicles:** `https://docs.fivem.net/vehicles/{model}.webp` (base-game spawn names).
   - **Clothing:** no default (packs differ); the server names one template: fivem-greenscreener's
     `{gender}_{prefix}{id}_{drawable}_{texture}.png`, or a public set like Colbss/FiveM-ClothingData.
2. **Configurable templates**, one convar per kind (`setr nuikit_images_item "https://cdn…/{name}.webp"`,
   `_weapon`, `_vehicle`, `_clothing`; `;`-separated, tried before the defaults; `nuikit_images_replace 1`
   drops the defaults). The nuikit resource serves them to every page (`https://nuikit/images`).
3. **Silent fallbacks.** A missing image never shows a broken-image icon or an error: the next candidate,
   then an icon (or the UI's `fallback`), and a UI without any picture keeps its plain controls. Nothing
   in a nuikit screen depends on an image loading.
4. **Popular resources first.** Adapters and overrides read the data the server already has (`bridge.lua`
   for the framework, the resource's own protocol for an override) and speak its conventions (ox, QBCore,
   ESX events and exports) rather than asking servers to adopt new ones. New conventions are documented in
   `docs/images.md` and `docs/coverage.md` when they are added; a server never needs nuikit's format to use
   nuikit's screens.

## Recipes

**Job sheet.** A floating sheet for a resource's menu: header row, sections of rows, a sub-page that swaps in
place with a back row, one primary in the actions row. The `job-sheet` block is the template
(`npm create nuikit -t job-sheet`); a resource fills `Config.jobs[...].pages` and never draws its own frame.

```tsx
<EdgeSheet open side="right" title="LSPD" description="Officer, on duty" page={page.id} onBack={back} onClose={close}>
  <EdgeSheetBody scroll>
    {page.sections.map((s) => (
      <section key={s.id}>
        {s.title && <p className="nk-caption px-3 pt-4 pb-1">{s.title}</p>}
        {s.rows.map((r) => <MenuRow key={r.id} className="h-12" …>{r.label}</MenuRow>)}
        <Separator />
      </section>
    ))}
  </EdgeSheetBody>
  <EdgeSheetFooter>
    <Button className="flex-1">Clock out</Button>
    <Kbd>Esc</Kbd>
  </EdgeSheetFooter>
</EdgeSheet>
```

**Two-row header.** A header that carries tabs, a search or a meter under its title:

```tsx
<header className="nk-panel-header-stack">
  <div className="nk-panel-title-row">
    <h2 className="nk-title flex-1 truncate">Wardrobe</h2>
    <span className="nk-label">Unsaved changes</span>
  </div>
  <TabsList className="w-full">…</TabsList>
</header>
```

**Field row.** A control in a form panel gets a label row: name, optional hint, then value and reset on the right.

```tsx
<div className="nk-field">
  <div className="nk-field-label">
    <span className="truncate">Nose width</span>
    <span className="ml-auto flex items-center gap-1">
      <Button variant="ghost" size="icon-xs" aria-label="Reset"><RotateCcwIcon /></Button>
      <span className="nk-num text-muted-foreground">0.40</span>
    </span>
  </div>
  <Slider … />
</div>
```

**Anchoring.** Anything pinned to the screen sits `--nk-edge` (24px) from it: `nk-anchor-tl` `-tr` `-bl` `-br` for corners,
`nk-anchor-t` `-b` `-l` `-r` for the middle of an edge. They are `position: absolute`, so the full-screen root is
their container, and the edge-centred ones centre with auto margins (no transform for `nk-enter` or a dialog to fight).
Set `--nk-edge` on the root (or add `nk-edge`) to move every anchor at once.

**First-row alignment.** A floating menu that opens beside a point (the target eye, the cursor, a row it came from)
lines its first row up with that point, not its top edge. Put the panel's top on the point and add `nk-first-row`:
it pulls the panel up by the 1px border, the 8px body padding and half a row. Leave a 16px (`ml-4` / `mt-4`) gap
between the point and the panel.
