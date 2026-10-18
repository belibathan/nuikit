// One place for every message between Lua and the UI. fetchNui, useNuiEvent, useSurface and
// the devtools all type-check against this. Keep it next to your Lua as the contract.
import "nuikit-core";

declare module "nuikit-core" {
  /** Lua → UI  (NUI.send) */
  interface NuiEvents {
    "hud:vitals": { health: number; armor: number };
  }

  /** UI → Lua  (fetchNui ↔ NUI.on) */
  interface NuiCallbacks {
    "menu:select": { req: { id: string }; res: { ok: boolean } };
    "confirm:answer": { req: { id: string; yes: boolean }; res: { ok: boolean } };
  }

  /** Surfaces declared with NUI.surface(name, opts) → the data surface:open(data) sends */
  interface NuiSurfaces {
    hud: void;
    menu: void;
    confirm: { id: string; title: string; price: number };
  }
}
