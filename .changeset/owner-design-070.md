---
"nuikit-core": minor
---

`<Surface>` keeps a closing surface drawn for its exit (up to 250 ms, none under reduced motion) so a Sheet or Dialog inside can slide out; `useSurfaceOpen()` returns false while the surrounding surface is closing, to pass as the Sheet's `open`.
