---
"create-nuikit": patch
---

Performance: `vital-chip`'s bar and liquid levels snap to the value; a transform transition on an SVG element runs on the main thread (style, layout and paint every frame) and a ticking HUD kept it running.
