export type OverlayMode = "default" | "always" | "never";

export interface UserData {
  name?: string;
  favourite?: number[];
  overlaySizeMultiplier?: number;
  radioSizeMultiplier?: number;
  allowMovement?: boolean;
  enableClicks?: boolean;
  playerlist?: { show?: boolean; coords?: { x: number; y: number } };
  radio?: { coords?: { x: number; y: number } };
}

export interface RadioData {
  radioId?: string | false;
  onRadio?: boolean;
  channel?: number;
  volume?: number;
  favourite?: number[];
  recomended?: number[];
  maxChannel?: number;
  userData?: UserData;
  time?: string;
  street?: string;
  locale?: Record<string, unknown>;
  channelName?: Record<string, string>;
  insideJammerZone?: boolean;
  battery?: number;
  overlay?: OverlayMode;
}

export interface Member {
  name: string;
  isTalking: boolean;
}

export type PlayerList = Record<string, Member>;

/** pma-voice's muted table: an array (index id - 1) or an object keyed by id. */
export type MutedList = boolean[] | Record<string, boolean> | null | undefined;

export function isMuted(list: MutedList, id: string | number): boolean {
  if (!list) return false;
  const n = Number(id);
  if (Array.isArray(list)) return !!list[n - 1];
  return !!list[String(n)];
}

export const nums = (v: unknown): number[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []).map(Number).filter((n) => Number.isFinite(n));

export function normaliseList(v: unknown): PlayerList {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: PlayerList = {};
  for (const [id, m] of Object.entries(v as Record<string, Partial<Member>>)) {
    if (m && typeof m === "object") out[id] = { name: String(m.name ?? id), isTalking: !!m.isTalking };
  }
  return out;
}
