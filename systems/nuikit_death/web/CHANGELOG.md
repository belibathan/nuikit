# nuikit-death-web

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

- Updated dependencies [30d20ea]
- Updated dependencies [71e9442]
- Updated dependencies [bc127c3]
- Updated dependencies [20f7092]
- Updated dependencies [22148ce]
- Updated dependencies [f510c7d]
  - nuikit-core@0.8.0

## 0.3.4

### Patch Changes

- c5d7544: nuikit_death: the big timer is the kit's `countdown` (hero size) instead of its own clock, label and bar. It reads the same: mm:ss, the label under it, and a line that drains. In the last 30 s of last stand it turns red and pulses, and it dims at 00:00. The bleed-out line stays red for the whole of last stand, as before (`countdown`'s `lineTone="destructive"`).
- 0d6eadc: nuikit_death with Qbox (`qbx_medical` + `qbx_ambulancejob`):

  - **The "Hold E to respawn" bar fills smoothly.** It used to move in one-second steps because it followed `qbx_medical`'s own hold counter. It now shows how long you've held E in milliseconds, streamed to the page and timed to end on the tick where `qbx_medical` respawns you. Like `qbx_medical`, it only resets when a tick finds E released, so letting go and pressing again between ticks keeps it in step. When the respawn happens is unchanged.
  - **The dead screen hides during the hospital-bed treatment.** After a respawn you're still dead in `qbx_medical` until the treatment ends (about 20 s), so the screen used to stay up over the bed. It now hides while you're in the bed, detected from `qbx_ambulancejob`'s bed events or its bed animation. If the treatment is interrupted while you're still dead, the screen comes back.

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
