import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: { outDir: "build", emptyOutDir: true },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
