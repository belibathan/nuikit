// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots):
//   default, civilian, nocharacter, minimal, loading, simple, map, map-picked, keys, info
import { closeSurface, emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { KeyBinding, MapInfo, MapPins, PauseData, PauseView } from "./nui";

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

const places: PauseData["places"] = [
  { id: "pillbox", label: "Pillbox Medical", category: "Services", icon: "hospital", x: 298.6, y: -584.5 },
  { id: "mrpd", label: "Mission Row Police", category: "Services", icon: "shield", x: 428.2, y: -981.0 },
  { id: "cityhall", label: "City Hall", category: "Services", icon: "landmark", x: -544.9, y: -204.3 },
  { id: "legion", label: "Legion Square", category: "Landmarks", icon: "trees", x: 195.2, y: -933.8 },
  { id: "pier", label: "Del Perro Pier", category: "Landmarks", icon: "ferris-wheel", x: -1640, y: -1050 },
  { id: "vinewood", label: "Vinewood Sign", category: "Landmarks", icon: "mountain", x: 711, y: 1198 },
  { id: "lsc", label: "Los Santos Customs", category: "Vehicles", icon: "wrench", x: -337, y: -136.9 },
  { id: "pdm", label: "Premium Deluxe Motorsport", category: "Vehicles", icon: "car", x: -56.8, y: -1098.8 },
  { id: "lsia", label: "Los Santos Airport", category: "Travel", icon: "plane", x: -1037, y: -2737 },
];

const data: PauseData = {
  server: { name: "Los Santos", tagline: "Roleplay", logo: "LS" },
  links: [
    { label: "Discord", value: "discord.gg/yourserver" },
    { label: "Website", value: "yourserver.com" },
  ],
  buttons: ["resume", "map", "keybinds", "info", "settings", "disconnect"],
  help: [
    { key: "Z", label: "Radial menu" },
    { key: "M", label: "Phone" },
  ],
  serverId: 7,
  playerName: "niko",
  players: 42,
  maxPlayers: 128,
  ping: 38,
  uptime: 3 * 3600 + 12 * 60,
  restartIn: 2 * 3600 + 5 * 60,
  views: { map: true, keys: true, info: true, preview: true },
  preview: true,
  places,
  pages: [
    {
      id: "rules",
      title: "Server rules",
      icon: "scroll-text",
      body: `Be respectful to every player, in and out of character.

- No random deathmatch: violence needs a roleplay reason.
- No metagaming: what you hear on Discord or a stream isn't known in character.
- No powergaming: give other players a chance to respond.
- Value your life: act like your character wants to live.

Questions? Ask staff in Discord.`,
    },
    {
      id: "start",
      title: "Getting started",
      icon: "compass",
      body: `Welcome to the city. A few things to do first:

- Get an ID card at City Hall.
- Open your phone to find jobs and contacts.
- Use the map (Esc, then Map) to find places and set a waypoint.`,
    },
  ],
};

const keys: KeyBinding[] = [
  { group: "Menus", label: "Radial menu", key: "Z" },
  { group: "Menus", label: "Inventory", key: "Tab" },
  { group: "Menus", label: "Phone", key: "M" },
  { group: "Menus", label: "Scoreboard", key: "Home" },
  { group: "Menus", label: "Look at (target)", key: "Alt" },
  { group: "Vehicle", label: "Enter vehicle", key: "F" },
  { group: "Vehicle", label: "Seatbelt", key: "B" },
  { group: "Vehicle", label: "Lock / unlock", key: "L" },
  { group: "Vehicle", label: "Engine", key: "G" },
  { group: "Vehicle", label: "Cruise control", key: null },
  { group: "Character", label: "Hands up", key: "X" },
  { group: "Character", label: "Crouch", key: "K" },
  { group: "Character", label: "Push to talk", key: "N" },
  { group: "Character", label: "Chat", key: "T" },
];

// What Lua's projection would send for a camera above Pillbox Hill (data.places order).
const pins: MapPins = {
  // pillbox, mrpd, cityhall, legion, pier, vinewood, lsc, pdm, lsia
  at: [0.56, 0.38, 0.66, 0.62, -1, -1, 0.52, 0.56, -1, -1, -1, -1, 0.33, 0.31, 0.4, 0.7, -1, -1],
  you: [0.5, 0.5, 260],
  wp: false,
  h: 20,
};
const info: MapInfo = { zone: "Pillbox Hill", street: "Elgin Ave / Vespucci Blvd", topdown: false, waypoint: false };

const fixtures: Record<string, { player: object; data: PauseData }> = {
  default: { player, data },
  civilian: { player: { ...player, cash: 82, bank: 1200, job: { name: "unemployed", label: "Civilian", grade: 0 } }, data },
  nocharacter: { player: { ...player, loaded: false }, data },
  minimal: {
    player,
    data: { ...data, server: { name: "Paleto Nights" }, links: [], buttons: ["resume", "map", "disconnect"], players: 3, maxPlayers: 32 },
  },
  loading: { player, data: { ...data, players: undefined, maxPlayers: undefined, ping: undefined, uptime: undefined } },
  // the 0.4 menu: no views, blurred
  simple: { player, data: { ...data, views: undefined, preview: false, buttons: ["resume", "map", "settings", "keybinds", "help", "disconnect"] } },
  map: { player, data: { ...data, view: "map" } },
  "map-picked": { player, data: { ...data, view: "map" } },
  keys: { player, data: { ...data, view: "keys" } },
  info: { player, data: { ...data, view: "info" } },
};

const ok = { ok: true };
let mapPins = pins;
let mapInfo = info;
const sendMap = () => {
  emit("pause:map:pins", mapPins);
  emit("pause:map:info", mapInfo);
};
const mocks = defineMocks({
  events: {
    "nuikit:player": Object.values(fixtures).map((f) => f.player as never),
    "pause:map:pins": [pins, { ...pins, wp: [0.56, 0.36] }],
    "pause:map:info": [info, { ...info, waypoint: true }, { ...info, topdown: true }],
    "pause:keys": [keys],
  },
  callbacks: {
    "pause:resume": () => (void closeSurface("pause"), ok),
    "pause:map": () => (void closeSurface("pause"), ok),
    "pause:settings": () => (void closeSurface("pause"), ok),
    "pause:keybinds": () => (void closeSurface("pause"), ok),
    "pause:gamemap": () => (void closeSurface("pause"), ok),
    "pause:disconnect": () => (void closeSurface("pause"), ok),
    "pause:view": ({ view }: { view: PauseView }) => {
      if (view === "keys") setTimeout(() => emit("pause:keys", keys), 120);
      if (view === "map") setTimeout(sendMap, 60);
      return { ok: true, preview: view === "home" };
    },
    "pause:map:pick": () => ({
      ok: true,
      point: { x: 310.4, y: -601.2, z: 43.2 },
      street: "Elgin Ave",
      crossing: "Vespucci Blvd",
      zone: "Pillbox Hill",
      distance: 1840,
    }),
    "pause:map:waypoint": (req: { x?: number; clear?: boolean }) => {
      const clear = "clear" in req;
      mapPins = { ...mapPins, wp: clear ? false : [0.58, 0.4] };
      mapInfo = { ...mapInfo, waypoint: !clear };
      sendMap();
      return ok;
    },
    "pause:map:topdown": ({ on }: { on: boolean }) => {
      mapPins = { ...mapPins, h: on ? 0 : 20 };
      mapInfo = { ...mapInfo, topdown: on };
      sendMap();
      return ok;
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = new URLSearchParams(location.search).get("fixture") ?? "default";
    const f = fixtures[name] ?? fixtures.default;
    // client/main.lua does this in game when Esc is pressed
    emit("nuikit:player", f.player as never);
    void openSurface("pause", f.data);
    if (f.data.view === "map") setTimeout(sendMap, 50);
    if (f.data.view === "keys") setTimeout(() => emit("pause:keys", keys), 50);
    if (name === "map-picked") {
      // what a click on the map shows
      setTimeout(() => {
        const layer = document.querySelector<HTMLElement>(".pause-map-input");
        const opts = { bubbles: true, clientX: innerWidth * 0.58, clientY: innerHeight * 0.4, button: 0, pointerId: 1 };
        layer?.dispatchEvent(new PointerEvent("pointerdown", opts));
        layer?.dispatchEvent(new PointerEvent("pointerup", opts));
      }, 300);
    }
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ pause: data }} scene={new URLSearchParams(location.search).get("fixture")?.startsWith("map") ? "day" : "dusk"} />;
}
