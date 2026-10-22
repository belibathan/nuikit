# Decisions

Design calls don't wait on the owner. Since Oct 22, 2026 they are settled by **the design rule**
([`dispatch.md`](dispatch.md#the-design-rule-settles-design-questions)): hierarchical, the best option as the default,
the alternative behind a config key, token or prop. Agents decide new ones the same way and log them here in one row.
Only money, accounts, publishing and secrets go to the owner.

| # | Decision | Default (shipped) | Switch (the alternative) |
|---|---|---|---|
| 1 | `info` tone | Follows `primary` (grey in the stock theme) | `--info` in the identity/theme for a fixed colour |
| 2 | Cancel a progress from the keyboard | `nuikit_cancel` on **X** (`RegisterKeyMapping`, players rebind) | convar `nuikit_cancel_key` (empty = no default key) |
| 3 | Weapon readout on the HUD | The inventory's item image through the resolver | (decided earlier) |
| 4 | HUD vitals shape | One vital-chip family that follows the identity | identity tokens |
| 5 | ID card photo (`qbx_idcard`) | Full-height portrait | `Config.photo = 'avatar'` for the small round one |
| 6 | Reference exports (`bench/figma/reference/`) | JPEG q88 | PNG when lossless is needed (Figma frames are the lossless source) |
| 7 | qb-radialmenu adapter: vehicle doors, extras, seats | Kept (clean implementation) | adapter config to drop them, with a doctor note |
| 8 | Targeted camera offset (`nk.camera`) | Per kind: peds as now, vehicles further out (≈ `{ y = 5.5, z = 1.4 }`) | `offset` per call, or one global offset in config |
| 9 | Resume between two resources' camera claims | A cut | `duration` on resume for a blend, once spiked |
| 10 | Death band (`nuikit_death` `Config.band`) | On | `Config.band = false` |
| 11 | ox_lib notify `×N` (the same toast again) | Re-enters in place: a short half-distance slide, the count rises in | `--ox-notify-bump: 0` on `:root` in `nuikit/theme.css` (0–1 scales it) |
| 12 | HUD part placement (`nuikit_hud` `Config.parts`) | The preset's (compact: map top-right, location + wallet under it, vitals bottom-left, ammo over the cluster bottom-right) | A corner, `'map'`, `false` or `{ at, order }` per part |
| 17 | GTA's GPS distance in the radar (`nuikit_hud` `Config.minimap.gameDistance`) | Hidden (`HIDE_SATNAV` each frame) | `gameDistance = true` |
| 13 | GPS route on the compact ring (changes the default look on purpose; A4, `nuikit_hud` `Config.minimap.routeClip`) | `'box'`: a square radar box (the route reaches past the ring only at its corners; the map is squeezed ~29%) | `'mask'` for GTA's aspect (unsqueezed, the route overhangs), or `aspect` to force one |
| 16 | nuikit's waypoint tag on the ring (`nuikit_hud` `Config.minimap.waypointTag`) | Off (the owner, in game) | `waypointTag = true` |
| 14 | Compact map size (changes the default look on purpose; `nuikit_hud` `Config.minimap.size`) | 15rem | `size = 12` (the 0.7 ring) or any rem |
| 15 | Map halo (`nuikit_hud` `Config.minimap.halo`) | On (an experiment): the speedometer's plate behind the round ring | `halo = false`; strength from `--nk-hud-opacity` (shared), `--nk-map-halo-size` / `--nk-map-halo-opacity` |
| 16 | mm_radio device shape (`addons/mm_radio`) | nuikit's own drawn handheld silhouette (`radio-shape.svg`, inlined in the CSS) as a mask, filled with the panel surface, hairline and drop in the theme's tokens | `--mm-radio-shape: url(...)` on `:root` in `nuikit/theme.css` (any image; its alpha is the shape, stretched to 18 × 34rem) |
| 18 | Per-override levers (position/side, density, motion, zone clearing) | Theme tokens on `:root` in `nuikit/theme.css` (`--<override>-*`, read from the applied theme by `lib/levers.ts`); unset = today's look. ox_lib, Renewed-Banking, qbx_scoreboard first | A `nuikit` config block per override, if tokens turn out too limited |
| 19 | ox_inventory size (`addons/ox_inventory`) | Today's: 5 columns of 5.5rem slots, 0.5rem gap, the sheet follows the grid (33.5rem) | `--inv-slot-size`, `--inv-columns`, `--inv-gap`, `--inv-sheet-width` on `:root` in `nuikit/theme.css` |

Implementation of rows 2, 5, 7, 8 and 10 goes to the lane that owns the files (`dispatch.md`).
