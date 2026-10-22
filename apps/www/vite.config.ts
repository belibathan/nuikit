import fs from "node:fs";
import path from "node:path";
import { nuikit } from "vite-plugin-nuikit";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const registry = path.resolve(__dirname, "../../registry/nuikit");
const vendor = path.resolve(__dirname, "../../vendor/shadcn/ui");
const names = (dir: string) => fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => f.slice(0, -4));
const fromRegistry = names(`${registry}/ui`);
// Stock shadcn components, unmodified (see vendor/shadcn/README.md).
const fromShadcn = names(vendor);
// The registry's hooks (use-nui-store, use-collapse…).
const hooks = fs.readdirSync(`${registry}/hooks`).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3));

export default defineConfig({
  // Dogfood: this site's CSS goes through the same Chromium 103 lowering as your NUI.
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false, report: false })],
  base: "/",
  resolve: {
    alias: [
      { find: new RegExp(`^@/components/ui/(${fromRegistry.join("|")})$`), replacement: `${registry}/ui/$1.tsx` },
      { find: new RegExp(`^@/components/ui/(${fromShadcn.join("|")})$`), replacement: `${vendor}/$1.tsx` },
      { find: new RegExp(`^@/hooks/(${hooks.join("|")})$`), replacement: `${registry}/hooks/$1.ts` },
      // The registry's blocks, for /blocks (their own imports resolve through the lines above).
      { find: /^@\/blocks\/(.*)$/, replacement: `${registry}/blocks/$1` },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
    dedupe: ["react", "react-dom", "nuikit-core", "sonner", "radix-ui", "next-themes", "class-variance-authority", "lucide-react", "clsx", "tailwind-merge"],
  },
});
