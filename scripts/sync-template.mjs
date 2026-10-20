// Single sources of truth, copied into the create-nuikit template and every [nuikit] system:
//   packages/core/lua/*.lua           → client/ (vendored, nuikit.json "lua"), or the nuikit resource's
//                                       lib/ + init.lua (nuikit.json "runtime": true; others import it)
//   vendor/shadcn/ui/*                → web/src/components/ui (stock shadcn, unmodified)
//   registry/nuikit/*                 → web/src/components/ui, web/src/hooks
//   vendor/shadcn/colors/neutral.json → web/src/index.css (stock shadcn neutral theme)
//   nuikit-core compileTheme()        → web/src/index.css (nuikit token defaults; build core first)
//   packages/create-nuikit/kit.css    → web/src/index.css (the nk-* kit utilities)
//   nuikit-core fxserver-compiler.js  → server/compiler.js (nuikit.json "compiler": true)
// Copies are committed so each resource is complete on its own (you own the components, as with
// shadcn). Never edit the copies here; edit the sources and run `pnpm sync`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SHADCN = new Set(
  fs.readdirSync(path.join(root, "vendor/shadcn/ui")).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")),
);

/** Where each component comes from. */
const source = (c) => (SHADCN.has(c) ? `vendor/shadcn/ui/${c}.tsx` : `registry/nuikit/ui/${c}.tsx`);

// Components a component needs (registry.json registryDependencies), so a target that lists `menu-row` also
// gets the stock `progress` it imports. Transitive; only names this repo can supply (stock shadcn or registry).
const REGISTRY = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));
const DEPS = new Map(REGISTRY.items.filter((i) => i.type === "registry:ui").map((i) => [i.name, i.registryDependencies ?? []]));
const available = (c) => SHADCN.has(c) || fs.existsSync(path.join(root, `registry/nuikit/ui/${c}.tsx`));
// Guard: every "@/components/ui/<x>" a registry component imports must be in its registryDependencies, or
// `npx shadcn add` installs it broken (and targets here would miss the file).
const undeclared = [];
for (const [name, deps] of DEPS) {
  const file = path.join(root, `registry/nuikit/ui/${name}.tsx`);
  if (!fs.existsSync(file)) continue;
  const declared = new Set(deps.map((d) => String(d).replace(/^@nuikit\//, "").replace(/^https?:.*\/r\/([\w-]+)\.json$/, "$1")));
  for (const m of fs.readFileSync(file, "utf8").matchAll(/from\s+["']@\/components\/ui\/([\w-]+)["']/g)) {
    if (m[1] !== name && !declared.has(m[1])) undeclared.push(`${name} imports ${m[1]}`);
  }
}
if (undeclared.length) {
  console.error(`registry.json: add these to registryDependencies:\n  ${undeclared.join("\n  ")}`);
  process.exit(1);
}

function withDeps(list) {
  const out = new Set();
  const visit = (c) => {
    const name = String(c).replace(/^@nuikit\//, "").replace(/^https?:.*\/r\/([\w-]+)\.json$/, "$1");
    if (out.has(name) || !available(name)) return;
    out.add(name);
    for (const d of DEPS.get(name) ?? []) visit(d);
  };
  list.forEach(visit);
  return [...out];
}

// The create-nuikit template, plus every system/addon that declares what it needs in nuikit.json:
//   { "lua": ["nuikit.lua", "bridge.lua"], "components": ["button", "card"], "hooks": [] }
const targets = [
  {
    dir: "packages/create-nuikit/template",
    lua: [], // imports @nuikit/init.lua
    components: ["badge", "button", "checkbox", "kbd", "progress", "scroll-area", "separator", "sonner", "panel", "menu-row", "meter", "stat", "hud-chip", "key-prompt", "nui-toaster"],
    hooks: ["use-nui-store"],
  },
];
for (const group of ["systems", "addons"]) {
  const base = path.join(root, group);
  if (!fs.existsSync(base)) continue;
  for (const name of fs.readdirSync(base).sort()) {
    const manifest = path.join(base, name, "nuikit.json");
    if (!fs.existsSync(manifest)) continue;
    const m = JSON.parse(fs.readFileSync(manifest, "utf8"));
    targets.push({ dir: `${group}/${name}`, lua: m.lua ?? [], components: m.components ?? [], hooks: m.hooks ?? [], css: m.css !== false, compiler: m.compiler === true, runtime: m.runtime === true });
  }
}

const { cssVars } = JSON.parse(fs.readFileSync(path.join(root, "vendor/shadcn/colors/neutral.json"), "utf8"));
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;

// The nuikit tokens' defaults, exactly as compileTheme() derives them from the stock theme.
const coreDist = path.join(root, "packages/core/dist/index.js");
if (!fs.existsSync(coreDist)) {
  console.error("pnpm sync needs nuikit-core built first: pnpm -r --filter \"./packages/**\" build");
  process.exit(1);
}
const { compileTheme, TOKENS } = await import(pathToFileURL(coreDist).href);
const nuikitTokens = (mode) => {
  const { vars } = compileTheme({ ...cssVars[mode] }, { mode });
  const out = {};
  for (const t of TOKENS) if (t.group === "nuikit" || t.name === "destructive-foreground") out[t.name] = vars[t.name];
  out.info = "var(--primary)";
  out["info-foreground"] = "var(--primary-foreground)";
  return out;
};
const css = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", cssVars.light), block(".dark", cssVars.dark)].join("\n\n"))
  .replace("/* {{tokens}} */", [block(":root", nuikitTokens("light")), block(".dark", nuikitTokens("dark"))].join("\n\n"))
  .replace("/* {{kit}} */", fs.readFileSync(path.join(root, "packages/create-nuikit/kit.css"), "utf8").trimEnd());

for (const t of targets) {
  const copy = (from, to) => {
    const dest = path.join(root, t.dir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
  };
  for (const f of t.lua) copy(`packages/core/lua/${f}`, `client/${f}`);
  // The runtime other resources import with shared_script '@nuikit/init.lua'.
  if (t.runtime) {
    for (const f of ["nuikit.lua", "bridge.lua", "host.lua"]) copy(`packages/core/lua/${f}`, `lib/${f}`);
    copy("packages/core/lua/init.lua", "init.lua");
  }
  for (const c of withDeps(t.components)) copy(source(c), `web/src/components/ui/${c}.tsx`);
  for (const h of t.hooks) copy(`registry/nuikit/hooks/${h}.ts`, `web/src/hooks/${h}.ts`);
  if (t.compiler) copy("packages/core/dist/fxserver-compiler.js", "server/compiler.js");
  if (t.css !== false) fs.writeFileSync(path.join(root, t.dir, "web/src/index.css"), css);
  console.log(`✓ synced ${t.dir}`);
}
