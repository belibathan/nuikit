import type { DomainSpec } from "./types";

/**
 * The naming rule, as code. One convention across every domain, no exceptions kept for history:
 *   JS     `nuikit-core/<domain.js>`, exports camelCase (PascalCase for components and types, UPPER_CASE for consts)
 *   Lua    `nk.<domain.lua>.<verb>` (camelCase verb); handle methods `Type:method`
 *   events `nuikit:<domain.lua>:<event>` (kebab-case event)
 * An old name lives only in `legacy` with `removeIn`. Returns the problems (empty when the domain is clean).
 */
const CAMEL = /^[a-z][a-zA-Z0-9]*$/;
const KEBAB = /^[a-z][a-z0-9-]*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

export function checkDomain(d: DomainSpec): string[] {
  const out: string[] = [];
  const at = (s: string) => out.push(`${d.lua}: ${s}`);
  if (!KEBAB.test(d.js)) at(`js name "${d.js}" is not kebab-case`);
  if (!CAMEL.test(d.lua)) at(`lua name "${d.lua}" is not camelCase`);
  const seen = new Set<string>();
  for (const e of d.entries) {
    if (seen.has(e.name)) at(`duplicate entry "${e.name}"`);
    seen.add(e.name);
    if (!e.doc || e.doc.includes("\n")) at(`${e.name}: doc must be one line`);
    if (!SEMVER.test(e.since)) at(`${e.name}: since "${e.since}" is not a version`);
    if (!e.js && !e.lua) at(`${e.name}: neither js nor lua`);
    if ((!e.js || !e.lua) && !e.only) at(`${e.name}: one side only, so it needs \`only\` (the reason)`);
    if (e.js && e.lua && e.only) at(`${e.name}: both sides but has \`only\``);
    if (e.lua) {
      const handle = /^[A-Z][A-Za-z]+:[a-z][a-zA-Z]*$/.test(e.lua);
      const type = e.kind === "type" && /^[A-Z][A-Za-z]+$/.test(e.lua);
      const path = e.lua.split(".");
      const ok = path.length === 3 && path[0] === "nk" && path[1] === d.lua && CAMEL.test(path[2]!);
      if (!handle && !type && !ok) at(`${e.name}: lua "${e.lua}" is not nk.${d.lua}.<verb>`);
    }
    if (e.js) {
      const ok = e.kind === "component" || e.kind === "type" ? /^[A-Z][A-Za-z0-9]*$/.test(e.js) : e.kind === "const" ? /^[A-Z][A-Z0-9_]*$/.test(e.js) : CAMEL.test(e.js);
      if (!ok) at(`${e.name}: js "${e.js}" does not fit its kind (${e.kind})`);
      if (e.kind === "hook" && !/^use[A-Z]/.test(e.js)) at(`${e.name}: a hook starts with use`);
    }
  }
  for (const ev of d.events ?? []) {
    const m = /^nuikit:([a-zA-Z]+):([a-z0-9-]+)$/.exec(ev.name);
    if (!m || m[1] !== d.lua) at(`event "${ev.name}" is not nuikit:${d.lua}:<event>`);
    if (ev.dir === "page→lua" && !ev.reply) at(`event "${ev.name}": a callback needs a reply type`);
  }
  const events = (d.events ?? []).map((e) => e.name);
  if (new Set(events).size !== events.length) at("duplicate event names");
  for (const l of d.legacy ?? []) if (!SEMVER.test(l.removeIn)) at(`legacy ${l.old}: removeIn is not a version`);
  return out;
}

/** Every domain at once, plus the cross-domain rules (unique names, wire names claimed once). */
export function checkSpec(domains: DomainSpec[]): string[] {
  const out = domains.flatMap(checkDomain);
  const names = new Map<string, string>();
  for (const d of domains) {
    for (const n of [`js:${d.js}`, `lua:${d.lua}`]) {
      if (names.has(n)) out.push(`${d.lua}: ${n} also used by ${names.get(n)}`);
      names.set(n, d.lua);
    }
  }
  const wire = new Map<string, string>();
  for (const d of domains)
    for (const ev of d.events ?? []) {
      const w = `${ev.dir}|${ev.wire ?? ev.name}`;
      if (wire.has(w)) out.push(`${ev.name}: wire ${w} also used by ${wire.get(w)}`);
      wire.set(w, ev.name);
    }
  return out;
}
