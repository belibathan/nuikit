/** One option as ox_target's Lua sends it. Only the fields the UI reads are typed. */
export interface TargetOption {
  label?: string;
  icon?: string;
  iconColor?: string;
  hide?: boolean;
  name?: string;
  openMenu?: string;
  menuName?: string;
  [key: string]: unknown;
}

/** A visible row, carrying the exact `select` payload Lua expects. */
export interface Row {
  key: string;
  /** Source key from `options` (`__global`, `model`, …) or `'zones'`. */
  type: string;
  /** 1-based index in its own array as received (hidden options keep their slot). */
  id: number;
  /** 1-based zone index for zone options, otherwise null. */
  zoneId: number | null;
  option: TargetOption;
  back: boolean;
  submenu: boolean;
}

/** A run of rows from the same source, drawn with a separator between groups. */
export interface Group {
  key: string;
  rows: Row[];
}

/**
 * Lua's JSON encoder may send an empty table as `{}` and a holey array as an object with numeric
 * keys. Return the values in index order, with their 1-based index.
 */
function entries<T>(value: unknown): [number, T][] {
  if (Array.isArray(value)) return value.map((v, i) => [i + 1, v as T]);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => /^\d+$/.test(k))
      .map(([k, v]) => [Number(k), v as T] as [number, T])
      .sort((a, b) => a[0] - b[0]);
  }
  return [];
}

function row(type: string, id: number, zoneId: number | null, option: unknown): Row | null {
  if (!option || typeof option !== "object") return null;
  const o = option as TargetOption;
  if (o.hide) return null;
  const back = o.name === "builtin:goback";
  return { key: `${type}:${zoneId ?? ""}:${id}`, type, id, zoneId, option: o, back, submenu: !back && typeof o.openMenu === "string" && o.openMenu !== "" };
}

/** Turn a `setTarget` payload into visible groups: `options` keys in arrival order, then zones. */
export function toGroups(options: unknown, zones: unknown): Group[] {
  const groups: Group[] = [];
  let back: Row | null = null;
  if (options && typeof options === "object" && !Array.isArray(options)) {
    for (const [type, list] of Object.entries(options as Record<string, unknown>)) {
      const rows: Row[] = [];
      for (const [id, o] of entries<unknown>(list)) {
        const r = row(type, id, null, o);
        if (!r) continue;
        // The go-back option leads the list on its own, whichever key it arrived under.
        if (r.back && !back) back = r;
        else rows.push(r);
      }
      if (rows.length) groups.push({ key: type, rows });
    }
  }
  for (const [zoneId, zone] of entries<unknown>(zones)) {
    const rows: Row[] = [];
    for (const [id, o] of entries<unknown>(zone)) {
      const r = row("zones", id, zoneId, o);
      if (r) rows.push(r);
    }
    if (rows.length) groups.push({ key: `zone:${zoneId}`, rows });
  }
  if (back) groups.unshift({ key: "back", rows: [back] });
  return groups;
}

/** The `select` callback body: `[type, id, zoneId|null]`. */
export const selectPayload = (r: Row) => [r.type, r.id, r.zoneId] as const;
