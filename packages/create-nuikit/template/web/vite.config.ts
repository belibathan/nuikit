import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

export default defineConfig({
  // nuikit() goes after tailwindcss(): it lowers Tailwind v4 / shadcn CSS for FiveM's
  // Chromium 103 and gives you in-game hot reload.
  plugins: [react(), tailwindcss(), nuikit()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // the kit's one icon set (Hugeicons, src/components/ui/icons.tsx): a shadcn snippet's lucide imports draw it too
      "lucide-react": path.resolve(__dirname, "src/components/ui/icons.tsx"),
    },
  },
});
