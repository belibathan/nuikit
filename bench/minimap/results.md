# Minimap paint spike (design v2 §4, route b)

*Oct 20, desk research only. Nothing here has run on a client yet; the test below is what decides it.
This PR ships no texture streaming.*

**Question:** can a resource repaint GTA's radar so the map itself follows the server's identity, and what
does it cost?

## What the radar draws

| Layer | What it is | Repaintable? |
|---|---|---|
| Map tiles | Six texture dictionaries, `minimap_sea_0_0` … `minimap_sea_2_1` (3 rows × 2 columns, one tile ≈ 4500 world units). The same tiles feed the radar and the pause map. Land, water and roads are baked into them. | **Yes**, by replacing the tiles. This is how every "postal map", "dark map" and atlas pack on FiveM works: they stream same-named `.ytd` files. Confirmed working for the Los Santos tiles in [this thread](https://forum.cfx.re/t/how-can-i-add-more-minimap-quadrants-in-fivem-atlas-vice-cry-minimap/1768324); [Extra Map Tiles v2](https://forum.cfx.re/t/extra-map-tiles-v2-add-extra-textured-tiles-on-the-pause-menu-map-and-minimap-new-and-revamped-version/5344181) adds tiles next to them and reports 0.00 ms in resmon. |
| GPS route, blips, player arrow, north blip | Drawn by the game over the tiles | Colours of blips and the route are natives (`SetBlipColour`, `SetBlipRouteColour`); shapes are not. |
| Interiors | Separate interior textures | Not covered. |
| The radar's frame, mask, health/armour arcs | `minimap.gfx` + `radarmasksm` | nuikit already replaces `radarmasksm` at runtime (the circle) and hides the arcs. |

## Three ways to get new pixels onto the tiles

1. **Stream tinted `.ytd` files** (the postal-map way). Proven. Two problems for nuikit:
   - **Licence.** The tiles are Rockstar's art. nuikit is MIT and can't ship recoloured copies of them. A
     server would have to make its own from its own game files.
   - **Tooling.** Writing a `.ytd` needs CodeWalker or OpenIV; there is no maintained Node/CLI writer, so
     `pnpm build` can't do it. Tinting the PNGs is easy (a luminance → token ramp); packing them isn't.
2. **Replace the tiles at runtime with runtime textures** (`CreateRuntimeTxd` + `AddReplaceTexture`, the same
   calls `client/minimap.lua` uses for the circle mask). Nothing streamed. The pixels can come from:
   - a PNG in the resource (`CreateRuntimeTextureFromImage`): still the licence problem if it's derived
     from Rockstar's tiles; fine for an original map drawing.
   - **a DUI page** (`CreateDui` + `CreateRuntimeTextureFromDuiHandle`) that shows the stock tile through
     `https://nui-img/<txd>/<txn>` (FiveM's game-texture URL, needs `RequestStreamedTextureDict` first;
     [thread](https://forum.cfx.re/t/does-fivem-expose-ingame-assets-like-fonts-or-images-to-html/1738376))
     under an SVG colour-ramp filter built from the theme tokens. **Tint from tokens at runtime, no
     redistribution, no build step, follows `nuikit theme reload`.** This is the promising route, and the
     least proven.
3. **Own map in NUI** (route c): unchanged from v2 §4. Most cost, blips re-sourced.

## Size and cost (estimates; the test measures them)

- **Tile resolution is unconfirmed.** Community packs ship 4K and 8K tiles (8192 × 8192 is the common
  "8K postal" export); the stock size needs `GetTextureResolution` in game (test step 1).
- Memory per tile, DXT5 with mips: 4096² ≈ 21 MB, 8192² ≈ 85 MB; DXT1 halves it. Six tiles: 128 MB (4K,
  DXT5) to 512 MB (8K). FiveM warns on streamed dictionaries far above 16 MB physical
  ([guide](https://forum.cfx.re/t/how-to-optimize-texture-size-fixing-oversized-assets-bring-any-texture-dictionary-under-16-mb-physical-memory/1764640)),
  and oversized assets are a known cause of streaming hitches: one more reason not to stream them.
- Route 2 via DUI: six browser surfaces. Each DUI keeps rendering while it exists, so the cost is
  six offscreen pages at `px²` (2048² × 4 B ≈ 16 MB each as RGBA, plus Chromium's own memory). A static
  page should idle near 0 ms, but that's exactly what has to be measured. If it isn't free, the fallback is
  to render once and copy into a plain runtime texture, if a copy path exists (unknown).
- Load cost: `RequestStreamedTextureDict` for the stock tiles is what the radar already does; the test
  prints the time per tile.

## Tint from tokens: practical?

- **Build time (route 1): no** for nuikit itself (licence + no `.ytd` writer). A server can still do it by
  hand: export tiles in CodeWalker, run a ramp, re-pack. Not a nuikit feature.
- **Runtime (route 2, DUI): yes on paper.** The ramp is three lines of SVG filter (desaturate, then map
  dark → `--background`/`--muted`, light → `--foreground`), fed by the compiled theme. Depends on the test.

## The exact in-game test

Resource: `bench/minimap/spike/` (bench only; not in `nuikit.zip`; streams nothing). Copy it to
`resources/`, `ensure nuikit_minimap_spike`, sit in a vehicle with the radar on, F8:

1. `mmspike info` prints each tile: loaded, load time, and its resolution.
   - **Record:** the six resolutions and times. `0x0` means the texture inside isn't named like its
     dictionary: open `minimap_sea_0_0.ytd` in CodeWalker and note the name, then adjust `client.lua`.
2. `mmspike solid 30 34 42` turns every tile one dark colour.
   - **Pass:** the radar and the pause map turn that colour, with GPS route and blips still on top.
   - **Fail:** nothing changes, so runtime replacement doesn't reach the tiles. Route 2 is dead and only
     streaming is left; stop here.
3. `mmspike reset`, then `mmspike tint #0f172a` repaints through six 2048² DUI pages.
   - **Pass:** the radar shows the real map, recoloured (dark slate land, light roads).
   - A placeholder or blank tile means `nui-img` can't read `minimap_sea_*`.
4. While tinted, drive for a minute. **Record:**
   - `resmon` for this resource;
   - frame time with the tint on versus after `mmspike reset`;
   - any hitch when the tint is applied;
   - VRAM in the game's graphics settings before and after.
   Then repeat with `mmspike tint #0f172a 4096`.
5. Optional: open the pause map with the tint on. It's the same tiles, so it should be tinted too.

**What changes the plan:**
- If step 2 or step 3 fails, the minimap stays route (a) (shape + frame, GTA's colours), and route (b)
  becomes a documented "make your own postal-style pack" guide, not a nuikit feature.
- If step 4 costs more than about 0.05 ms or adds visible hitches, ship the DUI tint as opt-in
  (`Config.minimap.paint = 'theme'`), off by default.
- If it's free, the theme pipeline gets a `minimap` ramp (three tokens) and the HUD applies it at start
  and on `nuikit theme reload`.
