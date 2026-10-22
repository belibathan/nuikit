// The game, faked for browser development. Press ` for the devtools.
//
// ?fixture=<name>   foot (default), low, idle, cruise, redline, reverse, damaged, plane, boat, wide
// &gauge=arc|bar|digital   force a gauge style (else the theme's --nk-gauge-style)
// &identity=<name>  try identity tokens before they ship: signal, vector (sets --nk-* on <html>)
// &theme=ember      a colourful TweakCN-style theme instead of stock neutral
// &scene=<url|name> the background (an image URL, or day / dusk / night)
// &heading=<deg>    the camera's bearing
// &rule=stage       the 0.5.0 layout rule (16:9 in the middle) instead of the game's edges
// &shape=circle     round minimap (classic)
// &layout=classic   the 0.6 layout (default: compact)
// &weapon=<kind>|none  the weapon in hand: pistol (default on foot), smg, rifle, shotgun, sniper, heavy, thrown
// &radar=off        hide the radar (compact on foot with Config.radar = 'vehicle')
// &style=stock      Config.minimap.style = 'stock': GTA's own radar box bottom left, no frame
// &chip=diamond,fill,tag,uniform   a /hudstyle override (shape, level, label, icon)
// &pop=hunger:25     fire a vital pop after load (/hudpop)
import { applyTheme, closeSurface, emit, openSurface } from "nuikit-core";
import { PRESET_PARTS } from "./hud/parts";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect, useState } from "react";
import type { HudLayout, HudLocation, HudPreset, HudSettings, HudStyles, HudVehicle, HudWeapon, MinimapFrame, StyleChoice, StyleKey, StyleValue } from "./nui";

const q = new URLSearchParams(location.search);

const full = {
  loaded: true,
  id: "ABC123",
  name: "Niko Bellic",
  health: 100,
  armor: 100,
  hunger: 100,
  thirst: 96,
  stress: 4,
  cash: 1520,
  bank: 48210,
  job: { name: "police", label: "LSPD", grade: 2, gradeLabel: "Sergeant", onDuty: true },
  dead: false,
  voice: { range: 3, mode: "Normal", talking: false, radio: 101 },
};
const low = { ...full, health: 18, armor: 0, hunger: 12, thirst: 22, stress: 72, voice: { range: 8, mode: "Shouting", talking: true, radio: 101 } };

const car = (v: Partial<HudVehicle>): HudVehicle => ({
  kind: "car",
  units: "mph",
  engineOn: true,
  redline: 0.9,
  engine: 100,
  body: 100,
  fuel: 64,
  moving: false,
  gear: 1,
  gears: 6,
  handbrake: false,
  indicators: 0,
  lights: "off",
  seatbelt: true,
  cruise: false,
  speed: 0,
  rpm: 0.2,
  ...v,
});

const fixtures: Record<string, { player: object; vehicle?: HudVehicle; changes?: object }> = {
  foot: { player: full, changes: { ...full, cash: 2020, bank: 47710 } },
  low: { player: low },
  idle: { player: full, vehicle: car({ gear: "N", rpm: 0.2, speed: 0 }) },
  cruise: { player: full, vehicle: car({ gear: 4, rpm: 0.56, speed: 64, moving: true, lights: "low", cruise: true, cruiseSpeed: 65, indicators: 1 }) },
  redline: { player: full, vehicle: car({ gear: 3, rpm: 0.97, speed: 98, moving: true, lights: "high" }) },
  reverse: { player: full, vehicle: car({ gear: "R", rpm: 0.34, speed: 6, handbrake: false }) },
  damaged: {
    player: { ...full, health: 41, armor: 0 },
    vehicle: car({ gear: 2, rpm: 0.44, speed: 31, moving: true, fuel: 7, engine: 18, body: 26, seatbelt: false, indicators: 3, handbrake: true }),
  },
  plane: {
    player: full,
    vehicle: { kind: "plane", units: "kts", engineOn: true, redline: 0.9, engine: 92, body: 100, fuel: 58, moving: true, lights: "low", landingGear: "up", altUnits: "ft", speed: 142, heading: 274, altitude: 2350 },
  },
  boat: { player: full, vehicle: { kind: "boat", units: "kts", engineOn: true, redline: 0.9, engine: 100, body: 100, fuel: 80, moving: true, lights: "off", speed: 28, rpm: 0.71, heading: 96 } },
};
fixtures.wide = fixtures.cruise!;

