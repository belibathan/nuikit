# The nuikit kit language

Every nuikit screen is stock shadcn, coloured only by the server's theme, and proportioned by the
rules below. The theme decides *what colour*; these rules decide *how big, how far apart, how loud*.
A server that pastes a new theme changes every screen at once and they still look like one product.

## Token contract

The full contract is **[tokens v1](tokens.md)**: names, derived defaults, the compiler, contrast checks
and how the theme reaches every UI. In short, what a nuikit UI reads:

| Token | Used for |
|---|---|
| `--background` / `--foreground` | Full-screen surfaces (pause, loading, death scrim) |
| `--popover` / `--popover-foreground` | Every floating panel (`nk-panel`) |
| `--card` / `--card-foreground` | Raised blocks on a full-screen surface (not inside a panel: in many themes card = popover) |
| `--muted` / `--muted-foreground` | Tracks, slots and wells inside a panel, secondary text |
| `--accent` / `--accent-foreground` | Hover and keyboard highlight |
| `--primary` / `--primary-foreground` | The one main action per surface, progress fills, selection |
| `--destructive` / `--success` / `--warning` / `--info` (+ `-foreground`) | Status: danger and low values, done, caution, notices |
| `--hud` / `--hud-foreground` | Surfaces and text drawn straight on the game (`nk-chip`, `nk-hud`) |
| `--vital-health` … `--vital-stress` | Health, armor, hunger, thirst, stress bars |
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
| Spacing | 4, 8, 12, 16, 24 px (`1 2 3 4 6`) inside panels; 48 (`12`) for full-screen gutters. Nothing in between. |
| Screen edge | 24px (`--nk-edge`) for anything anchored to an edge |
| Control height | 32 (compact), 36 (default), 44 (list row, × `--nk-density`) |
| Text | 13 label · 16 body · 17–18 panel title · 23 section · 36+ numbers that are the point (balance, timer); 18+ HUD values. Graphite at ratio 1.2; identities change the ratio (tokens 1.1) |
| Weight | 400 body, 500 labels and rows, 600 titles and key numbers |
| Icons | 16px lucide, `muted-foreground` unless the icon is the state |
| Panel padding | header 12/16, body 8 (lists) or 16 (forms), footer 12/16 |

## Rules

1. **One panel recipe.** Floating UI uses `nk-panel` + `nk-panel-header` / `-body` / `-footer`.
   No nested cards inside cards; group with spacing and a hairline instead.
2. **Quiet by default.** Neutral surfaces; `primary` appears once per surface (the main action or
   the progress fill). Colour carries meaning, never decoration.
3. **Sentence case.** No uppercase tracked labels, no eyebrow text above titles, no `A · B · C` meta
   strings. Labels say what the value is in plain words. Write text in sentence case; an identity may
   uppercase captions and headings (`--nk-label-case`, `--nk-heading-case`, tokens 1.1), never in markup.
4. **Numbers are tabular** (`nk-num`). Mono only for codes a player might type (plate, citizen ID).
5. **Rows, not tiles,** for lists of actions: `nk-row`, 44px (× density), icon + label + trailing meta.
6. **Keys** are shadcn `Kbd`, next to the action they trigger.
7. **Motion with a purpose** ([Motion](#motion)). Panels open with `nk-enter`; nothing animates on its own
   except things that are live (progress, timers, talking). Keyboard and controller state is instant.
8. **HUD stays out of the way.** Always-on elements use `nk-chip` or bare text with a shadow, no
   panels, and sit on the `--nk-edge` margin.
9. **Empty and error states** say what to do next in one sentence.
10. **Stock components.** Compose shadcn; never fork its files. If shadcn has it, use it.

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
`nk-title` `nk-display` `nk-label` `nk-num` · `nk-row` `nk-scroll` · `nk-field` `nk-field-label` ·
`nk-chip` `nk-chip-active` `nk-hud` `nk-track` `nk-shadow` · `nk-edge` (`--nk-edge`) `nk-anchor-*` `nk-first-row` ·
`nk-enter` `nk-rise` `nk-pop` `nk-stagger` `nk-press` `nk-skeleton` `nk-blink` `nk-indicator`.
Defined once in `packages/create-nuikit/kit.css` and inlined into every synced `index.css`; never redefine an
`nk-*` name locally. `nk-panel`'s depth is a `box-shadow`, so mark a selected panel with `outline`, not `ring-*`.

Sizes are in rem (Tailwind's scale), never px, so they follow the resolution scale.
Building or changing a registry component? The **[component contract](design/contract.md)** is the merge checklist:
tokens, states, motion, controller focus, identity screenshots, registry metadata, and which items CI checks.

## Motion

Design v2 §5A. Tokens and the helper: [`tokens.md#motion-12`](tokens.md#motion-12). Proof: `bench/motion/results.md`.

1. **Instant state.** Row highlight, tabs, toggles, checkboxes and focus driven by the keyboard or a controller
   change with no transition (kit.css zeroes them, shadcn's included). Only pointer hover eases
   (`--nk-time-hover`). Highlight locally first; the POST confirms.
2. **One moving thing per list.** If selection should glide, use one `nk-indicator` behind the rows
   (`useIndicator`), never transitions on the rows. Key-repeat: moves sooner than `--nk-time` apart glide in
   `--nk-time-press`; from the third, it jumps, so it never trails a held d-pad.
3. **Fast, and exits faster.** Use the ladder, never raw ms: press ≤ 100, panel `--nk-time`, exit
   `--nk-time-exit`, full screen ≤ 400. Enter with `--nk-ease-out`, exit with `--nk-ease-in`, opacity only.
4. **Transform and opacity only.** Never animate `width`, `height`, `top`, `left`, `margin`, `box-shadow`,
   `filter`, `clip-path` or a CSS variable. No `transition: all` in new code. Meters move by `scaleX` or
   `translateX`; needles and rings by `rotate`.
5. **Chromium 103.** cubic-bezier only (no `linear()`), no `@starting-style`, no individual `translate` /
   `scale` / `rotate` properties, nothing essential on `:has()`. Springs come from `nuikit-core/motion`
   (sampled WAAPI keyframes), never a requestAnimationFrame loop.
6. **Never on a centred dialog's own element** (its transform centres it): `nk-pop`, `nk-rise` and `nk-press` go
   on an inner wrapper there. `nk-pop` handles its own `[data-state=closed]` exit; use it plain, not behind a
   `data-[state=open]:` variant.
7. **Stagger the first open only**, the first five items (`nk-stagger` + `--i`), never on updates, filtering or
   navigation.
8. **Zero cost when idle.** No infinite animation on an always-on surface: a threshold gets `nk-blink` (two
   blinks), not a pulse. A finished animation leaves nothing running (`document.getAnimations()` is empty).
   Timed runs are one animation for the whole run, and `onComplete` stays on a timer.
9. **Reduced motion keeps meaning.** Under `data-nk-motion="reduced"` nothing moves and fades stay ≤ 100 ms;
   colour still carries state. Progress still plays.
10. **Identity, not code, sets the feel.** Signal snaps, Velvet glides, Vector steps: read the tokens and
    `data-nk-feel`, never branch on the identity's name.
Reference implementation: `systems/nuikit_pause`. The registry components (`panel`, `menu-row`, `stat`,
`meter`, `hud-chip`, …) are these utilities with props; prefer them over the raw classes.

## Recipes

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
