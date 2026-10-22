---
"nuikit-core": minor
---

Screen zones reach override pages: `loadServerTheme` takes `zones` from the `https://nuikit/theme` answers (the nuikit resource serves them from `LocalPlayer.state.nuikitZones`), so `useClearOf` works on ox_lib, qbx_taxijob and other override pages. A zone change alone doesn't repaint the theme (`themeHash`). New: `setZones`.
