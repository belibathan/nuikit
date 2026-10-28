// The one resolve config for every in-repo UI (systems/*/web, addons/*/web): components, hooks and the kit-aware
// cn() resolve straight to their sources (registry/nuikit, vendor/shadcn), so nothing is copied into a UI's tree.
// A UI's own file under src/components/ui or src/hooks wins over a registry one of the same name.
// create-nuikit's template is the exception: it is what a user receives, so it keeps real copies (pnpm sync).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = path.join(root, "registry/nuikit");
const vendor = path.join(root, "vendor/shadcn");
const names = (dir, ext) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)) : []);
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bare packages the registry's sources import: resolved from the UI's own node_modules, one copy each. */
export const DEDUPE = ["react", "react-dom", "nuikit-core", "radix-ui", "@hugeicons/react", "@hugeicons/core-free-icons", "class-variance-authority", "clsx", "tailwind-merge", "sonner", "next-themes", "cmdk", "vaul", "react-day-picker", "recharts", "embla-carousel-react", "input-otp", "react-hook-form", "react-resizable-panels"];

/** `resolve` for a UI's vite.config.ts: `resolve: web(__dirname)`. */
export function web(dir) {
  const src = path.join(dir, "src");
  const local = (sub, ext) => new Set(names(path.join(src, sub), ext));
  const ui = (from, ext, mine) => names(from, ext).filter((n) => !mine.has(n));
  const myUi = local("components/ui", ".tsx");
  const myHooks = local("hooks", ".ts");
  const alias = [];
  const group = (find, list, replacement) => list.length && alias.push({ find: new RegExp(`^${find}(${list.map(escape).join("|")})$`), replacement });
  group("@/components/ui/", ui(path.join(registry, "ui"), ".tsx", myUi), `${registry}/ui/$1.tsx`);
  group("@/components/ui/", ui(path.join(vendor, "ui"), ".tsx", myUi), `${vendor}/ui/$1.tsx`);
  group("@/hooks/", ui(path.join(registry, "hooks"), ".ts", myHooks), `${registry}/hooks/$1.ts`);
  group("@/hooks/", ui(path.join(vendor, "hooks"), ".ts", myHooks), `${vendor}/hooks/$1.ts`);
  if (!fs.existsSync(path.join(src, "lib/utils.ts"))) alias.push({ find: /^@\/lib\/utils$/, replacement: `${registry}/lib/utils.ts` });
  alias.push({ find: /^@\/blocks\/(.*)$/, replacement: `${registry}/blocks/$1` });
  // the kit's one icon set (Hugeicons): stock shadcn's lucide-react imports draw it too, unedited
  alias.push({ find: /^lucide-react$/, replacement: myUi.has("icons") ? path.join(src, "components/ui/icons.tsx") : `${registry}/ui/icons.tsx` });
  alias.push({ find: "@", replacement: src });
  return { alias, dedupe: DEDUPE };
}
