// Single sources of truth, copied into the create-nuikit template and every [nuikit] system:
//   packages/core/lua/*.lua           → client/ (vendored, nuikit.json "lua"), or the nuikit resource's
//                                       lib/ + init.lua (nuikit.json "runtime": true; others import it)
//   vendor/shadcn/ui/*                → web/src/components/ui (stock shadcn, unmodified)
//   registry/nuikit/*                 → web/src/components/ui, web/src/hooks
//   vendor/shadcn/colors/neutral.json → web/src/index.css (stock shadcn neutral theme)
//   nuikit-core compileTheme()        → web/src/index.css (nuikit token defaults; build core first)
//   packages/create-nuikit/kit.css    → web/src/index.css (the nk-* kit utilities)
//   packages/core/themes/*.css        → the nuikit resource's themes/ (the four identities)
//   packages/core/fonts/*             → web/src/index.css @font-face (bundled from nuikit-core, or served
//                                       by the nuikit resource: nuikit.json "fonts" / NUIKIT_FONTS), the
//                                       nuikit resource's fonts/, the create-nuikit template's web/src/fonts/
//   nuikit-core fxserver-compiler.js  → server/compiler.js (nuikit.json "compiler": true)
// Copies are committed so each resource is complete on its own (you own the components, as with
// shadcn). Never edit the copies here; edit the sources and run `pnpm sync`.
//
// Pruning: scripts/sync-manifest.json records every file sync wrote, per target. A file sync wrote last
// time and doesn't write now (a component dropped from nuikit.json) is deleted. Hand-written files are
// never in the manifest, so they're never touched. Before a target has a manifest entry, a component or
// hook counts as sync's only while it's byte-identical to its source.
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
    targets.push({ dir: `${group}/${name}`, lua: m.lua ?? [], components: m.components ?? [], hooks: m.hooks ?? [], css: m.css !== false, compiler: m.compiler === true, runtime: m.runtime === true, fonts: m.fonts });
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
const { compileTheme, TOKENS, IDENTITY_TOKENS } = await import(pathToFileURL(coreDist).href);
const nuikitTokens = (mode) => {
  const { vars } = compileTheme({ ...cssVars[mode] }, { mode });
  const out = {};
  for (const t of TOKENS) if (t.group === "nuikit" || t.name === "destructive-foreground" || t.type === "fontFamily") out[t.name] = vars[t.name];
  for (const t of IDENTITY_TOKENS) out[t.name] = vars[t.name];
  out.info = "var(--primary)";
  out["info-foreground"] = "var(--primary-foreground)";
  return out;
};
// Identity fonts, per UI (nuikit.json "fonts", or NUIKIT_FONTS for every UI that doesn't say):
//   "bundle"   (default) every font ships with the UI (from nuikit-core, so the repo holds one copy);
//   "graphite" the default identity's fonts ship with the UI, the others load from the nuikit resource
//              (for overrides whose resource serves a fixed file list: the build inlines what it bundles);
//   "nuikit"   every font loads from the nuikit resource (one copy per server; unproven, see the in-game
//              check in bench/identity/results.md);
//   false      no @font-face (a UI that brings its own fonts).
// A font that fails to load falls back down the family's stack (system fonts); nothing breaks.
const FONTS_DIR = path.join(root, "packages/core/fonts");
const FONTS = JSON.parse(fs.readFileSync(path.join(FONTS_DIR, "fonts.json"), "utf8"));
const FONT_MODE = process.env.NUIKIT_FONTS ?? "bundle";
// nuikit-core is a dependency of every UI: Vite resolves the file (dev and build) and emits or inlines it
const bundled = (file) => `url("../node_modules/nuikit-core/fonts/${file}") format("woff2")`;
// the create-nuikit template is copied out of the repo: it carries its own copies
const local = (file) => `url("./fonts/${file}") format("woff2")`;
const served = (file) => `url("https://cfx-nui-nuikit/fonts/${file}") format("woff2"), url("nui://nuikit/fonts/${file}") format("woff2")`;
const FONT_SRC = {
  bundle: () => bundled,
  local: () => local,
  nuikit: () => served,
  graphite: (f) => (f.identity.includes("graphite") ? bundled : served),
};
const fontFaces = (mode) =>
  FONTS.fonts
    .map(
      (f) =>
        `@font-face {\n  font-family: "${f.family}";\n  font-style: normal;\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: ${FONT_SRC[mode](f)(f.file)};\n  unicode-range: ${FONTS.unicodeRange};\n}`,
    )
    .join("\n");

