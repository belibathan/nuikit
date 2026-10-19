import { useEffect, useReducer } from "react";

/**
 * The game's loading screen messages (docs/loadscreen-events.md), folded into what the screen shows.
 * The game posts `{ eventName, ...fields }`; SendLoadingScreenMessage posts a JSON string.
 */
export type Phase = "connecting" | "core" | "beforeMap" | "map" | "afterMap" | "session" | "finishing" | "ready";

export interface LoadState {
  /** Overall progress, 0–1, from loadProgress. Never goes backwards. */
  fraction: number;
  phase: Phase;
  /** Current item within the phase: an init function or a data file. */
  detail?: string;
  idx: number;
  count: number;
  /** Last onLogLine message ("Awaiting scripts" and friends). */
  log?: string;
}

export const initialLoad: LoadState = { fraction: 0, phase: "connecting", idx: 0, count: 0 };

export const PHASES: Record<Phase, string> = {
  connecting: "Connecting",
  core: "Starting the game",
  beforeMap: "Preparing the world",
  map: "Loading map data",
  afterMap: "Building the city",
  session: "Joining the session",
  finishing: "Finishing up",
  ready: "Ready",
};

const phaseOf = (type: unknown, fallback: Phase): Phase => {
  const t = String(type ?? "");
  if (t.includes("CORE")) return "core";
  if (t.includes("BEFORE_MAP")) return "beforeMap";
  if (t.includes("AFTER_MAP")) return "afterMap";
  if (t.includes("SESSION")) return "session";
  return fallback;
};

/** "platform:/data/cdimages/scaleform_frontend.rpf" → "scaleform_frontend.rpf" */
const fileName = (name: unknown) => String(name ?? "").split(/[\\/]/).pop() || undefined;

type Msg = { eventName: string } & Record<string, unknown>;

export function reduceLoad(s: LoadState, m: Msg): LoadState {
  if (s.phase === "ready" && m.eventName !== "loadProgress") return s;
  switch (m.eventName) {
    case "loadProgress": {
      const f = Number(m.loadFraction);
      if (!Number.isFinite(f)) return s;
      const fraction = Math.max(s.fraction, Math.min(1, f));
      const phase = fraction >= 1 && s.phase !== "ready" ? "finishing" : s.phase;
      return { ...s, fraction, phase };
    }
    case "startInitFunction":
      return { ...s, phase: phaseOf(m.type, s.phase), detail: undefined, idx: 0, count: 0 };
    case "startInitFunctionOrder":
      return { ...s, phase: phaseOf(m.type, s.phase), idx: 0, count: Number(m.count) || 0 };
    case "initFunctionInvoking":
      return { ...s, phase: phaseOf(m.type, s.phase), detail: String(m.name ?? ""), idx: (Number(m.idx) || 0) + 1 };
    case "initFunctionInvoked":
      return s;
    case "endInitFunction":
      return { ...s, detail: undefined, idx: 0, count: 0 };
    case "startDataFileEntries":
      return { ...s, phase: "map", detail: undefined, idx: 0, count: Number(m.count) || 0 };
    case "onDataFileEntry":
      return { ...s, phase: "map", detail: fileName(m.name), idx: Math.min(s.idx + 1, s.count || Infinity) };
    case "performMapLoadFunction":
      return { ...s, phase: "map", detail: `Map chunk ${Number(m.idx) || 0}` };
    case "endDataFileEntries":
      return { ...s, detail: undefined, idx: 0, count: 0 };
    case "onLogLine":
      return { ...s, log: String(m.message ?? "") || s.log, phase: s.fraction >= 1 ? "finishing" : s.phase };
    case "nuikit:ready":
      return { ...s, fraction: 1, phase: "ready", detail: undefined, idx: 0, count: 0 };
    default:
      return s;
  }
}

/** Accepts the game's flat messages, SendLoadingScreenMessage strings, and devtools' { action, data }. */
export function toMsg(raw: unknown): Msg | null {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.eventName === "string") return o as Msg;
  if (typeof o.action === "string") {
    const data = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : {};
    return { ...data, eventName: o.action };
  }
  return null;
}

export function useLoadProgress(): LoadState {
  const [state, dispatch] = useReducer(reduceLoad, initialLoad);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = toMsg(e.data);
      if (m) dispatch(m);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return state;
}
