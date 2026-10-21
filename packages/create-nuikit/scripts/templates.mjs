// Assembles every block template (`npm create nuikit -- -t <block>`) into dist/templates/<block>:
//
//   1. template/                        the base project (fxmanifest, Vite, index.css, kit components)
//   2. the block's files from registry.json → web/src/<target>, exactly where `npx shadcn add` puts them
//   3. every component they import (@/components/ui/*) that the base doesn't have, from
//      registry/nuikit/ui or vendor/shadcn/ui, transitively
//   4. templates/<block>/ on top: App.tsx, dev.tsx, nui.d.ts, client/main.lua, README.md
//
// A template with `"block": false` (renderer-pack) skips 2: base + overlay, components resolved from
// every .tsx in the overlay; `"remove": [...]` drops base files it doesn't want.
//
// Runs after tsup (`pnpm build`). Nothing here is committed: the sources are the registry block,
// the components and templates/<block>, so a block and its template can never drift apart.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(pkg, "../..");
const base = path.join(pkg, "template");
const out = path.join(pkg, "dist/templates");
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));

const fail = (msg) => {
  console.error(`create-nuikit templates: ${msg}`);
  process.exit(1);
};

function copyDir(from, to, skip = () => false) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

/** Where a component's source lives, the way scripts/sync-template.mjs resolves it. */
function componentSource(name) {
  for (const p of [`registry/nuikit/ui/${name}.tsx`, `vendor/shadcn/ui/${name}.tsx`]) {
    if (fs.existsSync(path.join(root, p))) return p;
  }
  return null;
}

/** Files under `dir`, relative to it. */
function walk(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`]));
}

const imports = (file) => [...fs.readFileSync(file, "utf8").matchAll(/from\s+["']@\/components\/ui\/([\w-]+)["']/g)].map((m) => m[1]);

/** Copy every component `file` imports (and theirs) into the project's ui folder. */
function addComponents(file, uiDir, added) {
  for (const name of imports(file)) {
    const dest = path.join(uiDir, `${name}.tsx`);
    if (fs.existsSync(dest)) continue;
    const src = componentSource(name);
    if (!src) fail(`${path.relative(root, file)} imports @/components/ui/${name}, which is neither a registry nor a shadcn component`);
    fs.copyFileSync(path.join(root, src), dest);
    added.push(name);
    addComponents(dest, uiDir, added);
  }
}

const templatesDir = path.join(pkg, "templates");
const names = fs.existsSync(templatesDir)
  ? fs.readdirSync(templatesDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  : [];
fs.rmSync(out, { recursive: true, force: true });

const basePkg = JSON.parse(fs.readFileSync(path.join(base, "web/package.json"), "utf8"));
const baseDeps = new Set([...Object.keys(basePkg.dependencies ?? {}), ...Object.keys(basePkg.devDependencies ?? {})]);
const index = [];

for (const name of names) {
  const overlay = path.join(templatesDir, name);
  const meta = JSON.parse(fs.readFileSync(path.join(overlay, "template.json"), "utf8"));
  const item = meta.block === false ? null : registry.items.find((i) => i.name === (meta.block ?? name));
  if (meta.block !== false && (!item || item.type !== "registry:block")) fail(`templates/${name}: no registry:block "${meta.block ?? name}" in registry.json`);
  for (const dep of item?.dependencies ?? []) {
    if (!baseDeps.has(dep)) fail(`${item.name} needs the npm package "${dep}"; add it to template/web/package.json`);
  }

  const dest = path.join(out, name);
  copyDir(base, dest);
  for (const rel of meta.remove ?? []) fs.rmSync(path.join(dest, rel), { recursive: true, force: true });
  const ui = path.join(dest, "web/src/components/ui");
  const added = [];
  for (const f of item?.files ?? []) {
    if (!f.target) fail(`${item.name}: ${f.path} needs a "target" (components/blocks/${item.name}/…)`);
    const to = path.join(dest, "web/src", f.target);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(root, f.path), to);
  }
  for (const f of item?.files ?? []) addComponents(path.join(dest, "web/src", f.target), ui, added);
  copyDir(overlay, dest, (n) => n === "template.json");
  if (item) addComponents(path.join(dest, "web/src/App.tsx"), ui, added);
  else for (const f of walk(path.join(overlay, "web/src")).filter((f) => f.endsWith(".tsx"))) addComponents(path.join(dest, "web/src", f), ui, added);

  index.push({ name, title: meta.title, description: meta.description, next: meta.next ?? [] });
  console.log(`✓ template ${name}${added.length ? ` (+ ${added.join(", ")})` : ""}`);
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(index, null, 2) + "\n");
