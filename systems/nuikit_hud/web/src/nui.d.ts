// The contract between client/*.lua (+ the nuikit bridge) and this UI.
import "nuikit-core";

export type VehicleKind = "car" | "bike" | "boat" | "heli" | "plane";
export type SpeedUnits = "mph" | "kmh" | "kts";
export type Gear = number | "R" | "N";

/** Sent when a field changes (gear, fuel, damage, lights…), not as the vehicle speeds up. */
export interface HudVehicle {
  kind: VehicleKind;
  /** the unit `speed` is in */
  units: SpeedUnits;
  engineOn: boolean;
  /** rpm (0.2 idle … 1) where the red zone starts */
  redline: number;
  /** 0–100 */
  engine: number;
  /** 0–100 */
  body: number;
  /** 0–100; absent when fuel is hidden */
  fuel?: number;
  /** faster than 10 (mph or km/h): the seatbelt warning shows */
  moving: boolean;
  gear?: Gear;
  /** the top gear */
  gears?: number;
  handbrake?: boolean;
  /** bitmask: 1 left, 2 right, 3 hazards */
  indicators?: number;
  lights?: "off" | "low" | "high";
  /** absent until a seatbelt resource reports it (hooks) */
  seatbelt?: boolean;
  cruise?: boolean;
  cruiseSpeed?: number;
  /** aircraft */
  altUnits?: "ft" | "m";
  landingGear?: "up" | "down" | "moving";
  /** where the live values start; then they follow hud:vehicle:speed / :rpm / :heading / :altitude */
  speed: number;
  rpm?: number;
  heading?: number;
  altitude?: number;
}

/** Where minimap.lua put GTA's radar: the frame's rectangle as 0–1 screen fractions. */
export interface MinimapFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  /** frame thickness, as a fraction of the screen height */
  band: number;
  shape: "square" | "circle";
  /** false: nuikit doesn't frame the radar (Config.minimap.enabled = false); the rect is GTA's own */
  framed?: boolean;
  /** the layout preset the map was placed for */
  preset?: HudPreset;
}

export type HudPreset = "compact" | "classic";

export type HudCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
/** a part's place: a corner, on the map (compact: the column; classic: above or beside it), or hidden */
export interface HudPart {
  at: HudCorner | "map" | false;
  order: number;
}
export interface HudParts {
  map: HudCorner;
  location: HudPart;
  wallet: HudPart;
  vitals: HudPart;
  ammo: HudPart;
  vehicle: HudPart;
}

/** /hud edit: the placement on screen, the preset and its own placement (the editor's "preset" button) */
export interface HudEditData {
  parts: HudParts;
  preset: HudPreset;
  base: HudParts;
}

/** The weapon in hand (client/weapon.lua); false when unarmed or holding something without ammo. */
export interface HudWeapon {
  /** rounds in the clip; for thrown weapons, how many are left */
  clip: number;
  /** rounds outside the clip; absent for thrown weapons */
  reserve?: number;
  kind: "pistol" | "smg" | "rifle" | "shotgun" | "sniper" | "heavy" | "thrown";
}

/** Whether GTA's radar is on screen. */
export interface MinimapState {
  visible: boolean;
  /** Config.radar wants the radar now, shown or not (a menu can cut it): what the layout follows */
  wanted?: boolean;
  /** compass bearing when this was sent (0 north, 90 east); then it follows `hud:minimap:heading` */
  heading: number;
}

/** GTA's HUD area for this screen and safe zone: insets from each edge, as fractions of the screen. */
export interface HudLayout {
  l: number;
  r: number;
  t: number;
  b: number;
  aspect: number;
  source: "game" | "stage";
}

export interface HudLocation {
  visible: boolean;
  street?: string;
  crossing?: string;
  zone?: string;
  postal?: string;
  /** metres to the waypoint, rounded to what is shown */
  waypoint?: number;
  /** the waypoint's compass bearing from the player (0 north, 90 east), in 5° steps */
  bearing?: number;
}

export type VitalMode = "auto" | "always" | false;
export type WalletMode = "always" | "change" | false;

export interface HudSettings {
  /** where the parts go (Config.layout); absent from a 0.6 client: classic */
  layout?: HudPreset;
  /** where each part goes (client/layout.lua Layout.parts: the preset with Config.parts on top); absent: the preset's */
  parts?: Partial<HudParts>;
  /** the ammo readout (Config.ammo) */
  ammo?: boolean;
  units: "mph" | "kmh";
  needs: boolean;
  voice?: boolean;
  vitals?: {
    enabled?: boolean;
    health?: VitalMode;
    armor?: VitalMode;
    hunger?: VitalMode;
    thirst?: VitalMode;
    stress?: VitalMode;
    low?: number;
    high?: number;
    linger?: number;
    /** a callout with the name and the change: on every change (default), only past a threshold, or never */
    pop?: false | "change" | "threshold";
  };
  wallet?: { cash?: WalletMode; bank?: WalletMode; job?: boolean };
  vehicle?: {
    gauge?: "theme" | "arc" | "bar" | "digital";
    shiftLight?: boolean;
    rpm?: boolean;
    fuel?: boolean;
    damage?: boolean;
    lights?: boolean;
    indicators?: boolean;
    handbrake?: boolean;
    seatbelt?: "auto" | boolean;
    cruise?: "auto" | boolean;
    /** how many times a second the speed number may change (default 10; the value is smoothed too) */
    speedRate?: number;
  };
  location?: boolean;
  compass?: { enabled?: boolean; onFoot?: boolean; /** compact: cardinals and heading on the map ring (Config.minimap.compass) */ ring?: boolean };
  frame?: boolean;
  /** GTA's radar slides with the HUD's exit and entrance (Config.minimap.slide): the ring slides with it */
  slide?: boolean;
  /** the speedometer's plate behind the round ring (Config.minimap.halo); absent: on */
  halo?: boolean;
  /** nuikit's waypoint tag on the round ring (Config.minimap.waypointTag); absent: off */
  waypointTag?: boolean;
}

declare module "nuikit-core" {
  interface NuiEvents {
    /** false when the player leaves the vehicle */
    "hud:vehicle": HudVehicle | false;
    /** live (NUI.stream): speed in the vehicle's units, whole numbers, ≤30 a second while it changes */
    "hud:vehicle:speed": number;
    /** live: rpm 0–1 to 0.01 */
    "hud:vehicle:rpm": number;
    /** live: the vehicle's compass bearing (aircraft, boats), whole degrees */
    "hud:vehicle:heading": number;
    /** live: altitude above sea level (aircraft), whole ft or m, ≤15 a second */
    "hud:vehicle:altitude": number;
    "hud:minimap:frame": MinimapFrame;
    "hud:minimap": MinimapState;
    /** live: the camera's compass bearing (0.1°) */
    "hud:minimap:heading": number;
    "hud:layout": HudLayout;
    "hud:location": HudLocation;
    "hud:weapon": HudWeapon | false;
  }
  interface NuiCallbacks {
    "hud:minimap:ready": { req: Record<string, never>; res: { ok: boolean } };
    "hud:ready": { req: Record<string, never>; res: { ok: boolean } };
    "hud:parts:save": { req: { parts: HudParts }; res: { ok: boolean } };
    "hud:parts:reset": { req: Record<string, never>; res: { ok: boolean } };
  }
  interface NuiSurfaces {
    hud: HudSettings;
    "hud-edit": HudEditData;
  }
}
