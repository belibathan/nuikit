// Emits paste-ready use_figma scripts from out/data-*.json + populate.js (bench/figma/README.md).
import { readFileSync, writeFileSync } from "node:fs";
const out = new URL("./out/", import.meta.url).pathname;
const populate = readFileSync(new URL("./populate.js", import.meta.url), "utf8");
const COLS = { identity: "VariableCollectionId:17:2", semantic: "VariableCollectionId:17:3", component: "VariableCollectionId:17:4" };
const MODES = ["Default", "Neon Pop", "Flat", "Square"];
const CAP = 40000; // use_figma code cap is 50k; keep headroom for the helper
const files = [];
const prepare = `const names = ${JSON.stringify(MODES)};
const out = { renamed: [], removed: [], stale: {} };
const keep = ${JSON.stringify(Object.fromEntries(Object.keys(COLS).map((k) => [k, JSON.parse(readFileSync(`${out}data-${k}.json`, "utf8")).map((r) => r[0])])))};
for (const [key, id] of Object.entries(${JSON.stringify(COLS)})) {
  const c = await figma.variables.getVariableCollectionByIdAsync(id);
  c.modes.forEach((m, i) => { if (names[i] && m.name !== names[i]) { c.renameMode(m.modeId, names[i]); out.renamed.push(c.name + ": " + m.name + " → " + names[i]); } });
  const vars = await Promise.all(c.variableIds.map((v) => figma.variables.getVariableByIdAsync(v)));
  out.stale[key] = vars.filter((v) => !keep[key].includes(v.name)).map((v) => v.name);
}
for (const id of ["VariableCollectionId:20:2", "VariableCollectionId:20:3"]) {
  const c = await figma.variables.getVariableCollectionByIdAsync(id);
  if (c) { out.removed.push(c.name); c.remove(); }
}
return out;`;
writeFileSync(`${out}figma-0-prepare.js`, prepare); files.push("figma-0-prepare.js");
const aliasAll = [];
let n = 1;
for (const key of ["identity", "semantic", "component"]) {
  const rows = JSON.parse(readFileSync(`${out}data-${key}.json`, "utf8"));
  const chunks = [];
  let cur = [];
  for (const r of rows) {
    cur.push(r);
    if (JSON.stringify(cur).length > CAP - populate.length - 600) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  chunks.forEach((chunk, i) => {
    const name = `figma-${n}-${key}${chunks.length > 1 ? `-${i + 1}` : ""}.js`;
    const code = `${populate}
const collection = await figma.variables.getVariableCollectionByIdAsync(${JSON.stringify(COLS[key])});
const rows = ${JSON.stringify(chunk)};
const { ids, pendingAlias } = await populate(collection, rows);
return { collection: collection.name, created: Object.keys(ids).length, aliases: pendingAlias.map(([v, a]) => [v.name, a]) };`;
    writeFileSync(`${out}${name}`, code); files.push(name);
  });
  n++;
  for (const r of rows) if (!Array.isArray(r[5])) aliasAll.push([key, r[0], r[5].a]);
}
const aliases = `// Resolve aliases: a variable whose value is another variable, in every mode.
const cols = ${JSON.stringify(COLS)};
const byName = {};
for (const [key, id] of Object.entries(cols)) {
  const c = await figma.variables.getVariableCollectionByIdAsync(id);
  for (const vid of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(vid); byName[key + "/" + v.name] = v; byName[v.name] = byName[v.name] || v; }
}
const pairs = ${JSON.stringify(aliasAll)};
const done = [], missing = [];
for (const [key, name, target] of pairs) {
  const v = byName[key + "/" + name]; const t = byName[target] || byName[key + "/" + target];
  if (!v || !t) { missing.push([name, target]); continue; }
  const c = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
  for (const m of c.modes) v.setValueForMode(m.modeId, figma.variables.createVariableAlias(t));
  done.push(name);
}
return { resolved: done.length, missing };`;
writeFileSync(`${out}figma-4-aliases.js`, aliases); files.push("figma-4-aliases.js");
const prune = `// Removes variables step 0 listed as stale. Paste the names from figma-0-prepare's result into STALE first.
const STALE = { identity: [], semantic: [], component: [] };
const cols = ${JSON.stringify(COLS)};
const removed = [];
for (const [key, id] of Object.entries(cols)) {
  const c = await figma.variables.getVariableCollectionByIdAsync(id);
  for (const vid of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(vid); if (STALE[key].includes(v.name)) { v.remove(); removed.push(v.name); } }
}
return { removed };`;
writeFileSync(`${out}figma-5-prune.js`, prune); files.push("figma-5-prune.js");
for (const f of files) console.log(f, readFileSync(out + f, "utf8").length);
