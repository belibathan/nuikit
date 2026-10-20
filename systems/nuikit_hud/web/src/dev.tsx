// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots): default, driving, critical, civilian,
// circle (driving, round minimap). &heading=<deg> turns the compass.
import { emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { MinimapFrame, MinimapState } from "./nui";

const loaded = {
  loaded: true,
  id: "ABC123",
  name: "Niko Bellic",
  health: 86,
  armor: 40,
  hunger: 72,
  thirst: 58,
  stress: 12,
  cash: 1520,
  bank: 48210,
  job: { name: "police", label: "LSPD", grade: 2, gradeLabel: "Sergeant", onDuty: true },
  dead: false,
  voice: { range: 3, talking: false, radio: 101 },
};

const critical = { ...loaded, health: 14, armor: 0, hunger: 9, thirst: 22, stress: 84, voice: { range: 8, talking: true, radio: 101 } };
const cruising = { speed: 64, units: "mph" as const, rpm: 0.62, gear: 4, fuel: 71, engine: 98, seatbelt: true };
const fixtures: Record<string, { player: object; vehicle: typeof cruising | false; shape?: MinimapFrame["shape"] }> = {
  default: { player: loaded, vehicle: false },
  driving: { player: loaded, vehicle: cruising },
  circle: { player: loaded, vehicle: cruising, shape: "circle" },
  critical: { player: critical, vehicle: { speed: 118, units: "mph", rpm: 0.94, gear: 6, fuel: 12, engine: 28, seatbelt: false } },
  civilian: { player: { ...loaded, job: { name: "unemployed", label: "Civilian", grade: 0 }, hunger: undefined, thirst: undefined, stress: undefined, voice: { mode: "Normal", talking: false } }, vehicle: false },
};

/** What client/minimap.lua computes for this window (Minimap.layout): bottom-left, 15rem, 0.375rem band. */
function frameFor(shape: MinimapFrame["shape"]): MinimapFrame {
  const w = innerWidth;
  const h = innerHeight;
  const rem = Math.min(32, Math.max(12, h * 0.014815));
  const size = 15 * rem;
  const stageW = Math.min(w, (h * 16) / 9);
  const x = (w - stageW) / 2 + 1.5 * rem;
  const y = h - 1.5 * rem - size;
  return { x: x / w, y: y / h, w: size / w, h: size / h, band: (0.375 * rem) / h, shape };
}

const street: MinimapState = { visible: true, heading: 30, street: "Elgin Ave", crossing: "Vespucci Blvd", zone: "Pillbox Hill" };

const mocks = defineMocks({
  events: {
    "nuikit:player": [
      loaded,
      { ...loaded, health: 14, armor: 0, hunger: 9, thirst: 22, stress: 70, voice: { range: 8, talking: true } },
      { ...loaded, job: { name: "unemployed", label: "Civilian", grade: 0 }, hunger: undefined, thirst: undefined, stress: undefined },
      { ...loaded, loaded: false },
    ],
    "hud:vehicle": [
      { speed: 64, units: "mph", rpm: 0.62, gear: 4, fuel: 71, engine: 98, seatbelt: true },
      { speed: 118, units: "mph", rpm: 0.94, gear: 6, fuel: 12, engine: 28, seatbelt: false },
      false,
    ],
    // live values (main.lua streams them, ~30 a second while they change; the gauge glides between)
    "hud:vehicle:speed": [64, 88, 118, 12],
    "hud:vehicle:rpm": [0.62, 0.8, 0.94, 0.25],
    "hud:minimap": [street, { ...street, heading: 120 }, { ...street, visible: false }],
  },
  callbacks: {
    "hud:minimap:ready": () => ({ ok: true }),
  },
});

export default function Dev() {
  useEffect(() => {
    // client/main.lua does this in game
    const q = new URLSearchParams(location.search);
    const f = fixtures[q.get("fixture") ?? "default"] ?? fixtures.default;
    emit("nuikit:player", f.player as never);
    if (f.vehicle) emit("hud:vehicle", f.vehicle);
    openSurface("hud", { units: "mph", needs: true });
    // minimap.lua: the radar shows while driving (Config.radar = 'vehicle')
    const mf = frameFor(f.shape ?? "square");
    emit("hud:minimap:frame", mf);
    emit("hud:minimap", { ...street, visible: !!f.vehicle, heading: Number(q.get("heading") ?? street.heading) });
  }, []);
  return <NuiDevtools {...mocks} scene="dusk" />;
}
