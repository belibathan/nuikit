// Single sources of truth, copied into the create-nuikit template and every [nuikit] system:
//   packages/core/lua/*.lua           → client/
//   vendor/shadcn/ui/*                → web/src/components/ui (stock shadcn, unmodified)
//   registry/nuikit/*                 → web/src/components/ui, web/src/hooks
//   vendor/shadcn/colors/neutral.json → web/src/index.css (stock shadcn neutral theme)
//   packages/create-nuikit/kit.css    → web/src/index.css (the nk-* kit utilities)
// Copies are committed so each resource is complete on its own (you own the components, as with
// shadcn). Never edit the copies here; edit the sources and run `pnpm sync`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SHADCN = new Set(
  fs.readdirSync(path.join(root, "vendor/shadcn/ui")).filter((f) => f.endsWith(".tsx")).map((f) => f.replace(/\.tsx$/, "")),
);

/** Where each component comes from. */
const source = (c) => (SHADCN.has(c) ? `vendor/shadcn/ui/${c}.tsx` : `registry/nuikit/ui/${c}.tsx`);

// The create-nuikit template, plus every system/addon that declares what it needs in nuikit.json:
//   { "lua": ["nuikit.lua", "bridge.lua"], "components": ["button", "card"], "hooks": [] }
const targets = [
  {
    dir: "packages/create-nuikit/template",
    lua: ["nuikit.lua"],
    components: ["badge", "button", "card", "item", "kbd", "progress", "separator", "sonner", "vital", "key-hint", "nui-menu", "nui-toaster"],
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
    targets.push({ dir: `${group}/${name}`, lua: m.lua ?? [], components: m.components ?? [], hooks: m.hooks ?? [], css: m.css !== false });
  }
}

const { cssVars } = JSON.parse(fs.readFileSync(path.join(root, "vendor/shadcn/colors/neutral.json"), "utf8"));
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;
const css = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", cssVars.light), block(".dark", cssVars.dark)].join("\n\n"))
  .replace("/* {{kit}} */", fs.readFileSync(path.join(root, "packages/create-nuikit/kit.css"), "utf8").trimEnd());

for (const t of targets) {
  const copy = (from, to) => {
    const dest = path.join(root, t.dir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
  };
  for (const f of t.lua) copy(`packages/core/lua/${f}`, `client/${f}`);
  for (const c of t.components) copy(source(c), `web/src/components/ui/${c}.tsx`);
  for (const h of t.hooks) copy(`registry/nuikit/hooks/${h}.ts`, `web/src/hooks/${h}.ts`);
  if (t.css !== false) fs.writeFileSync(path.join(root, t.dir, "web/src/index.css"), css);
  console.log(`✓ synced ${t.dir}`);
}
