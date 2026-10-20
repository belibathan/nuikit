---
"nuikit-ox-lib-ui": patch
"nuikit-ox-target-ui": patch
---

ox_lib and ox_target overrides now use more of the kit's `menu-row`, with fewer local workarounds:

- ox_lib context menu: an option's `progress` bar, its read-only state and the hover card with `image` and `metadata` now come from `menu-row` (`progress`, `readOnly`, `MenuRowDetails`). The image in the hover card fills its width.
- ox_lib list menu: the quiet values on rows that aren't highlighted use `menu-row`'s `valueTone="muted"`.
- ox_target: the four CSS rules that hid a stuck hover after a click are gone; the rows use `menu-row`'s `inert` instead.

What scripts send and receive is unchanged.
