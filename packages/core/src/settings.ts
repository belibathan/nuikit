// nk.settings, page side (docs/settings.md): read any resource's declared settings rows and drive the live
// draft → save → reset loop through the nuikit resource (https://nuikit/settings*). The resource's own page
// also hears `nuikit:settings` from its Lua on every change. In the browser (dev) the ops run on a local copy
// of the sections you pass to `mockSettings`, with the same rules as the Lua store.

import { isBrowser } from "./index";

export type SettingValue = string | number | boolean;

export interface SettingRow {
  key: string;
  label: string;
  description?: string;
  /** A choice: values with labels. */
  options?: (SettingValue | { value: SettingValue; label?: string })[];
  /** A number: [min, max, step?]. */
  range?: [number, number, number?];
  /** A switch. */
  toggle?: true;
  /** A short string (nk.settings.register `text`). */
  text?: true;
  maxLength?: number;
  default: SettingValue;
  /** A server feature flag that can hide the row (`setr nuikit_flag_<name> 0`). Hidden rows aren't sent. */
  flag?: string;
  /** Optional heading the page groups rows under. */
  group?: string;
}

export interface SettingsSection {
  resource: string;
  label: string;
  /** Icon name from nk.settings.register. */
  icon?: string;
  version: number;
  rows: SettingRow[];
  presets: { id: string; label: string }[];
  values: Record<string, SettingValue>;
  /** A draft is being previewed (not saved yet). */
  draft: boolean;
}

type Op = "draft" | "save" | "cancel" | "reset" | "preset";

async function post<T>(name: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`https://nuikit/${name}`, { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

// ── browser stand-in: the same rules as packages/core/lua/settings.lua

let mock: { sections: SettingsSection[]; saved: Map<string, Record<string, SettingValue>>; draft: Map<string, Record<string, SettingValue>>; presets: Map<string, Record<string, Record<string, SettingValue>>> } | null = null;

/** Dev only: the sections the browser pretends the server has, with each preset's patch. */
export function mockSettings(sections: (Omit<SettingsSection, "values" | "draft" | "presets"> & { presets?: { id: string; label: string; patch: Record<string, SettingValue> }[] })[]): void {
  mock = { sections: [], saved: new Map(), draft: new Map(), presets: new Map() };
  for (const s of sections) {
    mock.presets.set(s.resource, Object.fromEntries((s.presets ?? []).map((p) => [p.id, p.patch])));
    mock.sections.push({ ...s, presets: (s.presets ?? []).map(({ id, label }) => ({ id, label })), values: {}, draft: false });
    mock.saved.set(s.resource, {});
  }
  for (const s of mock.sections) s.values = mergeSettings(s.rows, {}, undefined);
}

/** A value the row accepts, or undefined (ranges clamp and snap, options must be listed). */
export function normalizeSetting(row: SettingRow, value: unknown): SettingValue | undefined {
  if (row.options) return row.options.map((o) => (typeof o === "object" ? o.value : o)).find((v) => v === value);
  if (row.text) return typeof value === "string" ? value.slice(0, row.maxLength ?? 64) : undefined;
  if (row.range) {
    let n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n)) return undefined;
    const [lo, hi, step] = row.range;
    n = Math.min(hi, Math.max(lo, n));
    if (step && step > 0) n = lo + Math.round((n - lo) / step) * step;
    return Math.round(n * 1e6) / 1e6;
  }
  return typeof value === "boolean" ? value : undefined;
}

/** Defaults, then saved, then the draft. */
export function mergeSettings(rows: SettingRow[], saved: Record<string, unknown>, draft?: Record<string, unknown>): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {};
  for (const r of rows) {
    out[r.key] = r.default;
    for (const layer of [saved, draft]) {
      const v = layer && layer[r.key] !== undefined ? normalizeSetting(r, layer[r.key]) : undefined;
      if (v !== undefined) out[r.key] = v;
    }
  }
  return out;
}

function mockOp(op: Op, resource: string, arg?: unknown): Record<string, SettingValue> | null {
  const s = mock?.sections.find((x) => x.resource === resource);
  if (!mock || !s) return null;
  const saved = mock.saved.get(resource)!;
  let draft = mock.draft.get(resource);
  if (op === "preset") return mockOp("draft", resource, mock.presets.get(resource)?.[String(arg)] ?? {});
  if (op === "draft") mock.draft.set(resource, (draft = { ...draft, ...(arg as Record<string, SettingValue>) }));
  if (op === "cancel") mock.draft.delete(resource), (draft = undefined);
  if (op === "save") Object.assign(saved, draft ?? {}), mock.draft.delete(resource), (draft = undefined);
  if (op === "reset") {
    const keys = Array.isArray(arg) && arg.length ? (arg as string[]) : Object.keys(saved);
    for (const k of keys) delete saved[k], draft && delete draft[k];
    if (!Array.isArray(arg) || !arg.length) mock.draft.delete(resource), (draft = undefined);
  }
  s.values = mergeSettings(s.rows, saved, draft);
  s.draft = !!draft;
  return s.values;
}

// ── the API

/** Every resource's settings (or one resource's). */
export async function loadSettings(resource?: string): Promise<SettingsSection[]> {
  if (isBrowser()) return (mock?.sections ?? []).filter((s) => !resource || s.resource === resource).map((s) => ({ ...s, values: { ...s.values } }));
  const r = await post<{ sections?: SettingsSection[] }>("settings", resource ? { resource } : {});
  return r?.sections ?? [];
}

async function op(name: Op, resource: string, extra: Record<string, unknown>, arg?: unknown): Promise<Record<string, SettingValue> | null> {
  if (isBrowser()) return mockOp(name, resource, arg);
  const r = await post<{ values?: Record<string, SettingValue> }>(`settings:${name}`, { resource, ...extra });
  return r?.values ?? null;
}

/** Preview a change (the owner resource applies it live; nothing is saved). */
export const draftSettings = (resource: string, patch: Record<string, SettingValue>) => op("draft", resource, { patch }, patch);
/** Keep the draft. */
export const saveSettings = (resource: string) => op("save", resource, {});
/** Drop the draft. */
export const cancelSettings = (resource: string) => op("cancel", resource, {});
/** Back to the defaults (all rows, or the listed keys), saved at once. */
export const resetSettings = (resource: string, keys?: string[]) => op("reset", resource, keys ? { keys } : {}, keys);
/** Apply a preset as a draft. */
export const applySettingsPreset = (resource: string, preset: string) => op("preset", resource, { preset }, preset);
