import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

// Builds into web/build; the release copies it over ox_target/web, matching its fxmanifest
// (ui_page 'web/index.html', files 'web/**'). Relative base so ./assets/* resolve there.
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: { outDir: "build", emptyOutDir: true },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
