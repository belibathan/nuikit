// The game, faked for browser development. Press ` for the devtools.
// ?fixture=<name> picks a starting state (used for screenshots):
//   default, civilian, nocharacter, minimal, loading, simple, map, map-picked, keys, info
import { closeSurface, emit, mockSettings, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import type { KeyBinding, MapBlip, MapInfo, MapPins, PauseData, PauseView } from "./nui";

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
  views: { map: true, keys: true, info: true, preview: true, settings: true },
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

// The settings service in the browser: this menu's section (client/settings.lua) and a HUD's, the way the
// Settings page lists every resource's.
mockSettings([
  {
    resource: "nuikit_pause",
    label: "Display",
    version: 1,
    rows: [
      { key: "textSize", label: "Text size", group: "Display", default: 1, options: [{ value: 0.9, label: "Small" }, { value: 1, label: "Standard" }, { value: 1.1, label: "Large" }, { value: 1.2, label: "Larger" }] },
      { key: "contrast", label: "High contrast", group: "Display", toggle: true, default: false },
      { key: "reducedMotion", label: "Reduced motion", group: "Display", toggle: true, default: false, description: "Fades instead of slides, no camera moves" },
      { key: "streamer", label: "Streamer mode", group: "Privacy", toggle: true, default: false, description: "Hides names and money on screen" },
      { key: "hud", label: "Show the HUD", group: "HUD", toggle: true, default: true },
    ],
    presets: [
      { id: "standard", label: "Standard", patch: { textSize: 1, contrast: false, reducedMotion: false, streamer: false, hud: true } },
      { id: "streamer", label: "Streamer", patch: { streamer: true } },
      { id: "performance", label: "Performance", patch: { reducedMotion: true } },
      { id: "cinema", label: "Cinema", patch: { hud: false } },
    ],
  },
  {
    resource: "nuikit_hud",
    label: "HUD",
    version: 1,
    rows: [
      { key: "layout", label: "Layout", default: "compact", options: [{ value: "compact", label: "Compact" }, { value: "classic", label: "Classic" }] },
      { key: "scale", label: "Size", range: [0.8, 1.2, 0.05], default: 1 },
      { key: "minimap", label: "Minimap", toggle: true, default: true, group: "Map" },
    ],
  },
]);

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
// A Qbox city's blips, as client/map3d.lua reads them (sprite, GTA colour, short-range, entity type):
// hospitals, police, city hall, banks, 24/7s, Ammu-Nation, clothing, barbers, tattoo parlors,
// garages, the impound, dealers, mod shops, gas stations, car washes, jobs, apartments, and two that
// move. &zoom=far looks from further out (short-range blips turn to dots).
type B = [x: number, y: number, sprite: number, colour: number, short: boolean, entity?: number];
const CITY: B[] = [
  [298.6, -584.5, 61, 2, false], [-247.0, 6331.0, 61, 2, false], [428.2, -981.0, 60, 29, false], [-1108.0, -845.0, 60, 29, false],
  [-544.9, -204.3, 487, 0, false],
  [149.9, -1040.7, 108, 2, true], [241.7, 225.0, 108, 2, true], [314.2, -278.6, 108, 2, true], [-351.0, -49.6, 108, 2, true], [-1213.0, -330.0, 108, 2, true],
  [25.7, -1347.3, 59, 2, true], [-48.5, -1757.5, 59, 2, true], [1136.0, -982.0, 59, 2, true], [373.9, 325.9, 59, 2, true], [-707.5, -914.3, 59, 2, true],
  [-1222.9, -906.9, 93, 2, true], [1163.4, -323.8, 59, 2, true], [-1487.6, -379.1, 93, 2, true],
  [22.0, -1107.0, 110, 1, true], [252.0, -50.0, 110, 1, true], [842.0, -1033.0, 110, 1, true], [-662.0, -935.0, 110, 1, true],
  [72.3, -1399.1, 366, 47, true], [-703.8, -152.3, 366, 47, true], [-167.9, -299.0, 366, 47, true], [428.7, -800.1, 366, 47, true], [-829.4, -1073.7, 366, 47, true], [125.5, -223.6, 366, 47, true],
  [-814.3, -183.8, 71, 0, true], [136.8, -1708.4, 71, 0, true], [-1282.6, -1116.8, 71, 0, true],
  [1322.6, -1651.9, 75, 1, true], [-1153.6, -1425.6, 75, 1, true], [322.1, 180.4, 75, 1, true],
  [215.1, -809.6, 357, 3, true], [-340.0, -874.0, 357, 3, true], [273.0, -343.0, 357, 3, true], [-1184.0, -1509.0, 357, 3, true], [1032.0, -765.0, 357, 3, true],
  [401.0, -1631.0, 68, 17, false], [-794.0, -1510.0, 356, 3, true], [-1243.0, -3391.0, 360, 3, true],
  [-56.8, -1098.8, 326, 2, false], [-337.0, -136.9, 72, 0, true], [731.0, -1088.0, 72, 0, true], [-211.0, -1324.0, 446, 46, true],
  [-724.6, -935.1, 361, 1, true], [265.0, -1261.0, 361, 1, true], [1208.0, -1402.0, 361, 1, true], [-526.0, -1211.0, 361, 1, true], [818.0, -1040.0, 361, 1, true],
  [25.0, -1392.0, 100, 37, true], [-699.0, -932.0, 100, 37, true],
  [153.0, -3211.0, 477, 5, false], [462.0, -641.0, 513, 5, false], [909.0, -177.0, 198, 5, false], [-322.0, -1545.0, 318, 5, false], [-598.0, -930.0, 459, 5, false],
  [-271.0, -957.0, 475, 2, true], [269.0, -640.0, 475, 2, true], [182.0, -1319.0, 431, 0, true],
  [360.0, -700.0, 56, 38, false, 1], [-120.0, -600.0, 274, 1, false, 2],
];
const blips: MapBlip[] = CITY.map(([x, y, s, c, sr, e], i) => ({ id: 1000 + i, x, y, z: 30, s, c, sr, a: 255, e: e ?? 4 }));
blips[34]!.name = "Legion Square garage"; // a name passed by the garage resource (exports.nuikit_pause:nameBlip)
blips[0]!.flash = undefined;
const far = new URLSearchParams(location.search).get("zoom") === "far";
/** A top-down camera over the city: world → 0–1 screen, as Map3D.project would give it. */
function blipPositions(): number[] {
  const span = far ? 9000 : 3600;
  const aspect = innerWidth / innerHeight;
  const cx = far ? 0 : -150;
  const cy = far ? -400 : -720;
  const out: number[] = [];
  for (const b of blips) {
    const u = 0.5 + (b.x - cx) / span;
    const v = 0.5 - ((b.y - cy) * aspect) / span;
    const on = u > -0.05 && u < 1.05 && v > -0.05 && v < 1.05;
    out.push(on ? u : -1, on ? v : -1);
  }
  return out;
}

const sendMap = () => {
  emit("pause:map:blips", blips);
  emit("pause:map:pins", { ...mapPins, b: blipPositions(), d: far ? 4000 : 900 });
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
    "pause:map:fly": () => ok,
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
    "pause:map:recenter": () => {
      mapInfo = { ...mapInfo, follow: true };
      sendMap();
      return ok;
    },
    "pause:map:follow": ({ on }: { on: boolean }) => {
      mapInfo = { ...mapInfo, follow: on };
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
