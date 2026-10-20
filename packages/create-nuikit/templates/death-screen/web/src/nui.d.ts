// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and the
// devtools all type-check against these interfaces. The death screen's own messages (the `death`
// surface and the `death:hold` live value) are declared next to it, in
// components/blocks/death-screen/nui.ts; add yours here.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (nk.send) */
  interface NuiEvents {}

  /** UI → Lua  (fetchNui ↔ nk.on) */
  interface NuiCallbacks {}

  /** Surfaces declared with nk.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {}
}
