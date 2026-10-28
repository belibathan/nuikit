// After `pnpm build:systems`: every in-repo UI that imports a registry component carries that component's classes.
// In-repo UIs import registry/nuikit and vendor/shadcn from outside web/, where Tailwind's automatic detection never
// looks; sync names those folders with @source. If that ever breaks, the build stays green and the game falls apart
// (TextRoll printed both layers, the speedometer lost its grid), so this fails CI instead.
//
//   node scripts/check-built-classes.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// a class that only the component's own file uses, as it appears in built CSS (some UIs inline their CSS into JS)
const PROBES = {
  "text-roll": "grid-area\\:1\\/1",
  "selection": ".nk-indicator",
};
let failed = 0;
let checked = 0;
for (const group of ["systems", "addons"]) {
  for (const name of fs.readdirSync(path.join(root, group))) {
    const web = path.join(root, group, name, "web");
    if (!fs.existsSync(path.join(web, "src"))) continue;
    const src = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) && src.push(fs.readFileSync(path.join(d, e.name), "utf8")); };
    walk(path.join(web, "src"));
    const all = src.join("\n");
    const used = Object.keys(PROBES).filter((c) => new RegExp(`@/components/ui/${c}["']`).test(all));
    if (!used.length) continue;
    const css = ["dist", "build"].flatMap((out) => {
      const d = path.join(web, out);
      const files = [];
      const walk2 = (x) => fs.existsSync(x) && fs.readdirSync(x, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk2(path.join(x, e.name)) : /\.(css|js|html)$/.test(e.name) && files.push(path.join(x, e.name))));
      walk2(d);
      return files;
    }).map((f) => fs.readFileSync(f, "utf8")).join("\n");
    if (!css) { console.error(`✗ ${group}/${name}: no build output (run pnpm build:systems first)`); failed++; continue; }
    for (const c of used) {
      checked++;
      if (!css.includes(PROBES[c]) && !css.includes(PROBES[c].replaceAll("\\", "\\\\"))) { console.error(`✗ ${group}/${name} imports ${c} but its CSS lacks ${PROBES[c]}: the registry is not in Tailwind's sources (scripts/sync-template.mjs @source)`); failed++; }
    }
  }
}
if (failed) process.exit(1);
console.log(`✓ registry classes present in every built UI (${checked} checks)`);
