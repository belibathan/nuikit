// qbx_taxijob's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a message qbx_taxijob's Lua really sends (docs/qbx-taxijob-protocol.md).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const meter = { defaultPrice: 125.0, startingPrice: 0, useGpsPrice: true };

const mocks = defineMocks({
  events: {
    openMeter: [
      { toggle: true, meterData: meter },
      { toggle: true, meterData: { defaultPrice: 42.5, startingPrice: 15, useGpsPrice: false } },
      { toggle: false },
    ],
    toggleMeter: {},
    updateMeter: [
      { meterData: { fareAmount: 6, currentFare: 37, distanceTraveled: 0.29 } },
      { meterData: { fareAmount: 6, currentFare: 301, distanceTraveled: 2.41 } },
      { meterData: { fareAmount: 6, currentFare: 1874, distanceTraveled: 14.99 } },
    ],
    resetMeter: {},
  },
});

let started = false;

export default function Dev() {
  useEffect(() => {
    // An NPC pickup: open, start, one update. Once: StrictMode runs effects twice, and a second
    // toggleMeter would stop the meter again.
    if (started) return;
    started = true;
    emit("openMeter", { toggle: true, meterData: meter });
    emit("toggleMeter", {});
    emit("updateMeter", { meterData: { fareAmount: 6, currentFare: 301, distanceTraveled: 2.41 } });
  }, []);
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
