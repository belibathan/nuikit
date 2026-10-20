---
"nuikit-ox-lib-ui": patch
---

ox_lib override, text UI (`lib.showTextUI`): now drawn with the kit's `key-prompt`, so it matches every other key prompt and follows the theme. Key combinations written as `[Shift] + [E] Lock vehicle` now show both keys. Before, the second key ended up as a stray bullet with `[E]` left in the text. Text without a leading key, Markdown, icons, `iconColor`, `alignIcon`, `style` and the four positions work as before.
