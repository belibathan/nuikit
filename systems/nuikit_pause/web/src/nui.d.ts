// The contract between client/main.lua (+ config.lua) and this UI. docs/pause-3d.md has the details.
import "nuikit-core";

export type PauseButton = "resume" | "map" | "settings" | "keybinds" | "info" | "help" | "disconnect";
export type PauseView = "home" | "map" | "keys" | "info";

export interface PausePlace {
  id: string;
  label: string;
  category?: string;
  /** A lucide icon name (kebab-case). */
  icon?: string;
  x: number;
  y: number;
}

export interface PausePage {
  id: string;
  title: string;
  icon?: string;
  /** Plain text: blank lines between paragraphs, "- " list items. */
  body: string;
}

export interface PauseData {
  server: { name?: string; tagline?: string; logo?: string };
  links: { label: string; value: string }[];
  buttons: PauseButton[];
  help: { key: string; label: string }[];
  serverId?: number;
  /** The FiveM name, shown when no character is loaded. */
  playerName?: string;
  /** From the server once it answers; undefined until then. */
  players?: number;
  maxPlayers?: number;
  /** ms */
  ping?: number;
  /** Seconds since the resource started. */
  uptime?: number;
  /** Seconds until the next scheduled restart, if the server has a schedule. */
  restartIn?: number;
  /** Which parts of the bigger menu are on. Missing = the simple menu. */
  views?: { map: boolean; keys: boolean; info: boolean; preview: boolean };
  /** The stand-in is on screen (Home leaves its middle clear for it). */
  preview?: boolean;
  places?: PausePlace[];
  pages?: PausePage[];
  /** Browser fixtures only: start on this view. */
  view?: PauseView;
}

/**
 * Sent every frame the map moves: pin positions as 0–1 screen fractions, in data.places order
 * ([x0, y0, x1, y1, …], -1 = off screen), the player ([x, y, facing on screen in degrees]), the
 * waypoint ([x, y]) and the camera heading.
 */
export interface MapPins {
  at: number[];
  /** The blips, in pause:map:blips order: [x0, y0, x1, y1, …], -1 = off screen. */
  b?: number[];
  /** The camera's distance from the ground target, metres (zoom). */
  d?: number;
  you: [number, number, number] | false;
  wp: [number, number] | false;
  h: number;
}

/**
 * A blip another resource put on GTA's map, as client/map3d.lua reads it (sent when the map opens
 * and when the list changes). GTA can't read a blip's name back: `name` is only there when the
 * blip's owner passed it (exports.nuikit_pause:nameBlip); otherwise the UI names it by sprite.
 */
export interface MapBlip {
  /** the blip handle */
  id: number;
  x: number;
  y: number;
  z: number;
  /** sprite */
  s: number;
  /** GTA blip colour id */
  c: number;
  /** short-range (only near the player on the minimap) */
  sr: boolean;
  /** alpha 0–255 */
  a: number;
  /** 1 vehicle, 2 ped, 3 object, 4 coord… */
  e: number;
  route?: boolean;
  flash?: boolean;
  name?: string;
}

/** Sent a few times a second when it changes: what the panels show. */
export interface MapInfo {
  zone: string;
  street: string;
  topdown: boolean;
  waypoint: boolean;
}

export interface MapPick {
  ok: boolean;
  point?: { x: number; y: number; z: number };
  street?: string;
  crossing?: string;
  zone?: string;
  /** metres from the player */
  distance?: number;
}

export interface KeyBinding {
  label: string;
  group?: string;
  /** null / missing = not bound */
  key?: string | null;
}

type Ok = { req: void; res: { ok: boolean } };
type With<T> = { req: T; res: { ok: boolean } };

declare module "nuikit-core" {
  interface NuiSurfaces {
    pause: PauseData;
  }
  interface NuiEvents {
    "pause:map:pins": MapPins;
    "pause:map:info": MapInfo;
    "pause:map:blips": MapBlip[];
    "pause:keys": KeyBinding[];
  }
  interface NuiCallbacks {
    "pause:resume": Ok;
    "pause:map": Ok;
    "pause:settings": Ok;
    "pause:keybinds": Ok;
    "pause:disconnect": Ok;
    "pause:gamemap": Ok;
    "pause:view": { req: { view: PauseView }; res: { ok: boolean; preview?: boolean } };
    "pause:preview:frame": With<{ x: number; y: number; w: number; h: number }>;
    "pause:preview:rotate": With<{ dx: number }>;
    "pause:map:pan": With<{ dx: number; dy: number }>;
    "pause:map:rotate": With<{ dx: number; dy: number }>;
    "pause:map:zoom": With<{ delta: number }>;
    "pause:map:pick": { req: { u: number; v: number }; res: MapPick };
    "pause:map:focus": With<{ id: string }>;
    "pause:map:recenter": Ok;
    "pause:map:fly": With<{ x: number; y: number }>;
    "pause:map:topdown": With<{ on: boolean }>;
    "pause:map:waypoint": With<{ x: number; y: number } | { clear: true }>;
  }
}
