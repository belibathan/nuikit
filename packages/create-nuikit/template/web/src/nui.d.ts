// One place for every message between Lua and the UI. fetchNui, useNuiEvent and the
// devtools all type-check against this. Keep it next to your Lua as the contract.
import "@nuikit/core";

declare module "@nuikit/core" {
  /** Lua → UI  (NUI.send) */
  interface NuiEvents {
    "hud:vitals": { health: number; armor: number };
  }

  /** UI → Lua  (fetchNui ↔ NUI.on) */
  interface NuiCallbacks {
    "menu:select": { req: { id: string }; res: { ok: boolean } };
  }
}
