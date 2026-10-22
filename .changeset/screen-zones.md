---
"nuikit-core": minor
---

Screen zones: `NUI.zone(name, rects)` in Lua publishes what a UI covers on screen, and every nuikit page gets the merged set as `nuikit:zones`. `nuikit-core/react` adds `useZones()`, `clearOf(zones, position)` and `useClearOf(position)`, so a corner-anchored stack (notices, prompts) starts clear of the HUD's map or the vehicle cluster.
