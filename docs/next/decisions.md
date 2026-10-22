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

Implementation of rows 2, 5, 7, 8 and 10 goes to the lane that owns the files (`dispatch.md`).
