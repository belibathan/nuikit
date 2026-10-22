---
"create-nuikit": patch
---

Performance: `vital-chip` shares one theme-style reader across chips (one observer, one style read per change), re-measures at most once a frame and re-renders only on a real size change, reads the alert threshold from the cached token, and animates labels, flags and pops on opacity and transform only (no width, padding or margin per frame); the outline level snaps instead of repainting the SVG each frame. `useCollapse` re-renders only when the open set changes. `text-roll` / `NumberRoll` no longer measure or animate width per digit.
