import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

// Builds into web/build, exactly where ox_lib's fxmanifest points (ui_page 'web/build/index.html').
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  build: { outDir: "build", emptyOutDir: true },
  resolve: web(__dirname),
});
