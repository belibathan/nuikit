// ox_target's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload ox_target's Lua really sends (docs/ox-target-protocol.md). The devtools
// emit nuikit's { action, data } envelope; dev builds unwrap it into ox_target's { event, ... }.
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const garage = {
  options: { __global: [] },
  zones: [
    [
      { label: "Open garage", icon: "fa-solid fa-warehouse", name: "qbx_garages:open", distance: 3 },
      { label: "Store vehicle", icon: "fa-solid fa-square-parking", name: "qbx_garages:store", distance: 3 },
    ],
  ],
};

const pickUp = {
  options: {
    __global: [],
    globalTarget: [{ label: "Inspect", icon: "fa-solid fa-magnifying-glass", hide: true }],
    model: [
      { label: "Pick up", icon: "fa-solid fa-hand", name: "props:pickup" },
      { label: "Push", icon: "fas fa-hand-back-fist", hide: true },
      { label: "Sit", icon: "fa-solid fa-chair", name: "props:sit" },
    ],
  },
  zones: [],
};

const vehicle = {
  options: {
    __global: [],
    entity: [{ label: "Impound vehicle", icon: "fa-solid fa-truck-pickup", iconColor: "#f59e0b", groups: { police: 0 } }],
    globalTarget: [
      { label: "Toggle front driver door", icon: "fa-solid fa-car-side", bones: ["door_dside_f", "seat_dside_f"] },
      { label: "Toggle front passenger door", icon: "fa-solid fa-car-side", hide: true },
      { label: "Toggle trunk", icon: "fa-solid fa-car-rear", bones: "boot", hide: true },
      { label: "Vehicle keys", icon: "fa-solid fa-key", openMenu: "vehicle_keys" },
      { label: "Give keys", icon: "fa-solid fa-hand-holding", menuName: "vehicle_keys", hide: true },
      { label: "Refuel", icon: "fa-solid fa-gas-pump", name: "fuel:refuel" },
    ],
  },
  zones: [[{ label: "Wash vehicle", icon: "fa-solid fa-soap", name: "carwash:start" }]],
};

const vehicleKeys = {
  options: {
    __global: [{ name: "builtin:goback", icon: "fa-solid fa-circle-chevron-left", label: "Go back", menuName: "vehicle_keys", openMenu: "home" }],
    entity: [{ label: "Impound vehicle", icon: "fa-solid fa-truck-pickup", hide: true }],
    globalTarget: [
      { label: "Toggle front driver door", icon: "fa-solid fa-car-side", hide: true },
      { label: "Toggle front passenger door", icon: "fa-solid fa-car-side", hide: true },
      { label: "Toggle trunk", icon: "fa-solid fa-car-rear", hide: true },
      { label: "Vehicle keys", icon: "fa-solid fa-key", openMenu: "vehicle_keys", hide: true },
      { label: "Give keys", icon: "fa-solid fa-hand-holding", menuName: "vehicle_keys" },
      { label: "Lock vehicle", icon: "fa-solid fa-lock", menuName: "vehicle_keys" },
      { label: "Hotwire", icon: "fa-solid fa-bolt", menuName: "vehicle_keys", iconColor: "#ef4444" },
    ],
  },
  zones: [],
};

const player = {
  options: {
    __global: [{ label: "(Debug) Global", icon: "fa-solid fa-bug", hide: true }],
    globalTarget: [
      { label: "Give cash", icon: "fa-solid fa-money-bill-wave", iconColor: "#22c55e" },
      { label: "Search", icon: "fa-solid fa-magnifying-glass" },
      { label: "Escort", icon: "fa-solid fa-user-group" },
      { label: "Put in vehicle", icon: "fa-solid fa-car-on" },
      { label: "Check ID", icon: "fa-regular fa-id-card" },
    ],
  },
  zones: [],
};

// A crowded vehicle: 12 options, some hidden, some with long or third-party labels and a large price.
const crowded = {
  options: {
    __global: [],
    entity: [
      { label: "🚓 | Impound vehicle (police only)", icon: "fa-solid fa-truck-pickup", iconColor: "#f59e0b", groups: { police: 0 } },
      { label: "Sell vehicle to the dealer for $1,234,567", icon: "fa-solid fa-sack-dollar", iconColor: "#22c55e" },
    ],
    globalTarget: [
      { label: "Toggle front driver door", icon: "fa-solid fa-car-side", bones: ["door_dside_f", "seat_dside_f"] },
      { label: "Toggle front passenger door", icon: "fa-solid fa-car-side" },
      { label: "Toggle rear left door", icon: "fa-solid fa-car-side", hide: true },
      { label: "Toggle trunk", icon: "fa-solid fa-car-rear", bones: "boot" },
      { label: "Toggle hood", icon: "fa-solid fa-car-battery", bones: "bonnet", hide: true },
      { label: "Vehicle keys", icon: "fa-solid fa-key", openMenu: "vehicle_keys" },
      { label: "Give keys to the passenger in the seat next to you", icon: "fa-solid fa-hand-holding", menuName: "vehicle_keys" },
      { label: "Refuel (Premium, $1,234,567 for a full tank)", icon: "fa-solid fa-gas-pump", name: "fuel:refuel", iconColor: "#ef4444" },
      { label: "Repair engine", icon: "fa-solid fa-wrench", name: "mechanic:repair", hide: true },
      { label: "Wash vehicle", icon: "fa-solid fa-soap", name: "carwash:start" },
      { label: "Check registration", icon: "fa-regular fa-id-card", name: "vehicle:registration" },
      { label: "Park here", icon: "fa-solid fa-square-parking", name: "vehicle:park" },
    ],
  },
  zones: [],
};

// Lua's encoder: empty tables as {}, a holey array as an object with numeric keys, unknown icon.
const encoderEdges = {
  options: { __global: {}, model: { "1": { label: "ATM", icon: "fa-solid fa-credit-card" }, "3": { label: "Rob ATM", icon: "fa-solid fa-mask" } }, localEntity: [{ label: "No icon option" }, { label: "Unknown icon", icon: "fa-solid fa-not-a-real-icon" }] },
  zones: {},
};

const mocks = defineMocks({
  events: {
    visible: [{ state: true }, { state: false }],
    leftTarget: [{}],
    setTarget: [garage, pickUp, vehicle, vehicleKeys, player, crowded, encoderEdges],
  } as never,
});

export default function Dev() {
  useEffect(() => {
    // Targeting key held: the page shows the idle eye.
    emit("visible" as never, { state: true } as never);
  }, []);
  return <NuiDevtools events={mocks.events as never} scene="day" />;
}
