// qbx_taxijob's messages (docs/qbx-taxijob-protocol.md), typed for the devtools presets.
import "nuikit-core";

export interface MeterConfig {
  /** price per mile */
  defaultPrice: number;
  startingPrice: number;
  useGpsPrice: boolean;
}

declare module "nuikit-core" {
  interface NuiEvents {
    openMeter: { toggle: true; meterData: MeterConfig } | { toggle: false };
    toggleMeter: Record<string, never>;
    updateMeter: { meterData: { fareAmount: number; currentFare: number; distanceTraveled: number } };
    resetMeter: Record<string, never>;
  }
}
