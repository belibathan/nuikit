/**
 * The arsenal rule (`arsenal/unknown`, `arsenal/legacy`): a resource uses nuikit only through published, named parts.
 * The list is nuikit-core's arsenal.json (generated from packages/core/src/spec/api), never a copy kept here.
 *
 *   Lua    every `nk.x.y` / `NUI.x.y` read must be a declared entry, a domain, or a legacy name (warned with its replacement)
 *   events every 'nuikit:…' string in Lua or a page must be a declared event (canonical or wire name)
 *
 * Warnings (level 0) first: the current violators are the burn-down.
 */
import { createRequire } from "node:module";
import type { Span } from "./lex";

type Report = (rule: "arsenal/unknown" | "arsenal/legacy", offset: number, message: string) => void;
interface Arsenal {
  domains: { lua: string; entries: { lua?: string; kind: string }[]; events: { name: string; wire?: string }[]; legacy: { old: string; now: string; removeIn: string }[] }[];
}

const require = createRequire(import.meta.url);
let cache: { lua: Set<string>; tables: Set<string>; legacy: Map<string, { now: string; removeIn: string }>; events: string[]; patterns: RegExp[] } | null = null;

function load() {
  if (cache) return cache;
  const a = require("nuikit-core/arsenal.json") as Arsenal;
  const lua = new Set<string>();
  const tables = new Set<string>(["nk", "NUI"]);
  const legacy = new Map<string, { now: string; removeIn: string }>();
  const events: string[] = [];
  const patterns: RegExp[] = [];
  for (const d of a.domains) {
    tables.add(`nk.${d.lua}`);
    for (const e of d.entries) if (e.lua?.startsWith("nk.")) lua.add(e.lua);
    for (const l of d.legacy) legacy.set(l.old.replace(/^NUI\./, "nk."), { now: l.now, removeIn: l.removeIn });
    for (const ev of d.events)
      for (const n of [ev.name, ev.wire].filter((x): x is string => !!x)) {
        if (n.includes("{")) patterns.push(new RegExp(`^${n.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[^}]+\}/g, "[\\w-]+")}$`));
        else events.push(n);
      }
  }
  // nk.legacy itself, the bridge's table, the intent handle methods live on returned objects (not paths)
  lua.add("nk.legacy");
  return (cache = { lua, tables, legacy, events, patterns });
}

const known = (name: string) => {
  const a = load();
  return a.events.includes(name) || a.patterns.some((p) => p.test(name));
};

/** Lua: nk./NUI. paths and 'nuikit:…' event names. */
export function arsenalLua(_src: string, bare: string, code: string, report: Report, own?: Set<string>): void {
  const a = load();
  // a path: nk.a or nk.a.b (deeper is a field of a returned value, e.g. nk.camera.defaults.vehicle)
  for (const m of bare.matchAll(/\b(nk|NUI)\s*\.\s*([A-Za-z_]\w*)(?:\s*\.\s*([A-Za-z_]\w*))?/g)) {
    const one = `nk.${m[2]}`;
    const two = m[3] ? `${one}.${m[3]}` : null;
    if (two && a.lua.has(two)) continue;
    // nk.surface is both a domain and an old function name: only a call on it (no member) is the old name
    const old = a.legacy.get(two ?? "") ?? (two && a.tables.has(one) ? undefined : a.legacy.get(one));
    if (old) {
      const which = a.legacy.has(two ?? "") ? two! : one;
      report("arsenal/legacy", m.index!, `${m[1]}${which.slice(2)} is an old name: use ${old.now} (removed in ${old.removeIn})`);
      continue;
    }
    if (two && (a.lua.has(two) || (!a.tables.has(one) && a.lua.has(one)))) continue;
    if (!two && (a.tables.has(one) || a.lua.has(one))) continue;
    if (two && a.tables.has(one) && one !== "nk.nk") {
      report("arsenal/unknown", m.index!, `${m[1]}.${m[2]}.${m[3]} is not in the arsenal (packages/core/arsenal.json): a private path; use a published nk.${m[2]}.<verb> or add it to the spec`);
      continue;
    }
    if (!a.lua.has(one) && !a.tables.has(one)) report("arsenal/unknown", m.index!, `${m[1]}.${m[2]} is not in the arsenal (packages/core/arsenal.json): a private path; use a published nk.<domain>.<verb> or add it to the spec`);
  }
  // event names in strings (`code` keeps strings and blanks comments)
  for (const m of code.matchAll(/(["'])(nuikit:[\w:-]+)\1/g)) {
    const name = m[2]!;
    if (own?.has(name) || known(name) || /^nuikit:settings:/.test(name)) continue;
    report("arsenal/unknown", m.index!, `event '${name}' is not in the arsenal: declare it in packages/core/src/spec/api (nuikit:<domain>:<event>) or use a published one`);
  }
}

/** Pages: 'nuikit:…' strings (onNui / fetchNui / emit names). */
export function arsenalPage(strings: Span[], src: string, report: Report): void {
  for (const s of strings) {
    const text = src.slice(s.start, s.end).replace(/^[`"']|[`"']$/g, "");
    if (!/^nuikit:[\w:-]+$/.test(text) || known(text) || /^nuikit:settings:/.test(text)) continue;
    // storage keys and DOM names the page owns (localStorage 'nuikit:scene', window['nuikit:diagnostics'])
    if (/^nuikit:(scene|diagnostics)$/.test(text)) continue;
    report("arsenal/unknown", s.start, `event '${text}' is not in the arsenal: declare it in packages/core/src/spec/api (nuikit:<domain>:<event>) or use a published one`);
  }
}
