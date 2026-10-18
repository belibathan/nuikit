// The contract between client/main.lua (+ bridge.lua) and this UI.
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

declare module "nuikit-core" {
  interface NuiEvents {
    /** false when the player leaves the vehicle */
    "hud:vehicle": HudVehicle | false;
  }
  interface NuiSurfaces {
    hud: { units: "mph" | "kmh"; needs: boolean };
  }
}
