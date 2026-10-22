---
"create-nuikit": patch
---

`confirm` (and `ConfirmPanel`), `edge-sheet` and `band` take the kit variants (`density`, `shape`, `motion`); `hud-chip` takes `density` and `motion` (its `shape` stays pill or tile; its corners follow `data-nk-shape` on any ancestor).