/** client/layout.lua's answer for this window. 'game' (assumed until measured in game): GTA's HUD
 * spans the screen up to 3.5:1 and keeps to the middle 16:9 beyond; 'stage': the 0.5.0 rule. */
function layoutFor(): HudLayout {
  const w = innerWidth;
  const h = innerHeight;
  const aspect = w / h;
  const stage = q.get("rule") === "stage" || aspect > 3.5;
  const side = stage ? Math.max(0, (w - (h * 16) / 9) / 2) / w : 0;
  return { l: side, r: side, t: 0, b: 0, aspect, source: stage ? "stage" : "game" };
}

/** What client/minimap.lua computes (Minimap.layout). Classic: bottom-left, 15rem, 0.375rem band;
 * compact: a 15rem circle top-right with 1.75rem headroom for the heading; 1.5rem in from the edges. */
function frameFor(layout: HudLayout, shape: MinimapFrame["shape"], preset: HudPreset): MinimapFrame {
  const w = innerWidth;
  const h = innerHeight;
  const rem = Math.min(32, Math.max(12, h * 0.014815));
  if (preset === "compact") {
    const size = 15 * rem;
    // ?anchor=bottom-left (any corner): Config.parts.map
    const anchor = new URLSearchParams(location.search).get("anchor") ?? "top-right";
    const x = anchor.endsWith("left") ? layout.l * w + 1.5 * rem : w - layout.r * w - 1.5 * rem - size;
    const y = anchor.startsWith("top") ? layout.t * h + 1.5 * rem + 1.75 * rem : h - layout.b * h - 1.5 * rem - size;
    return { x: x / w, y: y / h, w: size / w, h: size / h, band: (0.125 * rem) / h, shape: "circle", framed: true, preset };
  }
  const size = 15 * rem;
  const x = layout.l * w + 1.5 * rem;
  const y = h - layout.b * h - 1.5 * rem - size;
  return { x: x / w, y: y / h, w: size / w, h: size / h, band: (0.375 * rem) / h, shape, framed: true, preset };
}

/** Minimap.applyStock: GTA's stock box (Layout.stockMinimap), unframed. */
function stockFrame(layout: HudLayout, preset: HudPreset): MinimapFrame {
  const w = innerWidth;
  const h = innerHeight;
  const unit = (h * 16) / 9;
  const left = layout.l * w;
  const bottom = h - layout.b * h + 0.002 * h;
  const bw = 0.15 * unit;
  const bh = 0.188888 * h;
  return { x: (left - 0.0045 * unit) / w, y: (bottom - bh) / h, w: bw / w, h: bh / h, band: 0, shape: "square", framed: false, preset };
}

const WEAPONS: Record<string, HudWeapon> = {
  pistol: { kind: "pistol", clip: 12, reserve: 48 },
  smg: { kind: "smg", clip: 24, reserve: 120 },
  rifle: { kind: "rifle", clip: 30, reserve: 90 },
  shotgun: { kind: "shotgun", clip: 0, reserve: 16 },
  sniper: { kind: "sniper", clip: 5, reserve: 20 },
  heavy: { kind: "heavy", clip: 1, reserve: 4 },
  thrown: { kind: "thrown", clip: 3 },
};

const place: HudLocation = { visible: true, street: "Elgin Ave", crossing: "Vespucci Blvd", zone: "Pillbox Hill", postal: "7023", waypoint: 1850, bearing: 300 };

// Identity tokens from design v2 (another branch ships them); here only to show the HUD reads them.
const IDENTITIES: Record<string, Record<string, string>> = {
  signal: { "--nk-gauge-style": "bar", "--nk-label-case": "uppercase", "--nk-tracking-label": "0.06em", "--nk-gauge-track": "0.5rem", "--nk-hud-text-shadow": "strong" },
  vector: { "--nk-gauge-style": "digital", "--nk-glow": "0.6", "--nk-gauge-ticks": "1", "--nk-hud-opacity": "0.7" },
};

