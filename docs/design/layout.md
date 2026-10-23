# Layout: Screen, zones, containers

*Oct 23, 2026. One model every page uses, so a UI works at 1280×720, 1920×1080, 2560×1440, 3440×1440, 5120×1440 and
1024×768 without a line of per-screen CSS. Sources: `packages/core/src/viewport.ts`, `zones.ts`, kit.css
`@layer nk.layout`, `registry/nuikit/ui/{screen,zone,region,grid}.tsx`. Chromium 103: no `@container`, so the screen is the one container.*

## The model

1. **Screen** (`<Screen>`, the page root). It holds the **content box**: 16:9 and centred on a wider screen, the whole
   screen otherwise. Zones sit at the box's edges, so an ultrawide keeps the HUD where the eye is. `bleed` (or
   `data-nk-bleed` on any subtree) uses the full width. Inside the box is a **safe area** (`--nk-safe-x/y`, for TV overscan).
   `data-nk-aspect` on `<html>` is one of 4-3, 16-10, 16-9, 21-9 or 32-9 (`useViewport()`).
2. **UI scale is rem.** `1rem = 16px` at 1080p. It follows the height, or a 16:9 width on a narrower screen.
   It never goes below `16px × --nk-scale-min` (12px, so 720p and 4:3 stay readable) or above 32px. It is
   multiplied by `--nk-scale` (theme × the player's UI size).
3. **Zones** (`<Zone at>`): nine places (`tl tc tr / ml mc mr / bl bc br`) and four edges (`t r b l`, flush, spanning
   their side). A zone is a flex column that grows towards the centre (bottom zones stack upwards), aligned to its own
   side, `--nk-zone-inset` (default `--nk-edge`) from the safe area. Its items stack and never overlap. Any position
   word works (`top-right`, ox `right-center`, qb `right`).
4. **Clearing.** `clear` moves a zone clear of what other UIs published there (`useClearOf`: only rects centred in
   its third; middle stacks move sideways). `publish="name"` measures it and publishes the rect: for this page at once
   (`setLocalZone`), and for every page through `NUI.zone` (`nuikit:zone`).
5. **Containers.** `Region` is a column with a header, a body (scrolls with `scroll`) and a footer pinned with `fill`.
   Its levers are `--nk-region-max` and `--nk-region-pad`. Panel, EdgeSheet and DialogShell are Regions on a surface.
   `Grid` is a grid of slots (`--nk-grid-cell`, `--nk-grid-gap`, `cols`, `fluid`); `useGridNav` moves focus with the
   arrow keys by where the cells actually sit. `Stack`/`Cluster` handle gaps.
6. **Flex as data**: `data-nk-flow="row|column|wrap|…"`, `data-nk-align`, `data-nk-justify` on any container.
7. **Resolution adapters**: `VIEWPORTS` (core) is the one table of aspects. Each has an edge, a floor and a
   sample size. kit.css mirrors it in aspect media queries, and a test keeps the two equal.

## The levers

| Lever | Default | Sets |
|---|---|---|
| `--nk-screen-ratio` | 1.7778 | The content box's width / height (`--nk-screen-max` = 100vh × it) |
| `--nk-area-{l,r,t,b}` | derived | The box's insets from the screen (the HUD sets them from GTA's own area) |
| `--nk-safe-x` / `--nk-safe-y` | 0rem | Safe area inside the box |
| `--nk-edge` | 1.5rem (16:10 1.25, 4:3 1) | A zone's distance from the safe area; every `nk-anchor-*` reads the same |
| `--nk-zone-inset` / `--nk-zone-gap` / `--nk-zone-z` | edge / space-3 / auto | Per zone |
| `--nk-scale-min` | 0.75 | The rem floor (× 16px) |
| `--nk-region-max` / `--nk-region-pad` | 28rem / surface pad | Region column |
| `--nk-grid-cell` / `--nk-grid-gap` / `--nk-grid-cols` | 5.5rem / space-2 / auto-fill | Grid |

## Checking it

`pnpm look <web dir> [url] --viewport 3440x1440 --themes default,square`. In the browser, open the devtools (`) and
go to **Scene & size**: the picker reloads the page in a 1280×720 … 1024×768 frame (`?viewport=WxH`).

## Adopted

`nuikit_hud`: every corner is a Zone (`Config.parts` → tl/tr/bl/br), the heading strip is `tc`, and GTA's area is
`--nk-area-*`. `Config.ultrawide = 'box' | 'bleed'` applies to the radar too. `nuikit_pause`: a bleeding Screen, a Region column,
and the sheets on levers. The host frame: a Screen, the menu in its zone, notices and prompts on box-aware anchors that clear each other.
