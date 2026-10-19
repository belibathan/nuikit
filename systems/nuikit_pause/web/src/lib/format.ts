export const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** 850 m, 1.2 km, 14 km */
export function distance(m: number | undefined) {
  if (m === undefined || !Number.isFinite(m)) return "—";
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

/** 45 min, 3 h 12 min, 2 d 4 h */
export function duration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} h ${m % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase();
}

export const list = <T,>(v: T[] | undefined | Record<string, never>): T[] => (Array.isArray(v) ? v : []);

/** Plain-text pages: blank lines split paragraphs; lines starting "- " are list items. */
export function blocks(body: string): ({ kind: "p"; text: string } | { kind: "ul"; items: string[] })[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return { kind: "ul" as const, items: lines.map((l) => l.slice(2)) };
      return { kind: "p" as const, text: lines.join(" ") };
    });
}