// nuikit-ignore-start color/hardcoded (a sample theme and a fake radar: browser development only)
const THEMES: Record<string, Record<string, string>> = {
  ember: {
    primary: "oklch(0.78 0.16 65)",
    "primary-foreground": "oklch(0.2 0.03 60)",
    "chart-1": "oklch(0.66 0.21 25)",
    "chart-2": "oklch(0.68 0.15 245)",
    "chart-3": "oklch(0.8 0.16 75)",
    "chart-4": "oklch(0.78 0.12 210)",
    "chart-5": "oklch(0.66 0.2 320)",
  },
};
const RADAR = {
  background:
    "linear-gradient(28deg, transparent 47%, #8a95a3 47.5%, #8a95a3 49.5%, transparent 50%) 0 0/100% 100%, linear-gradient(115deg, transparent 60%, #6d7785 60.4%, #6d7785 61.6%, transparent 62%) 0 0/100% 100%, linear-gradient(0deg, #4c5866 1px, transparent 1px) 0 0/34px 34px, linear-gradient(90deg, #4c5866 1px, transparent 1px) 0 0/34px 34px, radial-gradient(circle at 60% 40%, #3f6f4f 0 14%, transparent 15%), #2c3540",
};
// nuikit-ignore-end

/** GTA's radar, faked under the frame so screenshots look like the game. */
function FakeRadar({ frame }: { frame: MinimapFrame }) {
  const w = innerWidth;
  const h = innerHeight;
  const band = frame.band * h;
  const round = frame.shape === "circle";
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: frame.x * w + band - 1,
        top: frame.y * h + band - 1,
        width: frame.w * w - 2 * band + 2,
        height: frame.h * h - 2 * band + 2,
        borderRadius: round ? "50%" : 0,
        zIndex: 0,
        ...RADAR,
      }}
    />
  );
}

// ?edit: the Style tab's choices as client/layout.lua sends them (every option allowed), and the HUD it previews
const DEV_STYLES: StyleChoice[] = (
  [
    ["vitals.display", "icons", ["icons", "value", "pill", "expand"]],
    ["vitals.visibility", "rest", ["always", "rest", "voice"]],
    ["vehicle.gauge", "theme", ["theme", "arc", "bar", "digital"]],
    ["map.shape", "circle", ["circle", "square"]],
    ["map.size", 15, [12, 15, 18]],
    ["map.halo", true, [true, false]],
    ["map.compass", true, [true, false]],
    ["map.column", "auto", ["auto", "below", "above"]],
    ["column.street", true, [true, false]],
    ["column.area", true, [true, false]],
    ["column.money", true, [true, false]],
    ["column.job", true, [true, false]],
    ["column.align", "center", ["center", "start", "end"]],
    ["map.radar", "always", ["always", "vehicle", "never"]],
    ...(["scale.top-left", "scale.top-right", "scale.bottom-left", "scale.bottom-right", "scale.map"] as StyleKey[]).map((k) => [k, 1, [0.8, 0.9, 1, 1.1, 1.25, 1.5]]),
  ] as [StyleKey, StyleValue, StyleValue[]][]
).map(([key, d, options]) => ({ key, value: d, default: d, options }));
let devSettings: HudSettings | null = null;

const mocks = defineMocks({
  events: {
    "nuikit:player": [full, low, { ...full, cash: 2020 }, { ...full, loaded: false }],
    "hud:vehicle": [car({ gear: 4, rpm: 0.56, speed: 64, moving: true }), car({ gear: 3, rpm: 0.97, speed: 98 }), false],
    "hud:vehicle:speed": [64, 88, 118, 12],
    "hud:vehicle:rpm": [0.56, 0.8, 0.97, 0.25],
    "hud:minimap:heading": [30, 120, 274],
    "hud:location": [place, { ...place, crossing: undefined, waypoint: undefined, postal: undefined }],
  },
  callbacks: {
    "hud:ready": () => ({ ok: true }),
    "hud:minimap:ready": () => ({ ok: true }),
    "hud:parts:save": () => ({ ok: true }),
    "hud:parts:preview": () => ({ ok: true }),
    "hud:styles:preview": ({ styles }: { styles?: HudStyles }) => {
      if (devSettings) openSurface("hud", { ...devSettings, styles: { ...devSettings.styles, ...styles } });
      return { ok: true };
    },
    "hud:styles:save": () => ({ ok: true }),
    "hud:styles:reset": () => ({ ok: true }),
    "hud:parts:reset": () => ({ ok: true }),
    "hud:style:get": () => {
      const [shape, level, attach, icon] = (q.get("chip") ?? "").split(",");
      return { ok: true, style: q.get("chip") ? { shape, level, attach, icon } : null };
    },
  },
});

