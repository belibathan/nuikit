---
"create-nuikit": minor
---

Foundation 2 states and level: interactive components (menu-row, key-prompt, item-slot, radial-menu items; notice for alert) draw `data-state` (rest, focus, hold, confirm, disabled, alert) and pop briefly on confirm; meter, progress-ring, vital-chip, key-prompt (hold) and notice (time left) set `--level` (0–1) on their root. vital-chip carries `data-hue`. menu-row gains `alert`. item-slot's own states move to `data-slot-state`. `nkState()`, `nkConfirm()` and `nkLevel()` are in `lib/utils`.
