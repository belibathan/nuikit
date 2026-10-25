# nuikit-loading-web

## 0.3.6

### Patch Changes

- Updated dependencies
- Updated dependencies [94ce073]
- Updated dependencies [6ea19bb]
- Updated dependencies [5f4b6dd]
- Updated dependencies [1a68fb0]
- Updated dependencies [1a68fb0]
- Updated dependencies [ed88d66]
- Updated dependencies [401badf]
- Updated dependencies [f1fc0b3]
- Updated dependencies [e7c2aea]
- Updated dependencies [92684fc]
- Updated dependencies [bee6e1a]
- Updated dependencies [b759139]
- Updated dependencies [d67f306]
- Updated dependencies [d6eec14]
- Updated dependencies [031bf9f]
- Updated dependencies [7a04527]
- Updated dependencies [2ea77e5]
- Updated dependencies [7e782f3]
- Updated dependencies [eb68708]
- Updated dependencies [4f35582]
- Updated dependencies [378c07d]
- Updated dependencies [014dc32]
- Updated dependencies [eece522]
  - nuikit-core@0.9.0

## 0.3.5

### Patch Changes

- 7b82767: nuikit_loading on the v2 type tokens: the server name is `nk-display` (the identity's display face), the tagline, welcome line and phase use `nk-label` / `nk-title`, the tip fade and dots use the motion tokens, and the screen's own classes are `ld-*` (no local `nk-*` names). Same layout, same handover.
- Updated dependencies [30d20ea]
- Updated dependencies [71e9442]
- Updated dependencies [bc127c3]
- Updated dependencies [20f7092]
- Updated dependencies [22148ce]
- Updated dependencies [f510c7d]
  - nuikit-core@0.8.0

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
