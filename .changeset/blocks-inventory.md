---
"create-nuikit": minor
---

An inventory block: `npm create nuikit@latest my-inventory -- -t inventory` gives your pockets and a stash side by side with pointer-driven drag and drop (Shift drags half, Ctrl one), stacking and swapping, a tooltip, weight meters, use, and a hotbar (keys 1–5 and a strip on the game). It's a standalone inventory: the server keeps every container and checks every move (only your own pockets or a stash you stand at, real slots and counts, stacking only the same item, whole-stack swaps, weight on both sides) and refreshes everyone looking at a shared stash; it warns at start when ox_inventory or another inventory is running. Also in the registry (`…/r/inventory.json`) and on `/blocks`.
