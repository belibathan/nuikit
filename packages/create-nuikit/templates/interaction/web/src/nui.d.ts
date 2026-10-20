// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and the
// devtools all type-check against these interfaces. The interaction's own messages (the `target` and `prompts` surfaces
// and interaction:select) are declared next to them, in
// components/blocks/interaction/nui.ts. Add yours here.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (nk.send) */
  interface NuiEvents {}

  /** UI → Lua  (fetchNui ↔ nk.on) */
  interface NuiCallbacks {}

  /** Surfaces declared with nk.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {}
}
