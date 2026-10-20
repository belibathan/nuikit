// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and the
// devtools all type-check against these interfaces. The job menu's own messages (the `job` surface
// and job:duty / job:action / job:hire / job:fire / job:grade) are declared next to it, in
// components/blocks/job-menu/nui.ts. Add yours here.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (nk.send) */
  interface NuiEvents {}

  /** UI → Lua  (fetchNui ↔ nk.on) */
  interface NuiCallbacks {}

  /** Surfaces declared with nk.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {}
}
