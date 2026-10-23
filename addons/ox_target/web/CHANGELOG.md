# nuikit-ox-target-ui

## 0.1.6

### Patch Changes

- Updated dependencies [94ce073]
- Updated dependencies [6ea19bb]
- Updated dependencies [5f4b6dd]
- Updated dependencies [1a68fb0]
- Updated dependencies [1a68fb0]
- Updated dependencies [f1fc0b3]
- Updated dependencies [bee6e1a]
- Updated dependencies [d6eec14]
- Updated dependencies [031bf9f]
- Updated dependencies [7a04527]
- Updated dependencies [eb68708]
- Updated dependencies [4f35582]
- Updated dependencies [378c07d]
- Updated dependencies [014dc32]
- Updated dependencies [eece522]
  - nuikit-core@0.9.0

## 0.1.5

### Patch Changes

- Updated dependencies [30d20ea]
- Updated dependencies [71e9442]
- Updated dependencies [bc127c3]
- Updated dependencies [20f7092]
- Updated dependencies [22148ce]
- Updated dependencies [f510c7d]
  - nuikit-core@0.8.0

## 0.1.4

### Patch Changes

- 0866f77: ox_lib and ox_target overrides now use more of the kit's `menu-row`, with fewer local workarounds:

  - ox_lib context menu: an option's `progress` bar, its read-only state and the hover card with `image` and `metadata` now come from `menu-row` (`progress`, `progressColor`, `readOnly`, `MenuRowDetails`). ox's `colorScheme` colours the bars through the theme (`green` is the theme's success, `red.6` its destructive), and each metadata bar keeps its own `colorScheme`. The image in the hover card fills its width.
  - ox_target: the four CSS rules that hid a stuck hover after a click are gone; the rows use `menu-row`'s `inert` instead.

  What scripts send and receive is unchanged.

- Updated dependencies [a73299a]
- Updated dependencies [90c84b7]
- Updated dependencies [682de8e]
- Updated dependencies [677ab7e]
- Updated dependencies [fcaec05]
  - nuikit-core@0.7.0

## 0.1.3

### Patch Changes

- 6ac6553: ox_target override: the options list is now drawn with the kit's `panel` and `menu-row`, which also back the `target` intent. The `select` payloads are unchanged, and no hover style survives a click.
  - nuikit-core@0.6.0

## 0.1.2

### Patch Changes

- Updated dependencies [5d9eb9d]
- Updated dependencies [afa2e0a]
- Updated dependencies [f7b4d63]
  - nuikit-core@0.5.0

## 0.1.1

### Patch Changes

- Updated dependencies [8ff1605]
- Updated dependencies [677860a]
  - nuikit-core@0.4.0
