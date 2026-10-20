---
"nuikit-ox-lib-ui": patch
---

ox_lib override: the context menu and list menu now use the kit's `panel` and `menu-row`, and the progress bar uses `meter`. These are the components behind the `menu` and `progress` intents. All messages and POSTs are unchanged: payloads, order and timing were checked before and after. Two fixes to progress completion, for both the bar and the circle:

- With the player's reduce-motion preference on, `progressComplete` now posts after the run's `duration`. Before, it posted at once and the action failed.
- A 0 ms progress now completes. Before, it never posted, so the run only ended on a cancel.
