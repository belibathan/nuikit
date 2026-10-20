// The contract between client/main.lua (+ bridge.lua, minimap.lua) and this UI.
import "nuikit-core";

/** Sent when it changes (gear, fuel, damage, seatbelt), not as the car speeds up. */
export interface HudVehicle {
  /** where the gauge starts when it appears; then it follows `hud:vehicle:speed` */
  speed: number;
  units: "mph" | "kmh";
  /** 0–1, where the gauge starts; then it follows `hud:vehicle:rpm` */
  rpm: number;
  gear: number | "R" | "N";
  /** 0–100 */
  fuel: number;
  /** 0–100 */
  engine: number;
  seatbelt: boolean;
  /** faster than 10 (units): the seatbelt warning shows */
  moving?: boolean;
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
  /**
   * camera heading in degrees when this was sent: north sits this far clockwise from the top of the
   * radar. The compass starts here and then follows `hud:minimap:heading`.
   */
  heading: number;
  street: string;
  crossing?: string;
  zone: string;
}

declare module "nuikit-core" {
  interface NuiEvents {
    /** false when the player leaves the vehicle */
    "hud:vehicle": HudVehicle | false;
    /** live (NUI.stream): speed in the vehicle's units, whole numbers, ≤30 a second while it changes */
    "hud:vehicle:speed": number;
    /** live (NUI.stream): rpm 0–1 to 0.01, ≤30 a second while it changes */
    "hud:vehicle:rpm": number;
    "hud:minimap:frame": MinimapFrame;
    "hud:minimap": MinimapState;
    /** live (NUI.stream): the camera heading (0.1°), ≤30 a second while it turns */
    "hud:minimap:heading": number;
  }
  interface NuiCallbacks {
    "hud:minimap:ready": { req: Record<string, never>; res: { ok: boolean } };
  }
  interface NuiSurfaces {
    hud: { units: "mph" | "kmh"; needs: boolean };
  }
}
