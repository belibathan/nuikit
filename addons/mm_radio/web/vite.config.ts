import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

// Builds into web/build; the release copies it over mm_radio/build (ui_page 'build/index.html').
// mm_radio's Lua stays silent unless build/index.html exists (docs/mm-radio-protocol.md §0).
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: { outDir: "build", emptyOutDir: true },
  resolve: web(__dirname),
});
