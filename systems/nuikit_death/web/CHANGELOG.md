# nuikit-death-web

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
