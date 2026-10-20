# nuikit-ox-lib-ui

## 0.1.4

### Patch Changes

- c81a98a: ox_lib override:

  - The list menu now scrolls by whole rows, so no half row shows under the header at the end of a long list.
  - Progress tracks stay visible on a highlighted row in themes where `muted` matches `accent`.
  - A 0 ms progress run now completes on the normal schedule (~100 ms) instead of being held to a 50 ms minimum.

- 6601116: ox_lib override: the context menu and list menu now use the kit's `panel` and `menu-row`, and the progress bar uses `meter`. These are the components behind the `menu` and `progress` intents. All messages and POSTs are unchanged: payloads, order and timing were checked before and after. Two fixes to progress completion, for both the bar and the circle:

  - With the player's reduce-motion preference on, `progressComplete` now posts after the run's `duration`. Before, it posted at once and the action failed.
  - A 0 ms progress now completes. Before, it never posted, so the run only ended on a cancel.
  - nuikit-core@0.6.0

## 0.1.3

### Patch Changes

- Updated dependencies [5d9eb9d]
- Updated dependencies [afa2e0a]
- Updated dependencies [f7b4d63]
  - nuikit-core@0.5.0

## 0.1.2

### Patch Changes

- Updated dependencies [8ff1605]
- Updated dependencies [677860a]
  - nuikit-core@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies [2ddceb9]
- Updated dependencies [79748d6]
- Updated dependencies [f8a3fe1]
  - nuikit-core@0.3.0
