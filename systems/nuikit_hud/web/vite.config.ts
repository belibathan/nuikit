import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit()],
  resolve: web(__dirname),
});
