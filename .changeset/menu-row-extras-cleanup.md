---
"nuikit-ox-lib-ui": patch
"nuikit-ox-target-ui": patch
---

ox_lib and ox_target overrides now use more of the kit's `menu-row`, with fewer local workarounds:

- ox_lib context menu: an option's `progress` bar, its read-only state and the hover card with `image` and `metadata` now come from `menu-row` (`progress`, `progressColor`, `readOnly`, `MenuRowDetails`). ox's `colorScheme` colours the bars through the theme (`green` is the theme's success, `red.6` its destructive), and each metadata bar keeps its own `colorScheme`. The image in the hover card fills its width.
- ox_target: the four CSS rules that hid a stuck hover after a click are gone; the rows use `menu-row`'s `inert` instead.

What scripts send and receive is unchanged.
