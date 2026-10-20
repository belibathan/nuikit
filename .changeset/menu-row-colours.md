---
---

Registry: `menu-row` gets `progressColor` (a tone, a library colour name such as ox's `green` / `red.6`, or a CSS colour, read through Meter's `meterColor()` and carried in `--menu-row-progress`), and `MenuRowDetails` draws each metadata bar in its item's own `color`. `menuMetadata()` keeps each ox_lib metadata item's `colorScheme`, and `menuRowColor()` is exported. `menu-row` now depends on `meter`. No package changes.
