---
"nuikit-qbx-taxijob-ui": patch
---

qbx_taxijob override: the fare meter is now built on the kit's `panel` (header, footer), and the fare uses a display `stat`. The "Running" dot is now the theme's success colour; before, it used primary, which is grey in the stock theme. The `enableMeter` and `hideMouse` callbacks are unchanged.
