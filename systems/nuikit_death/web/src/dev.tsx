// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots); see `fixtures` below.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { DeathData } from "./nui";

const laststandText = { title: "You are down", subtitle: "Stay with us. Help may be on the way." };
const deadText = { title: "You are unconscious", subtitle: "Wait for EMS or respawn at the hospital." };

// What client/main.lua sends for each medical resource and moment.
const fixtures: Record<string, DeathData> = {
  "qbx-laststand": { phase: "laststand", medical: "qbx", seconds: 340, total: 360, ...laststandText },
  "qbx-laststand-help": {
    phase: "laststand", medical: "qbx", seconds: 182, total: 360, helpable: true,
    ems: { key: "G", state: "available" }, ...laststandText,
  },
  "qbx-laststand-requested": {
    phase: "laststand", medical: "qbx", seconds: 24, total: 360, helpable: true,
    ems: { key: "G", state: "requested" }, ...laststandText,
  },
  "qbx-dead": {
    phase: "dead", medical: "qbx", seconds: 247, total: 300,
    respawn: { key: "E", available: false, progress: 0, cost: 2000 }, ...deadText,
  },
  "qbx-dead-hold": {
    phase: "dead", medical: "qbx", seconds: 0, total: 300,
    respawn: { key: "E", available: true, progress: 0.5, cost: 2000 }, ...deadText,
  },
  "qb-laststand": {
    phase: "laststand", medical: "qb", seconds: 290, total: 360, estimated: true, helpable: true,
    ems: { key: "G", state: "available" }, ...laststandText,
  },
  "esx-dead": {
    phase: "dead", medical: "esx_death", seconds: 642, total: 660,
    respawn: { key: "E", available: false, wait: 43, progress: 0 }, ems: { key: "G", state: "available" }, ...deadText,
  },
  "esx-cooldown": {
    phase: "dead", medical: "esx_death", seconds: 512, total: 660,
    respawn: { key: "E", available: true, progress: 0.2 }, ems: { key: "G", state: "cooldown", seconds: 38 }, ...deadText,
  },
  native: { phase: "dead", medical: "native", ...deadText, subtitle: undefined },
};

const mocks = defineMocks({ events: {} });

export default function Dev() {
  useEffect(() => {
    const name = new URLSearchParams(location.search).get("fixture") ?? "qbx-laststand-help";
    // client/main.lua opens this when the medical resource puts the player down
    void openSurface("death", fixtures[name] ?? fixtures["qbx-laststand-help"]);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ death: fixtures["qbx-laststand-help"] }} scene="day" />;
}
