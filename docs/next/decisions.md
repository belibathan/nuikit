# Owner decisions

Every open call that waits on the owner, with two options and a recommendation. Decided rows stay for the record.
When one is decided, mark it, say where it landed, and remove it from `handoff.md`'s list.

| # | Decision | Option A | Option B | Recommendation | Status |
|---|---|---|---|---|---|
| 1 | `info` tone (sheets: `bench/visual/info-tone/`) | Follows `primary` (grey in the stock theme) | A fixed blue | A: one less colour to theme; identities that want blue set `--info` | Open |
| 2 | Cancelling a progress from the keyboard | `nuikit_cancel` bound to **X** by default (`RegisterKeyMapping`, players can rebind) | No default key; a convar names it | A: matches ox_lib's habit; players can still rebind in settings | Open |
| 3 | Weapon readout on the HUD | nuikit draws weapon glyphs | The inventory's item image through the resolver | B | **Decided: B** (item images via the resolver) |
| 4 | HUD vitals shape | Rounded squares that follow the chip radius | Round dots | One vital-chip family that follows the identity | **Decided:** one vital-chip family |
| 5 | ID card photo (`qbx_idcard`) | Small round avatar beside the fields | Full-height portrait, like a real licence | B: reads as a card at a glance; `nomugshot` keeps the silhouette | Open |
| 6 | Reference exports (`bench/figma/reference/`) | JPEG q88 (~13 MB) | PNG (lossless, several times larger) | A: the Figma frames are the lossless source | Open |
| 7 | qb-radialmenu adapter: vehicle doors, extras, seats | The adapter keeps them (its own clean implementation) | Dropped, with a doctor note | A: servers expect them from the menu; dropping them reads as a regression | Open |
| 8 | Default targeted camera offset (`nk.camera`) | `{ y = 2.2, z = 0.6 }` for every target | Per kind: peds as now, vehicles further out (≈ `{ y = 5.5, z = 1.4 }`) | B, after the in-game look in `services.md` | Open |
| 9 | Resume between claims of two resources | A cut (as now) | A blend (`duration` on resume) | A until the blend is spiked in game; a cut is honest and never shows a broken path | Open |
| 10 | Death band (`nuikit_death` `Config.band`) | On by default | Off by default, opt-in | A: it is the reference look and keeps clear of qbx's own text; one line turns it off | Open |
