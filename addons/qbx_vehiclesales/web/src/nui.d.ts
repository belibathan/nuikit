// qbx_vehiclesales' messages (docs/qbx-vehiclesales-protocol.md), typed for the devtools presets.
import "nuikit-core";

export interface SellerData {
  firstname: string;
  lastname: string;
  account: string;
  phone: string;
}

declare module "nuikit-core" {
  interface NuiEvents {
    sellVehicle: { showTakeBackOption: false; bizName: string; sellerData: SellerData; plate: string };
    buyVehicle: {
      showTakeBackOption: boolean;
      bizName: string;
      sellerData: SellerData;
      vehicleData: { desc: string; price: number | string };
      plate: string;
    };
  }
}
