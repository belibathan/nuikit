import path from "node:path";
import { nuikit } from "vite-plugin-nuikit";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const registry = path.resolve(__dirname, "../../registry/nuikit");
const vendor = path.resolve(__dirname, "../../vendor/shadcn/ui");
const fromRegistry = ["vital", "key-hint", "task-progress", "nui-menu", "radial-menu", "speedometer", "nui-toaster"];
// Stock shadcn components, unmodified (see vendor/shadcn/README.md).
const fromShadcn = ["badge", "button", "card", "item", "kbd", "progress", "separator", "sonner", "textarea"];

export default defineConfig({
  // Dogfood: this site's CSS goes through the same Chromium 103 lowering as your NUI.
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false, report: false })],
  base: "/",
  resolve: {
    alias: [
      { find: new RegExp(`^@/components/ui/(${fromRegistry.join("|")})$`), replacement: `${registry}/ui/$1.tsx` },
      { find: new RegExp(`^@/components/ui/(${fromShadcn.join("|")})$`), replacement: `${vendor}/$1.tsx` },
      { find: "@/hooks/use-nui-store", replacement: `${registry}/hooks/use-nui-store.ts` },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
    dedupe: ["react", "react-dom", "nuikit-core", "sonner", "radix-ui", "next-themes", "class-variance-authority", "lucide-react", "clsx", "tailwind-merge"],
  },
});
