---
"nuikit-ox-lib-ui": patch
---

ox_lib override: `lib.notify` now uses the kit's `notice` and its stack, which render the `notify` intent. ox_lib's own notification rules still apply:

- the default duration is 3 seconds;
- a notification with an existing `id` updates in place;
- at most 20 are on screen;
- an `iconColor` or Font Awesome icon from the calling script is used as given;
- nothing is posted back to Lua.
