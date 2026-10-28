// web/dist/module.js: the HUD as a nuikit host module (docs/host.md). Runs after the ui_page build.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit, nuikitModule } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false, report: false }), nuikitModule()],
  resolve: web(__dirname),
});
