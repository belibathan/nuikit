# The nuikit kit language

Every nuikit screen is stock shadcn, coloured only by the server's theme, and proportioned by the
rules below. The theme decides *what colour*; these rules decide *how big, how far apart, how loud*.
A server that pastes a new theme changes every screen at once and they still look like one product.

## Token contract

What a nuikit UI reads from `nuikit/theme.css` (any TweakCN / shadcn theme provides all of them):

| Token | Used for |
|---|---|
| `--background` / `--foreground` | Full-screen surfaces (pause, loading, death scrim), text on the game |
| `--popover` / `--popover-foreground` | Every floating panel (`nk-panel`) |
| `--card` / `--card-foreground` | Raised blocks inside a panel (slots, stat tiles) |
| `--muted` / `--muted-foreground` | Tracks, empty slots, secondary text |
| `--accent` / `--accent-foreground` | Hover and keyboard highlight |
| `--primary` / `--primary-foreground` | The one main action per surface, progress fills, selection |
| `--destructive` | Danger, damage, low values, death |
| `--border` / `--input` / `--ring` | Hairlines, fields, focus |
| `--chart-1` … `--chart-5` | Categorical meaning (vitals, needs, transaction types) |
| `--radius` | Panel corners = radius + 4px, controls = radius − 2px, chips = full |
| `--font-sans` / `--font-mono` | Text / codes and IDs only |

A UI never hard-codes a colour that one of these covers. Fixed colours are allowed only for things
the theme can't know: GTA's own palettes (hair colours), item images, and white text on the game world.

## Scale

`1rem` is 16px at 1080p and scales with the game's height (`html { font-size: 1.4815vh }`), so a
screen is the same size relative to the game at every resolution. Design at 1080p.

| | Values |
|---|---|
| Spacing | 4, 8, 12, 16, 24 px (`1 2 3 4 6`) inside panels; 48 (`12`) for full-screen gutters. Nothing in between. |
| Screen edge | 24px (`--nk-edge`) for anything anchored to an edge |
| Control height | 32 (compact), 36 (default), 40 (list row) |
| Text | 12 label · 14 body · 15 panel title · 20 section · 32+ numbers that are the point (balance, timer) |
| Weight | 400 body, 500 labels and rows, 600 titles and key numbers |
| Icons | 16px lucide, `muted-foreground` unless the icon is the state |
| Panel padding | header 12/16, body 8 (lists) or 16 (forms), footer 12/16 |

## Rules

1. **One panel recipe.** Floating UI uses `nk-panel` + `nk-panel-header` / `-body` / `-footer`.
   No nested cards inside cards; group with spacing and a hairline instead.
2. **Quiet by default.** Neutral surfaces; `primary` appears once per surface (the main action or
   the progress fill). Colour carries meaning, never decoration.
3. **Sentence case.** No uppercase tracked labels, no eyebrow text above titles, no `A · B · C` meta
   strings. Labels say what the value is in plain words.
4. **Numbers are tabular** (`nk-num`). Mono only for codes a player might type (plate, citizen ID).
5. **Rows, not tiles,** for lists of actions: `nk-row`, 40px, icon + label + trailing meta.
6. **Keys** are shadcn `Kbd`, next to the action they trigger.
7. **One motion.** Panels open with `nk-enter` (160ms fade + 2% scale). Nothing animates on its own
   except things that are live (progress, timers, talking).
8. **HUD stays out of the way.** Always-on elements use `nk-chip` or bare text with a shadow, no
   panels, and sit on the `--nk-edge` margin.
9. **Empty and error states** say what to do next in one sentence.
10. **Stock components.** Compose shadcn; never fork its files. If shadcn has it, use it.

Sizes are in rem (Tailwind's scale), never px, so they follow the resolution scale.
Reference implementation: `systems/nuikit_pause`.
