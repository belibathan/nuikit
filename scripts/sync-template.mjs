// Single sources of truth, copied into the create-nuikit template:
//   packages/core/lua/nuikit.lua      → client/nuikit.lua
//   vendor/shadcn/ui/*                → web/src/components/ui (stock shadcn, unmodified)
//   registry/nuikit/*                 → web/src/components/ui, web/src/hooks
//   vendor/shadcn/colors/neutral.json → web/src/index.css (stock shadcn neutral theme)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tpl = path.join(root, "packages/create-nuikit/template");
const copy = (from, to) => {
  fs.mkdirSync(path.dirname(path.join(tpl, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(tpl, to));
};

copy("packages/core/lua/nuikit.lua", "client/nuikit.lua");
for (const c of ["badge", "button", "card", "item", "kbd", "progress", "separator", "sonner"])
  copy(`vendor/shadcn/ui/${c}.tsx`, `web/src/components/ui/${c}.tsx`);
for (const c of ["vital", "key-hint", "nui-menu", "nui-toaster"]) copy(`registry/nuikit/ui/${c}.tsx`, `web/src/components/ui/${c}.tsx`);
copy("registry/nuikit/hooks/use-nui-store.ts", "web/src/hooks/use-nui-store.ts");

const { cssVars } = JSON.parse(fs.readFileSync(path.join(root, "vendor/shadcn/colors/neutral.json"), "utf8"));
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;
const css = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", cssVars.light), block(".dark", cssVars.dark)].join("\n\n"));
fs.writeFileSync(path.join(tpl, "web/src/index.css"), css);
console.log("✓ template synced");
