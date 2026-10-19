// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots): default, civilian, nocharacter, minimal, loading.
import { closeSurface, emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { PauseData } from "./nui";

const player = {
  loaded: true,
  id: "ABC123",
  name: "Niko Bellic",
  health: 86,
  armor: 40,
  cash: 1520,
  bank: 48210,
  job: { name: "police", label: "LSPD", grade: 2, gradeLabel: "Sergeant", onDuty: true },
  dead: false,
  voice: { range: 3, talking: false },
};

const data: PauseData = {
  server: { name: "Los Santos", tagline: "Roleplay", logo: "LS" },
  links: [
    { label: "Discord", value: "discord.gg/yourserver" },
    { label: "Website", value: "yourserver.com" },
  ],
  buttons: ["resume", "map", "settings", "keybinds", "help", "disconnect"],
  help: [
    { key: "F1", label: "Phone" },
    { key: "TAB", label: "Inventory" },
    { key: "F", label: "Enter vehicle" },
    { key: "X", label: "Hands up" },
    { key: "T", label: "Chat" },
    { key: "P", label: "Map" },
  ],
  serverId: 7,
  playerName: "niko",
  players: 42,
  maxPlayers: 128,
};

const fixtures: Record<string, { player: object; data: PauseData }> = {
  default: { player, data },
  civilian: { player: { ...player, cash: 82, bank: 1200, job: { name: "unemployed", label: "Civilian", grade: 0 } }, data },
  nocharacter: { player: { ...player, loaded: false }, data },
  minimal: {
    player,
    data: { ...data, server: { name: "Paleto Nights" }, links: [], buttons: ["resume", "map", "disconnect"], players: 3, maxPlayers: 32 },
  },
  loading: { player, data: { ...data, players: undefined, maxPlayers: undefined } },
};

const ok = { ok: true };
const mocks = defineMocks({
  events: { "nuikit:player": Object.values(fixtures).map((f) => f.player as never) },
  callbacks: {
    "pause:resume": () => (void closeSurface("pause"), ok),
    "pause:map": () => (void closeSurface("pause"), ok),
    "pause:settings": () => (void closeSurface("pause"), ok),
    "pause:keybinds": () => (void closeSurface("pause"), ok),
    "pause:disconnect": () => (void closeSurface("pause"), ok),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = new URLSearchParams(location.search).get("fixture") ?? "default";
    const f = fixtures[name] ?? fixtures.default;
    // client/main.lua does this in game when Esc is pressed
    emit("nuikit:player", f.player as never);
    void openSurface("pause", f.data);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ pause: data }} scene="dusk" />;
}