const template = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", cssVars.light), block(".dark", cssVars.dark)].join("\n\n"))
  .replace("/* {{tokens}} */", [block(":root", nuikitTokens("light")), block(".dark", nuikitTokens("dark"))].join("\n\n"))
  .replace("/* {{kit}} */", fs.readFileSync(path.join(root, "packages/create-nuikit/kit.css"), "utf8").trimEnd());
const cssFor = (mode) => template.replace("/* {{fonts}} */", mode && FONT_SRC[mode] ? fontFaces(mode) : "/* (fonts off for this UI) */");

const MANIFEST = path.join(root, "scripts/sync-manifest.json");
const previous = fs.existsSync(MANIFEST) ? (JSON.parse(fs.readFileSync(MANIFEST, "utf8")).targets ?? {}) : {};
const manifest = {};

/** A target with no manifest entry yet: its components and hooks that are exact copies of a source. */
function adoptExactCopies(dir) {
  const found = [];
  const scan = (sub, sourceOf) => {
    const abs = path.join(root, dir, sub);
    if (!fs.existsSync(abs)) return;
    for (const f of fs.readdirSync(abs)) {
      const src = sourceOf(f);
      if (!src || !fs.existsSync(path.join(root, src))) continue;
      if (fs.readFileSync(path.join(abs, f)).equals(fs.readFileSync(path.join(root, src)))) found.push(`${sub}/${f}`);
    }
  };
  scan("web/src/components/ui", (f) => (f.endsWith(".tsx") ? source(f.slice(0, -4)) : null));
  scan("web/src/hooks", (f) => (f.endsWith(".ts") ? `registry/nuikit/hooks/${f}` : null));
  return found;
}

for (const t of targets) {
  const written = new Set();
  const copy = (from, to) => {
    const dest = path.join(root, t.dir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
    written.add(to);
  };
  for (const f of t.lua) copy(`packages/core/lua/${f}`, `client/${f}`);
  // The runtime other resources import with shared_script '@nuikit/init.lua'.
  if (t.runtime) {
    for (const f of ["nuikit.lua", "bridge.lua", "host.lua"]) copy(`packages/core/lua/${f}`, `lib/${f}`);
    copy("packages/core/lua/init.lua", "init.lua");
  }
  // the nuikit resource serves the fonts to every UI (FONT_SRC.nuikit); the template ships its own
  const fontMode = t.fonts === false ? false : t.dir === "packages/create-nuikit/template" ? "local" : (t.fonts ?? FONT_MODE);
  // the four identities (packages/core/themes): copy one over nuikit/theme.css
  if (t.runtime) for (const f of fs.readdirSync(path.join(root, "packages/core/themes"))) copy(`packages/core/themes/${f}`, `themes/${f}`);
  if (t.runtime || fontMode === "local") {
    const into = t.runtime ? "fonts" : "web/src/fonts";
    for (const f of fs.readdirSync(FONTS_DIR)) if (/\.(woff2|txt)$/.test(f)) copy(`packages/core/fonts/${f}`, `${into}/${f}`);
  }
  for (const c of withDeps(t.components)) copy(source(c), `web/src/components/ui/${c}.tsx`);
  for (const h of t.hooks) copy(`registry/nuikit/hooks/${h}.ts`, `web/src/hooks/${h}.ts`);
  if (t.compiler) copy("packages/core/dist/fxserver-compiler.js", "server/compiler.js");
  if (t.css !== false) {
    fs.writeFileSync(path.join(root, t.dir, "web/src/index.css"), cssFor(fontMode));
    written.add("web/src/index.css");
  }
  // prune: what sync wrote last time and no longer writes (never a file sync didn't write)
  const before = previous[t.dir] ?? adoptExactCopies(t.dir);
  const pruned = before.filter((f) => !written.has(f) && fs.existsSync(path.join(root, t.dir, f)));
  for (const f of pruned) fs.rmSync(path.join(root, t.dir, f));
  manifest[t.dir] = [...written].sort();
  console.log(`✓ synced ${t.dir}${pruned.length ? ` (removed ${pruned.join(", ")})` : ""}`);
}
// targets that are gone (a system deleted) keep nothing to prune: their folder went with them
fs.writeFileSync(
  MANIFEST,
  `${JSON.stringify({ about: "Files pnpm sync wrote, per target; the next sync deletes the ones it no longer writes. Generated by scripts/sync-template.mjs: don't edit.", targets: manifest }, null, 2)}\n`,
);
