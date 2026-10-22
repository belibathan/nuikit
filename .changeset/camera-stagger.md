---
"nuikit-core": patch
---

`nk.camera`: a targeted claim defaults its offset by what it targets (vehicles further out, `{ y = 5.5, z = 1.4 }`; peds as before), set in `nk.camera.defaults`. `StaggerGroup` reads `--nk-stagger` once per theme instead of on every flush.
