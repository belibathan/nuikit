import { LEVEL_NAMES, RULES, type CheckResult, type Finding } from "./check";
import { TOKENS, TOKEN_SOURCE } from "./tokens";

const tty = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
export const bold = paint("1");
export const dim = paint("2");
export const red = paint("31");
export const yellow = paint("33");
export const green = paint("32");
export const cyan = paint("36");

function levelBadge(r: CheckResult): string {
  if (r.level === null) return dim("no UI");
  const text = `level ${r.level} · ${LEVEL_NAMES[r.level]}`;
  return r.level === 3 ? green(text) : r.level === 0 ? red(text) : yellow(text);
}

function line(f: Finding): string {
  const mark = f.severity === "error" ? red("✗") : yellow("!");
  const lvl = f.level === 0 ? dim("adv") : dim(`L${f.level}`);
  return `  ${mark} ${lvl} ${cyan(f.rule.padEnd(19))} ${f.file}:${f.line}:${f.column}  ${f.message}`;
}

export function formatResult(r: CheckResult, opts: { verbose?: boolean; limit?: number } = {}): string {
  const limit = opts.verbose ? Infinity : opts.limit ?? 5;
  const out: string[] = [];
  const meta = [r.kind, r.page ? `${r.page.type} ${r.page.path}` : null, r.kind === "resource" ? `protocol ${r.protocol ?? "none"}` : null].filter(Boolean).join(" · ");
  out.push(`${bold(r.name)}  ${levelBadge(r)}  ${dim(meta)}`);
  const own = r.findings.filter((f) => !f.inherited);
  const inherited = r.findings.filter((f) => f.inherited);
  const byRule = new Map<string, Finding[]>();
  for (const f of own) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  const rules = [...byRule.keys()].sort((a, b) => {
    const la = RULES[a as keyof typeof RULES].level || 9;
    const lb = RULES[b as keyof typeof RULES].level || 9;
    return la - lb || a.localeCompare(b);
  });
  for (const rule of rules) {
    const list = byRule.get(rule)!;
    for (const f of list.slice(0, limit)) out.push(line(f));
    if (list.length > limit) out.push(dim(`    … ${list.length - limit} more ${rule} (--verbose to list all)`));
  }
  if (inherited.length) {
    const files = [...new Set(inherited.map((f) => f.file))].join(", ");
    if (opts.verbose) for (const f of inherited) out.push(line(f) + dim(" (synced)"));
    else out.push(`  ${yellow("!")} ${dim(`${inherited.length} in ${files}, synced from packages/create-nuikit/index.css.tpl: fix them there`)}`);
  }
  if (!r.findings.length) out.push(`  ${green("✓")} no findings`);
  if (r.skipped.length && opts.verbose) out.push(dim(`  n/a: ${r.skipped.join(", ")}`));
  return out.join("\n");
}

export function formatSummary(results: CheckResult[]): string {
  const graded = results.filter((r) => r.level !== null);
  const counts = [0, 1, 2, 3].map((l) => graded.filter((r) => r.level === l).length);
  const errors = results.reduce((n, r) => n + r.findings.filter((f) => f.severity === "error").length, 0);
  const warnings = results.reduce((n, r) => n + r.findings.filter((f) => f.severity === "warning").length, 0);
  return `${bold(`${results.length} resource${results.length === 1 ? "" : "s"}`)}: ${counts
    .map((c, l) => `${c} at level ${l}`)
    .join(", ")}${results.length - graded.length ? `, ${results.length - graded.length} without UI` : ""} · ${errors} errors, ${warnings} warnings`;
}

export function formatTokens(): string {
  const width = Math.max(...TOKENS.map((t) => t.name.length)) + 2;
  const out = [`${bold(`tokens v1`)} ${dim(`(${TOKENS.length}, from ${TOKEN_SOURCE}; docs/tokens.md)`)}`];
  let group = "";
  for (const t of TOKENS) {
    if (t.group !== group) {
      group = t.group;
      out.push("", dim(group));
    }
    out.push(`  --${t.name.padEnd(width)}${dim(t.type.padEnd(11))}${t.description}`);
  }
  return out.join("\n");
}
