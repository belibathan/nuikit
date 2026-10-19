// qbx_vehiclesales' traffic, faked for browser development. Press ` for the devtools.
// Each preset is a message qbx_vehiclesales' Lua really sends (docs/qbx-vehiclesales-protocol.md).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const bizName = "Vehicle Sales Contract - Larry's Vehicle Sales";
const me = { firstname: "Niko", lastname: "Bellic", account: "US05QBX4416823", phone: "5551234" };
const sell = { showTakeBackOption: false as const, bizName, sellerData: me, plate: "46EEK572" };

const mocks = defineMocks({
  events: {
    sellVehicle: sell,
    buyVehicle: [
      {
        showTakeBackOption: false,
        bizName,
        sellerData: { firstname: "Roman", lastname: "Bellic", account: "US07QBX9921034", phone: "5559876" },
        vehicleData: { desc: "Clean Sultan RS, full engine upgrades, new tyres.\nNo accidents.", price: 48500 },
        plate: "08KXR114",
      },
      {
        showTakeBackOption: true,
        bizName,
        sellerData: me,
        vehicleData: { desc: "Daily driver, minor scratches.", price: "12500" },
        plate: "46EEK572",
      },
      {
        // seller not found: the locale placeholders
        showTakeBackOption: false,
        bizName,
        sellerData: { firstname: "not", lastname: "known", account: "Account not known..", phone: "telephone number not known.." },
        vehicleData: { desc: "", price: 3200 },
        plate: "BX19PLT ",
      },
    ],
  },
});

export default function Dev() {
  useEffect(() => {
    emit("sellVehicle", sell);
  }, []);
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
