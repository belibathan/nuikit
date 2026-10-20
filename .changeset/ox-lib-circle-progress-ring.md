---
"nuikit-ox-lib-ui": patch
---

ox_lib override, progress circle (`lib.progressCircle`): now drawn with the kit's `progress-ring` on the game world, so it matches the kit and follows the theme. The run's timing is unchanged. `progressComplete` is posted at the same moments as before, after every hide, cancels included, and with reduced motion. The counter rises by 1 every `duration / 100` ms and reads 99 on a cancel, as in ox_lib.
