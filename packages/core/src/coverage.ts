/**
 * Coverage harness maths (bench/coverage/README.md): the share of a scripted session's UI calls nuikit drew.
 * Pure: `bench/coverage/run.mjs` feeds it the session log and `nuikit doctor json`'s `intents[]`.
 */

export type CoverageFramework = "qbox" | "qbcore" | "esx";

/** 0.7 targets (docs/architecture.md, "What universal means"). */
export const COVERAGE_TARGETS: Record<CoverageFramework, number> = { qbox: 0.9, qbcore: 0.75, esx: 0.75 };

export interface SessionStep {
  framework?: string;
  step?: number | string;
  source: string;
  intent: string;
  expected?: boolean;
}

/** The doctor's `intents[]` rows (or the raw source → intent → count map). */
export type DrawnCounts = { source: string; byIntent: Record<string, number> }[] | Record<string, Record<string, number>>;

export interface CoverageRow {
  source: string;
  intent: string;
  asked: number;
  drawn: number;
}

export interface CoverageResult {
  framework: string;
  target: number | null;
  asked: number;
  drawn: number;
  /** drawn / asked, 0 when nothing was asked. */
  pct: number;
  /** null when the framework has no target. */
  pass: boolean | null;
  byIntent: { intent: string; asked: number; drawn: number; pct: number }[];
  /** (source, intent) pairs the session asked for that nuikit drew fewer times than asked. */
  misses: CoverageRow[];
}

/** JSON lines; blank lines and lines that aren't a step with string source+intent are skipped. */
export function parseSessionLog(text: string): SessionStep[] {
  const out: SessionStep[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const v = JSON.parse(t) as SessionStep;
      if (v && typeof v.source === "string" && typeof v.intent === "string") out.push(v);
    } catch {
      /* not a step */
    }
  }
  return out;
}

function drawnMap(d: DrawnCounts): Map<string, number> {
  const m = new Map<string, number>();
  const rows = Array.isArray(d) ? d.map((r) => [r.source, r.byIntent] as const) : Object.entries(d);
  for (const [source, byIntent] of rows) for (const [intent, n] of Object.entries(byIntent)) m.set(`${source}\0${intent}`, n);
  return m;
}

/**
 * Pairs asked (steps with `expected !== false` for `framework`) with drawn (min(doctor count, asked), so a
 * chatty source can't buy back another's miss).
 */
export function computeCoverage(framework: string, session: SessionStep[], drawn: DrawnCounts): CoverageResult {
  const counts = drawnMap(drawn);
  const asked = new Map<string, CoverageRow>();
  for (const s of session) {
    if (s.expected === false || (s.framework && s.framework !== framework)) continue;
    const key = `${s.source}\0${s.intent}`;
    const row = asked.get(key) ?? { source: s.source, intent: s.intent, asked: 0, drawn: 0 };
    row.asked++;
    asked.set(key, row);
  }
  const rows = [...asked.entries()].map(([key, r]) => ({ ...r, drawn: Math.min(r.asked, counts.get(key) ?? 0) }));
  const per = new Map<string, { asked: number; drawn: number }>();
  for (const r of rows) {
    const p = per.get(r.intent) ?? { asked: 0, drawn: 0 };
    p.asked += r.asked;
    p.drawn += r.drawn;
    per.set(r.intent, p);
  }
  const totalAsked = rows.reduce((a, r) => a + r.asked, 0);
  const totalDrawn = rows.reduce((a, r) => a + r.drawn, 0);
  const pct = totalAsked ? totalDrawn / totalAsked : 0;
  const target = (COVERAGE_TARGETS as Record<string, number>)[framework] ?? null;
  return {
    framework,
    target,
    asked: totalAsked,
    drawn: totalDrawn,
    pct,
    pass: target === null ? null : totalAsked > 0 && pct >= target,
    byIntent: [...per.entries()].map(([intent, p]) => ({ intent, ...p, pct: p.asked ? p.drawn / p.asked : 0 })).sort((a, b) => a.intent.localeCompare(b.intent)),
    misses: rows.filter((r) => r.drawn < r.asked).sort((a, b) => b.asked - b.drawn - (a.asked - a.drawn)),
  };
}

/** The markdown a run writes to bench/coverage/results/. */
export function formatCoverage(r: CoverageResult, meta: { date: string; version?: string }): string {
  const pc = (x: number) => `${(x * 100).toFixed(1)}%`;
  const L: string[] = [];
  L.push(`# Coverage: ${r.framework}, ${meta.date}${meta.version ? `, nuikit ${meta.version}` : ""}`, "");
  L.push(`**${pc(r.pct)}** (${r.drawn}/${r.asked} drawn/asked)${r.target === null ? ", no target" : `, target ${pc(r.target)}: ${r.pass ? "PASS" : "FAIL"}`}`, "");
  L.push("| Intent | Asked | Drawn | % |", "|---|---|---|---|");
  for (const i of r.byIntent) L.push(`| ${i.intent} | ${i.asked} | ${i.drawn} | ${pc(i.pct)} |`);
  L.push("", "## Misses", "");
  if (!r.misses.length) L.push("None.");
  else for (const m of r.misses) L.push(`- ${m.source}: ${m.intent} (asked ${m.asked}, drawn ${m.drawn})`);
  return L.join("\n") + "\n";
}
