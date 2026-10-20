import type { CompiledTheme } from "nuikit-core";
import { useSyncExternalStore } from "react";

export type Tip = string | { title?: string; text: string };
export interface Link {
  label: string;
  url?: string;
}

/** What server/main.lua hands over under `nuikit` (docs/loadscreen-events.md). */
export interface LoadingHandover {
  /** The compiled server theme (nuikit resource), or raw theme.css from an older one. */
  theme?: string | CompiledTheme | null;
  serverName?: string;
  tagline?: string;
  playerName?: string;
  logo?: string | null;
  tips?: Tip[];
  tipInterval?: number;
  backgrounds?: string[];
  backgroundInterval?: number;
  music?: string[];
  musicVolume?: number;
  links?: Link[];
}

declare global {
  interface Window {
    /** Merged deferrals.handover() data of every resource, injected by the game before the page runs. */
    nuiHandoverData?: { nuikit?: LoadingHandover } & Record<string, unknown>;
  }
}

// Lua turns an empty table into {} instead of [], so lists are normalised here.
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : v && typeof v === "object" ? (Object.values(v) as T[]) : []);

function read(): LoadingHandover {
  const raw = (typeof window !== "undefined" && window.nuiHandoverData?.nuikit) || {};
  return {
    ...raw,
    tips: list<Tip>(raw.tips),
    backgrounds: list<string>(raw.backgrounds),
    music: list<string>(raw.music),
    links: list<Link>(raw.links),
  };
}

let current = read();
const listeners = new Set<() => void>();

/** Browser development only: replace the handover (the game sets it once, before the page runs). */
export function setHandover(data: LoadingHandover | undefined) {
  window.nuiHandoverData = { ...window.nuiHandoverData, nuikit: data };
  current = read();
  listeners.forEach((l) => l());
}

export function useHandover(): LoadingHandover {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
