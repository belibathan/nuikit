import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "@nuikit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // nuikit() goes after tailwindcss(): it lowers Tailwind v4 / shadcn CSS for FiveM's
  // Chromium 103 and gives you in-game hot reload.
  plugins: [react(), tailwindcss(), nuikit()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
