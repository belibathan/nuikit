---
"nuikit-death-web": patch
---

nuikit_death with Qbox (`qbx_medical` + `qbx_ambulancejob`):

- **The "Hold E to respawn" bar fills smoothly.** It used to move in one-second steps because it followed `qbx_medical`'s own hold counter. It now shows how long you've held E in milliseconds, streamed to the page and timed to end on the tick where `qbx_medical` respawns you. Like `qbx_medical`, it only resets when a tick finds E released, so letting go and pressing again between ticks keeps it in step. When the respawn happens is unchanged.
- **The dead screen hides during the hospital-bed treatment.** After a respawn you're still dead in `qbx_medical` until the treatment ends (about 20 s), so the screen used to stay up over the bed. It now hides while you're in the bed, detected from `qbx_ambulancejob`'s bed events or its bed animation. If the treatment is interrupted while you're still dead, the screen comes back.
