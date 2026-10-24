// The lever model for the site: everything the studio and the component pages show about a lever comes from the
// spec (packages/core/src/tokens.generated.ts: LEVER_ROWS, ANATOMY). Nothing here names a token.
import { ANATOMY, LEVER_ROWS, type LeverRow } from "../../../../packages/core/src/tokens.generated";

export { LEVER_ROWS };
export type { LeverRow };

const TIERS = ["identity", "semantic", "component"] as const;
export const TIER_TITLE = { identity: "Identity", semantic: "Semantic", component: "Components" } as const;

const title = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1).replace(/-/g, " ") : "Palette");

export type LeverGroup = { key: string; title: string; rows: LeverRow[]; parts?: { part: string; rows: LeverRow[] }[] };

/** Rows of one tier as the studio lists them: identity and semantic by group (scope), component by component then part. */
export function groupsOf(tier: (typeof TIERS)[number]): LeverGroup[] {
  const rows = LEVER_ROWS.filter((r) => r.tier === tier);
  const scopes = [...new Set(rows.map((r) => r.scope))];
  return scopes.map((scope) => {
    const mine = rows.filter((r) => r.scope === scope);
    return { key: `${tier}:${scope}`, title: title(scope), rows: mine, parts: tier === "component" ? partsOf(mine) : undefined };
  });
}

/** Component rows split by part (the root first), in the spec's order. */
export function partsOf(rows: LeverRow[]) {
  const parts = [...new Set(rows.map((r) => r.part ?? ""))];
  return parts.sort((a, b) => Number(b === "") - Number(a === "")).map((part) => ({ part, rows: rows.filter((r) => (r.part ?? "") === part) }));
}

/** The component-tier levers of one component (registry item name = spec scope). */
export const componentRows = (name: string) => LEVER_ROWS.filter((r) => r.tier === "component" && r.scope === name);

/** The component's data-slot list from the spec's anatomy map. */
export const anatomyOf = (name: string): readonly string[] => (ANATOMY as Record<string, readonly string[]>)[name] ?? [];

export const TIER_ORDER = TIERS;

export const EASES = ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "cubic-bezier(0.16, 1, 0.3, 1)", "cubic-bezier(0.4, 0, 1, 1)", "cubic-bezier(0.34, 1.56, 0.64, 1)"];

export type Control =
  | { kind: "slider"; min: number; max: number; step: number; unit: string; value: number }
  | { kind: "color" }
  | { kind: "select"; options: readonly string[] }
  | { kind: "font" }
  | { kind: "text" };

const NUM = /^(-?\d*\.?\d+)(rem|px|em|ms|s|deg)?$/;

/** How a lever is edited, by its type and its current (or default) value. */
export function controlFor(row: LeverRow, value: string | undefined): Control {
  const v = (value ?? row.default).trim();
  const m = NUM.exec(v);
  switch (row.type) {
    case "color":
      return { kind: "color" };
    case "font":
      return { kind: "font" };
    case "keyword":
      return row.values ? { kind: "select", options: row.values } : { kind: "text" };
    case "ease":
      return { kind: "select", options: EASES.includes(v) ? EASES : [v, ...EASES] };
    case "angle": {
      const [min, max] = row.range ?? [-45, 45];
      return { kind: "slider", min, max, step: 1, unit: "deg", value: m ? parseFloat(m[1]!) : 0 };
    }
    case "time": {
      const n = m ? parseFloat(m[1]!) * (m[2] === "s" ? 1000 : 1) : 0;
      return { kind: "slider", min: row.range?.[0] ?? 0, max: row.range?.[1] ?? Math.max(600, Math.ceil((n * 2) / 100) * 100), step: 10, unit: "ms", value: n };
    }
    case "length": {
      if (!m) return { kind: "text" };
      const n = parseFloat(m[1]!);
      const unit = m[2] ?? (n === 0 ? "rem" : "");
      if (unit !== "rem" && unit !== "px" && unit !== "em") return { kind: "text" };
      const px = unit === "px";
      const max = row.range?.[1] ?? (px ? Math.max(8, Math.ceil(n * 3)) : Math.max(1, Math.ceil(n * 3 * 4) / 4));
      return { kind: "slider", min: row.range?.[0] ?? 0, max, step: px ? 1 : 0.0625, unit, value: n };
    }
    case "number": {
      const n = m ? parseFloat(m[1]!) : parseFloat(v);
      if (!Number.isFinite(n)) return { kind: "text" };
      const [min, max] = row.range ?? [0, Math.max(1, Math.ceil(n * 3))];
      const span = max - min;
      return { kind: "slider", min, max, step: span <= 2 ? 0.01 : span <= 20 ? 0.05 : 1, unit: "", value: n };
    }
    default:
      return { kind: "text" };
  }
}

/** A slider position as the lever's value, with its unit. */
export function sliderValue(c: Extract<Control, { kind: "slider" }>, n: number): string {
  const decimals = String(c.step).split(".")[1]?.length ?? 0;
  const text = decimals ? n.toFixed(decimals).replace(/\.?0+$/, "") : String(Math.round(n));
  return `${text || "0"}${c.unit}`;
}
