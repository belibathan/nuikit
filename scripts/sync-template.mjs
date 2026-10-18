// Single sources of truth, copied into the create-nuikit template and every [nuikit] system:
//   packages/core/lua/*.lua           → client/
//   vendor/shadcn/ui/*                → web/src/components/ui (stock shadcn, unmodified)
//   registry/nuikit/*                 → web/src/components/ui, web/src/hooks
//   vendor/shadcn/colors/neutral.json → web/src/index.css (stock shadcn neutral theme)
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

const targets = [
  {
    dir: "packages/create-nuikit/template",
    lua: ["nuikit.lua"],
    components: ["badge", "button", "card", "item", "kbd", "progress", "separator", "sonner", "vital", "key-hint", "nui-menu", "nui-toaster"],
    hooks: ["use-nui-store"],
  },
  {
    // Drop-in replacement for ox_lib's web UI (builds to web/build).
    dir: "addons/ox_lib",
    lua: [],
    components: [
      "alert-dialog", "badge", "button", "calendar", "card", "checkbox", "dialog", "field", "input", "item", "kbd",
      "label", "popover", "progress", "scroll-area", "select", "separator", "slider", "sonner", "spinner", "switch", "textarea",
    ],
    hooks: [],
  },
  {
    dir: "systems/nuikit_hud",
    lua: ["nuikit.lua", "bridge.lua"],
    components: ["badge", "progress", "vital", "speedometer"],
    hooks: [],
  },
];

const { cssVars } = JSON.parse(fs.readFileSync(path.join(root, "vendor/shadcn/colors/neutral.json"), "utf8"));
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;
const css = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", cssVars.light), block(".dark", cssVars.dark)].join("\n\n"));

for (const t of targets) {
  const copy = (from, to) => {
    const dest = path.join(root, t.dir, to);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, from), dest);
  };
  for (const f of t.lua) copy(`packages/core/lua/${f}`, `client/${f}`);
  for (const c of t.components) copy(source(c), `web/src/components/ui/${c}.tsx`);
  for (const h of t.hooks) copy(`registry/nuikit/hooks/${h}.ts`, `web/src/hooks/${h}.ts`);
  fs.writeFileSync(path.join(root, t.dir, "web/src/index.css"), css);
  console.log(`✓ synced ${t.dir}`);
}
