# nuikit-mm-radio-ui

## 0.3.5

### Patch Changes

- 5014562: mm_radio override rebuilt on the kit's components: the handheld is a `panel` (clock, signal or jammed, battery and the street in its header; a notify message takes the header's second line), the joined frequency is a display `stat`, favourite and recent channels are `menu-row`s, members are rows with a mute button, settings are `form-field` rows (switches, sliders that post on release, the call sign), empty and no-charge screens are `empty-state`s, and who's talking in the overlay are `hud-chip`s (active while talking). The nav keeps icon-over-label buttons that no longer clip. Every POST (all 16 callbacks, the keypad limit, Escape → `hideUI`) is unchanged, checked with `bench/screens/mm_radio`. One new locale key: `ui.nuikit_no_charge_hint`.
- Updated dependencies [30d20ea]
- Updated dependencies [71e9442]
- Updated dependencies [bc127c3]
- Updated dependencies [20f7092]
- Updated dependencies [22148ce]
- Updated dependencies [f510c7d]
  - nuikit-core@0.8.0

## 0.3.4

### Patch Changes

- Updated dependencies [a73299a]
- Updated dependencies [90c84b7]
- Updated dependencies [682de8e]
- Updated dependencies [677ab7e]
- Updated dependencies [fcaec05]
  - nuikit-core@0.7.0

## 0.3.3

### Patch Changes

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
