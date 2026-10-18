// Single source of truth: the Lua runtime lives in packages/core, components in registry/,
// the theme in registry.json. This copies them into the create-nuikit template.
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
for (const c of ["vital", "key-hint", "nui-menu", "nui-toaster"]) copy(`registry/nuikit/ui/${c}.tsx`, `web/src/components/ui/${c}.tsx`);
copy("registry/nuikit/hooks/use-nui-store.ts", "web/src/hooks/use-nui-store.ts");

const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));
const theme = registry.items.find((i) => i.name === "theme").cssVars;
const block = (sel, vars) => `${sel} {\n${Object.entries(vars).map(([k, v]) => `  --${k}: ${v};`).join("\n")}\n}`;
const css = fs
  .readFileSync(path.join(root, "packages/create-nuikit/index.css.tpl"), "utf8")
  .replace("/* {{theme}} */", [block(":root", { ...theme.theme, ...theme.light }), block(".dark", theme.dark)].join("\n\n"));
fs.writeFileSync(path.join(tpl, "web/src/index.css"), css);
console.log("✓ template synced");
