---
"nuikit-core": minor
---

`nk.settings.register({ id, label, icon, rows })`: any resource adds its own Settings section with toggle, select, range or text rows, saved per player (`nuikit:settings:<resource>:<id>`), read with `nk.settings.get(id)` and followed with `nk.settings.onChange(fn)` or the `nuikit:settings:<resource>` message.
