// Re-copy every stock shadcn new-york-v4 component (and its hooks) into vendor/shadcn, unmodified except
// the import paths: `cn` → @/lib/utils, siblings → @/components/ui/*, hooks → @/hooks/*.
//   git clone --depth 1 https://github.com/shadcn-ui/ui /tmp/shadcn
//   node scripts/vendor-shadcn.mjs /tmp/shadcn/apps/v4/registry/new-york-v4
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src || !fs.existsSync(path.join(src, "ui"))) {
  console.error("usage: node scripts/vendor-shadcn.mjs <shadcn-ui/ui>/apps/v4/registry/new-york-v4");
  process.exit(1);
}
const rewrite = (s) =>
  s
    .replace('import { cn } from "cn"', 'import { cn } from "@/lib/utils"')
    .replaceAll('"@/registry/new-york-v4/ui/', '"@/components/ui/')
    .replaceAll('"@/registry/new-york-v4/hooks/', '"@/hooks/');
let n = 0;
for (const [sub, ext] of [
  ["ui", ".tsx"],
  ["hooks", ".ts"],
]) {
  const dir = path.join(src, sub);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(ext) || f.startsWith("_")) continue;
    fs.writeFileSync(path.join(root, "vendor/shadcn", sub, f), rewrite(fs.readFileSync(path.join(dir, f), "utf8")));
    n++;
  }
}
console.log(`✓ vendored ${n} files into vendor/shadcn (now run pnpm sync)`);
