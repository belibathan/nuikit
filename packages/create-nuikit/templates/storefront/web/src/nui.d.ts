// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and the
// devtools all type-check against these interfaces. The storefront's own messages (the `storefront`
// surface, storefront:buy and storefront:manage) are declared next to it, in
// components/blocks/storefront/nui.ts. Add yours here.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (nk.send) */
  interface NuiEvents {}

  /** UI → Lua  (fetchNui ↔ nk.on) */
  interface NuiCallbacks {}

  /** Surfaces declared with nk.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {}
}
