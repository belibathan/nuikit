---
"nuikit-ox-lib-ui": patch
---

ox_lib override: the progress bar (`lib.progressBar`) fills with the kit `meter`'s own timed mode instead of a local CSS animation. The list menu's progress rows are a `meter` coloured with `meterColor()`, so ox colour names (`green`, `red.6`, `yellow`) follow the theme's status colours. The progress bar's timing is unchanged: `progressComplete` is posted at the same moments, cancels and reduced motion included.
