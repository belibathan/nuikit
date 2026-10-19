// The contract between client/main.lua (+ bridge.lua, minimap.lua) and this UI.
import "nuikit-core";

export interface HudVehicle {
  speed: number;
  units: "mph" | "kmh";
  /** 0–1 */
  rpm: number;
  gear: number | "R" | "N";
  /** 0–100 */
  fuel: number;
  /** 0–100 */
  engine: number;
  seatbelt: boolean;
}

/** Where minimap.lua put GTA's radar: the frame's rectangle as 0–1 screen fractions. */
export interface MinimapFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** frame thickness, as a fraction of the screen height */
  band: number;
  shape: "square" | "circle";
}

/** What the frame shows right now. */
export interface MinimapState {
  /** the radar is on screen (driving, not in the big map, not hidden by another screen) */
  visible: boolean;
  /** camera heading in degrees: north sits this far clockwise from the top of the radar */
  heading: number;
  street: string;
  crossing?: string;
  zone: string;
}

declare module "nuikit-core" {
  interface NuiEvents {
    /** false when the player leaves the vehicle */
    "hud:vehicle": HudVehicle | false;
    "hud:minimap:frame": MinimapFrame;
    "hud:minimap": MinimapState;
  }
  interface NuiCallbacks {
    "hud:minimap:ready": { req: Record<string, never>; res: { ok: boolean } };
  }
  interface NuiSurfaces {
    hud: { units: "mph" | "kmh"; needs: boolean };
  }
}
