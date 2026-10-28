import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

// A loading screen is declared with `loadscreen`, not `ui_page`, and loads before any dev server
// could be reached, so in-game hot reload is off. Develop it in the browser (`pnpm dev`).
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  resolve: web(__dirname),
});
