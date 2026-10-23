// ox_doorlock's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a message ox_doorlock's Lua really sends (docs/ox-doorlock-protocol.md).
// States: the list (setVisible, no id), a new door (New door in the list), a door's settings with
// every field (setVisible 3), delete confirm (the bin on a row or in the settings).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { Door } from "./lib/door";

const v = (x: number, y: number, z: number) => ({ x, y, z });

const doors: Record<string, Door> = {
  "1": { id: 1, name: "MRPD front doors", zone: "Mission Row", state: 1, coords: v(434.7, -981.9, 30.8), maxDistance: 2, groups: { police: 0 }, doors: [{ coords: v(434.7, -980.6, 30.8), heading: 270, model: -1215222675, hash: 1 }, { coords: v(434.7, -983.2, 30.8), heading: 270, model: 320433149, hash: 2 }], distance: 14.2 },
  "2": { id: 2, name: "MRPD armoury", zone: "Mission Row", state: 1, coords: v(453.1, -982.6, 30.7), model: 749848321, heading: 90, hash: 3, maxDistance: 1.5, groups: { police: 2 }, items: [{ name: "mrpd_key", metadata: "armoury", remove: false }] },
  "3": {
    id: 3,
    name: "Vault gate",
    zone: "Pillbox Hill",
    state: 1,
    coords: v(255.2, 223.9, 106.4),
    model: 961976194,
    heading: 160,
    hash: 4,
    passcode: "4471",
    autolock: 300,
    maxDistance: 2.5,
    doorRate: 1.5,
    auto: true,
    lockpick: true,
    hideUi: true,
    holdOpen: true,
    lockSound: "metal-locker",
    unlockSound: "button-remote",
    characters: ["ABC12345", 42],
    groups: { police: 3, ambulance: 1 },
    items: [{ name: "vault_card", metadata: "pacific", remove: true }, { name: "thermite" }],
    lockpickDifficulty: ["easy", "medium", { areaSize: 40, speedMultiplier: 1.5 }],
    distance: 6.1,
  },
  "5": { id: 5, name: "Sandy Shores clinic", zone: "Sandy Shores", state: 0, coords: v(1839.4, 3672.9, 34.3), model: 1415151278, heading: 30, hash: 5, maxDistance: 2, groups: { ambulance: 0 } },
  "7": { id: 7, zone: "Vinewood Hills", state: 0, coords: v(-174.8, 497.1, 137.7), model: -1287581810, heading: 15, hash: 6, maxDistance: 2, characters: ["XYZ00001"] },
};

// A long list, as a server with many doors sends it: mixed locked/unlocked, some with groups,
// items or a long third-party name, and one with no zone.
const LONG_NAMES = [
  "Mission Row Police Department: evidence locker B3 (restricted)",
  "🔒 | Pacific Standard Bank: vault antechamber",
  "Bolingbroke Penitentiary: east cell block gate, level 2",
  "Sandy Shores Medical Centre (staff entrance)",
  "Paleto Bay sheriff: holding cell 4",
  "Vinewood Hills garage shutter, north",
  "Fort Zancudo perimeter gate C",
  "Grapeseed farm: barn door (old)",
  "Del Perro Pier: marina office",
  "Mirror Park laundromat back room",
  "Little Seoul convenience store",
  "Davis mechanic: lift bay 2",
];
const more = Object.fromEntries(
  LONG_NAMES.map((name, i) => {
    const id = 10 + i;
    return [
      String(id),
      {
        id,
        name,
        ...(i === 11 ? {} : { zone: i % 2 ? "Los Santos" : "Blaine County" }),
        state: i % 3 === 0 ? 0 : 1,
        coords: v(-1000 + i * 37.5, -500 + i * 12.25, 30.2),
        model: 1000000 + i * 311,
        heading: (i * 30) % 360,
        hash: 10 + i,
        maxDistance: 1 + (i % 4),
        ...(i % 4 === 0 ? { groups: { police: i % 8 === 0 ? 0 : 1 } } : {}),
        ...(i === 1 ? { items: [{ name: "bank_key", metadata: "vault", remove: true }] } : {}),
        ...(i === 4 ? { auto: true, autolock: 120 } : {}),
        distance: 3 + i * 1.4,
      } as Door,
    ];
  }),
);
Object.assign(doors, more);

const sounds = ["button-remote", "door-bolt-4", "metal-locker", "metallic-creak"];

const mocks = defineMocks({
  events: {
    updateDoorData: [
      doors,
      { ...doors["5"], name: "Sandy Shores clinic (edited)", state: 1, zone: "Sandy Shores" },
      { id: 9, name: "Bolingbroke gate", zone: "Bolingbroke Penitentiary", state: 1, coords: v(1844.9, 2604.8, 45.6), model: 741314661, heading: 90, hash: 7, maxDistance: 6, auto: true },
      2,
    ],
    setSoundFiles: sounds,
    setVisible: [undefined, 3, 1],
    playSound: { sound: "door-bolt-4", volume: 0.6 },
  },
});

export default function Dev() {
  useEffect(() => {
    emit("updateDoorData", doors);
    emit("setSoundFiles", sounds);
    emit("setVisible", undefined);
  }, []);
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
