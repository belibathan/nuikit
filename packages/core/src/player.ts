/**
 * The player, in one shape for every framework. lua/bridge.lua detects Qbox, QBCore, ESX or
 * none and sends `nuikit:player` whenever something changes.
 */
import { onNui } from "./index";

export interface NuiPlayerJob {
  name: string;
  label?: string;
  grade: number;
  gradeLabel?: string;
  onDuty?: boolean;
}

export interface NuiPlayer {
  /** A character is loaded (false on the character screen and after logout). */
  loaded: boolean;
  /** citizenid (Qbox/QBCore) or identifier (ESX). */
  id?: string;
  name?: string;
  /** 0–100 */
  health: number;
  /** 0–100 */
  armor: number;
  /** 0–100, when the framework tracks it. */
  hunger?: number;
  thirst?: number;
  stress?: number;
  cash?: number;
  bank?: number;
  job?: NuiPlayerJob;
  gang?: Omit<NuiPlayerJob, "onDuty">;
  /** Dead or in last stand. */
  dead: boolean;
  voice: {
    /** Proximity range in meters (pma-voice). */
    range?: number;
    /** The proximity mode's name from the voice resource's config, e.g. "Whisper", "Normal", "Shouting". */
    mode?: string;
    talking: boolean;
    /** Radio channel, when on one. */
    radio?: number;
  };
}

/** What the UI shows before Lua's first message (and in the browser until you fire one). */
export const DEFAULT_PLAYER: NuiPlayer = { loaded: false, health: 100, armor: 0, dead: false, voice: { talking: false } };

let player: NuiPlayer = DEFAULT_PLAYER;
const listeners = new Set<() => void>();
let subscribed = false;

function ensure() {
  if (subscribed) return;
  subscribed = true;
  onNui("nuikit:player" as never, (next: NuiPlayer) => {
    player = { ...DEFAULT_PLAYER, ...next, voice: { ...DEFAULT_PLAYER.voice, ...next?.voice } };
    listeners.forEach((l) => l());
  });
}

export function getPlayer(): NuiPlayer {
  ensure();
  return player;
}

export function onPlayer(listener: () => void): () => void {
  ensure();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** For tests. */
export function __resetPlayer(): void {
  player = DEFAULT_PLAYER;
  listeners.clear();
  subscribed = false;
}