export default function Dev() {
  const [frame, setFrame] = useState<MinimapFrame | null>(null);
  useEffect(() => {
    const f = fixtures[q.get("fixture") ?? "foot"] ?? fixtures.foot!;
    const theme = THEMES[q.get("theme") ?? ""];
    if (theme) applyTheme(theme);
    for (const [k, v] of Object.entries(IDENTITIES[q.get("identity") ?? ""] ?? {})) document.documentElement.style.setProperty(k, v);

    const preset: HudPreset = q.get("layout") === "classic" ? "classic" : "compact";
    const settings: HudSettings = {
      layout: preset,
      ammo: true,
      units: "mph",
      needs: true,
      vehicle: { gauge: (q.get("gauge") as "arc" | "bar" | "digital" | null) ?? "theme", seatbelt: "auto", cruise: "auto" },
      compass: { enabled: preset === "classic", onFoot: false, ring: true },
    };
    emit("nuikit:player", f.player as never);
    // client/layout.lua and minimap.lua do this in game
    const layout = layoutFor();
    emit("hud:layout", layout);
    const v = f.vehicle;
    const mf = q.get("style") === "stock" ? stockFrame(layout, preset) : frameFor(layout, q.get("shape") === "circle" ? "circle" : "square", preset);
    emit("hud:minimap:frame", mf);
    const heading = Number(q.get("heading") ?? 32);
    emit("hud:minimap:heading", heading);
    // compact shows the map on foot too (Config.radar = 'always'); &radar=off hides it
    const radar = q.get("radar") !== "off" && (!!v || preset === "compact");
    emit("hud:minimap", { visible: radar, heading });
    emit("hud:location", place);
    const weapon = q.get("weapon") ?? (v ? "none" : "pistol");
    emit("hud:weapon", WEAPONS[weapon] ?? false);
    if (v) {
      emit("hud:vehicle", v);
      emit("hud:vehicle:speed", v.speed);
      if (v.rpm !== undefined) emit("hud:vehicle:rpm", v.rpm);
      if (v.heading !== undefined) emit("hud:vehicle:heading", v.heading);
      if (v.altitude !== undefined) emit("hud:vehicle:altitude", v.altitude);
    }
    if (radar) setFrame(mf);
    // ?retract: Foundation 2 situations with the lever on (status and vitals slide away after --nk-rest-delay)
    if (q.has("retract")) document.documentElement.style.setProperty("--nk-rest-delay", "8s");
    if (q.has("retract")) settings.situations = { retract: true, rest: ["map", "vehicle"], moment: ["status", "map", "vitals", "vehicle"], driving: ["status", "map", "vitals", "vehicle"], interaction: ["map", "vitals"] };
    devSettings = settings;
    // for bench/hud-perf: open and close the HUD (the entrance and the exit) with any settings on top
    (window as unknown as { __hud?: unknown }).__hud = {
      open: (s?: Partial<HudSettings>) => openSurface("hud", { ...settings, ...s, styles: { ...settings.styles, ...s?.styles } }),
      close: () => closeSurface("hud"),
    };
    // ?slots: other resources in the vitals cluster (nuikit_voice's range and radio, a job's indicator)
    if (q.has("slots")) {
      setTimeout(
        () =>
          emit("nuikit:slots" as never, {
            vitals: {
              "nuikit_voice:range": { key: "range", resource: "nuikit_voice", order: 10, icon: "mic", label: "Voice", value: "Normal", hue: "neutral" },
              "nuikit_voice:radio": { key: "radio", resource: "nuikit_voice", order: 20, icon: "radio", label: "Radio", value: "3 MHz", hue: "info" },
              "police_job:duty": { key: "duty", resource: "police_job", order: 200, icon: "shield", label: "On duty", value: "Unit 12", hue: "police", level: 0.6 },
            },
          } as never),
        300,
      );
    }
    openSurface("hud", settings);
    // ?edit: the layout editor (/hud edit) over the HUD
    if (q.has("edit")) {
      const parts = { ...PRESET_PARTS[settings.layout ?? "compact"], ...settings.parts };
      openSurface("hud-edit", { parts, preset: settings.layout ?? "compact", base: PRESET_PARTS[settings.layout ?? "compact"], styles: DEV_STYLES });
    }
    const pop = q.get("pop");
    if (pop) {
      const [tone, by] = pop.split(":");
      setTimeout(() => emit("hud:pop" as never, { tone, by: Number(by ?? 10) } as never), 900);
    }
    if (f.changes) {
      const t = setTimeout(() => emit("nuikit:player", f.changes as never), 400);
      return () => clearTimeout(t);
    }
  }, []);
  const scene = q.get("scene") ?? "dusk";
  return (
    <>
      {frame && <FakeRadar frame={frame} />}
      <NuiDevtools {...mocks} scene={scene} />
    </>
  );
}
