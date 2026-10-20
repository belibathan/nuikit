// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and the
// devtools all type-check against these interfaces. The HUD's own messages (the `hud` surface,
// `hud:vehicle` and its live speed and rpm) are declared next to it, in
// components/blocks/hud-minimal/nui.ts; the player (`nuikit:player`) is built into nuikit-core.
// Add yours here.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (nk.send) */
  interface NuiEvents {}

  /** UI → Lua  (fetchNui ↔ nk.on) */
  interface NuiCallbacks {}

  /** Surfaces declared with nk.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {}
}
