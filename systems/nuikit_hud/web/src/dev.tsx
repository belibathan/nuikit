// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots): default, driving, critical, civilian.
import { emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

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
const fixtures: Record<string, { player: object; vehicle: typeof cruising | false }> = {
  default: { player: loaded, vehicle: false },
  driving: { player: loaded, vehicle: cruising },
  critical: { player: critical, vehicle: { speed: 118, units: "mph", rpm: 0.94, gear: 6, fuel: 12, engine: 28, seatbelt: false } },
  civilian: { player: { ...loaded, job: { name: "unemployed", label: "Civilian", grade: 0 }, hunger: undefined, thirst: undefined, stress: undefined, voice: { mode: "Normal", talking: false } }, vehicle: false },
};

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
  },
});

export default function Dev() {
  useEffect(() => {
    // client/main.lua does this in game
    const f = fixtures[new URLSearchParams(location.search).get("fixture") ?? "default"] ?? fixtures.default;
    emit("nuikit:player", f.player as never);
    if (f.vehicle) emit("hud:vehicle", f.vehicle);
    openSurface("hud", { units: "mph", needs: true });
  }, []);
  return <NuiDevtools {...mocks} scene="dusk" />;
}
