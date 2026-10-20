// The game, faked for browser development. Press ` for the devtools.
//
// ?fixture=<name>   foot (default), low, idle, cruise, redline, reverse, damaged, plane, boat, wide
// &gauge=arc|bar|digital   force a gauge style (else the theme's --nk-gauge-style)
// &identity=<name>  try identity tokens before they ship: signal, vector (sets --nk-* on <html>)
// &theme=ember      a colourful TweakCN-style theme instead of stock neutral
// &scene=<url|name> the background (an image URL, or day / dusk / night)
// &heading=<deg>    the camera's bearing
// &rule=stage       the 0.5.0 layout rule (16:9 in the middle) instead of the game's edges
// &shape=circle     round minimap
import { applyTheme, emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect, useState } from "react";
import type { HudLayout, HudLocation, HudSettings, HudVehicle, MinimapFrame } from "./nui";

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

/** What client/minimap.lua computes (Minimap.layout): bottom-left, 15rem, 0.375rem band, 1.5rem in. */
function frameFor(layout: HudLayout, shape: MinimapFrame["shape"]): MinimapFrame {
  const w = innerWidth;
  const h = innerHeight;
  const rem = Math.min(32, Math.max(12, h * 0.014815));
  const size = 15 * rem;
  const x = layout.l * w + 1.5 * rem;
  const y = h - layout.b * h - 1.5 * rem - size;
  return { x: x / w, y: y / h, w: size / w, h: size / h, band: (0.375 * rem) / h, shape, framed: true };
}

const place: HudLocation = { visible: true, street: "Elgin Ave", crossing: "Vespucci Blvd", zone: "Pillbox Hill", postal: "7023", waypoint: 1850 };

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
  },
});

export default function Dev() {
  const [frame, setFrame] = useState<MinimapFrame | null>(null);
  useEffect(() => {
    const f = fixtures[q.get("fixture") ?? "foot"] ?? fixtures.foot!;
    const theme = THEMES[q.get("theme") ?? ""];
    if (theme) applyTheme(theme);
    for (const [k, v] of Object.entries(IDENTITIES[q.get("identity") ?? ""] ?? {})) document.documentElement.style.setProperty(k, v);

    const settings: HudSettings = {
      units: "mph",
      needs: true,
      vehicle: { gauge: (q.get("gauge") as "arc" | "bar" | "digital" | null) ?? "theme", seatbelt: "auto", cruise: "auto" },
      compass: { enabled: true, onFoot: false },
    };
    emit("nuikit:player", f.player as never);
    // client/layout.lua and minimap.lua do this in game
    const layout = layoutFor();
    emit("hud:layout", layout);
    const v = f.vehicle;
    const mf = frameFor(layout, q.get("shape") === "circle" ? "circle" : "square");
    emit("hud:minimap:frame", mf);
    const heading = Number(q.get("heading") ?? 32);
    emit("hud:minimap:heading", heading);
    emit("hud:minimap", { visible: !!v, heading });
    emit("hud:location", place);
    if (v) {
      emit("hud:vehicle", v);
      emit("hud:vehicle:speed", v.speed);
      if (v.rpm !== undefined) emit("hud:vehicle:rpm", v.rpm);
      if (v.heading !== undefined) emit("hud:vehicle:heading", v.heading);
      if (v.altitude !== undefined) emit("hud:vehicle:altitude", v.altitude);
      setFrame(mf);
    }
    openSurface("hud", settings);
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
