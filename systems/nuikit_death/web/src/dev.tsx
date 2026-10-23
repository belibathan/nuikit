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
    respawn: { key: "E", available: false, cost: 2000 }, ...deadText,
  },
  "qbx-dead-hold": {
    phase: "dead", medical: "qbx", seconds: 0, total: 300,
    respawn: { key: "E", available: true, cost: 2000 }, ...deadText,
  },
  "qb-laststand": {
    phase: "laststand", medical: "qb", seconds: 290, total: 360, estimated: true, helpable: true,
    ems: { key: "G", state: "available" }, ...laststandText,
  },
  "esx-dead": {
    phase: "dead", medical: "esx_death", seconds: 642, total: 660,
    respawn: { key: "E", available: false, wait: 43 }, ems: { key: "G", state: "available" }, ...deadText,
  },
  "esx-cooldown": {
    phase: "dead", medical: "esx_death", seconds: 512, total: 660,
    respawn: { key: "E", available: true }, ems: { key: "G", state: "cooldown", seconds: 38 }, ...deadText,
  },
  native: { phase: "dead", medical: "native", ...deadText, subtitle: undefined },
  // third-party strings as a medical script sends them: an emoji and " | ", mixed case, long text
  "qbx-laststand-long": {
    phase: "laststand", medical: "qbx", seconds: 340, total: 360, helpable: true,
    ems: { key: "G", state: "available" },
    title: "🩸 | You are down, and the EMS crew is four blocks out",
    subtitle: "Stay with us. A Pillbox Hill medic has been dispatched and is on the way, so keep breathing and do not try to stand up until they arrive.",
  },
  // a hospital bill past the readout's width; respawn is accepted now
  "qbx-dead-bill": {
    phase: "dead", medical: "qbx", seconds: 0, total: 300,
    respawn: { key: "E", available: true, cost: 1234567 }, ...deadText,
  },
  // a last stand whose timer has run out: zero on the clock
  "qbx-laststand-zero": {
    phase: "laststand", medical: "qbx", seconds: 0, total: 360, helpable: false,
    ems: { key: "G", state: "requested" }, ...laststandText,
  },
};

// How far E is held in each fixture: client/main.lua streams it on death:hold (NUI.stream).
const holds: Record<string, number> = { "qbx-dead-hold": 0.5, "esx-cooldown": 0.2, "qbx-dead-bill": 1 };

const mocks = defineMocks({ events: {} });

export default function Dev() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const name = params.get("fixture") ?? "qbx-laststand-help";
    // client/main.lua opens this when the medical resource puts the player down
    void openSurface("death", fixtures[name] ?? fixtures["qbx-laststand-help"]);
    const hold = holds[name];
    if (hold === undefined) return;
    if (params.has("live")) {
      // ?live: E held for 4.7 s, streamed like the game does (≤30 a second, 0.01 steps), then let go
      const start = performance.now();
      const send = () => {
        const v = Math.min(1, Math.round(((performance.now() - start) / 4700) * 100) / 100);
        window.postMessage({ action: "death:hold", data: v }, "*");
        if (v < 1) timer = window.setTimeout(send, 33);
      };
      let timer = window.setTimeout(send, 33);
      return () => clearTimeout(timer);
    }
    // once the bar is on screen (a value sent before anything follows it is not kept)
    const timer = window.setTimeout(() => window.postMessage({ action: "death:hold", data: hold }, "*"), 100);
    return () => clearTimeout(timer);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ death: fixtures["qbx-laststand-help"] }} scene="day" />;
}
