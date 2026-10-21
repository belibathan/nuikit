# nuikit-loading-web

## 0.3.4

### Patch Changes

- 9354c6e: nuikit_loading: **On Qbox the loading screen now stays up until the character menu appears.** Before, it closed as soon as the game had loaded, so players saw the world while `qbx_core` set up its character selection. `Config.externalShutdown` now defaults to `'auto'`: when `qbx_core` runs with its own character menu, the screen shows "Ready" until `qbx_core` closes it. That menu is on unless `characters.useExternalCharacters = true` is set in `qbx_core/config/client.lua`. Everywhere else it still closes right away. `true` and `false` still force either behaviour.

  If `qbx_core` hasn't closed it after `Config.externalShutdownTimeout` seconds on "Ready" (default 60), nuikit closes it and prints a yellow line in the F8 console, so a failed character menu never leaves players stuck. An explicit `true` has no time limit.

- Updated dependencies [a73299a]
- Updated dependencies [90c84b7]
- Updated dependencies [682de8e]
- Updated dependencies [677ab7e]
- Updated dependencies [fcaec05]
  - nuikit-core@0.7.0

## 0.3.3

### Patch Changes

- 409c8c2: Death and loading screens: their bars are now the kit's `meter`, and the loading screen's percentage and links are `stat`. They look the same as before and handle the same messages.
  - nuikit-core@0.6.0

## 0.3.2

### Patch Changes

- Updated dependencies [5d9eb9d]
- Updated dependencies [afa2e0a]
- Updated dependencies [f7b4d63]
  - nuikit-core@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [8ff1605]
- Updated dependencies [677860a]
  - nuikit-core@0.4.0
