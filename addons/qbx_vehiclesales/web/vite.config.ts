import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

// qbx_vehiclesales' fxmanifest serves exactly html/ui.html, ui.js, ui.css, logo.svg and vue.min.js
// (no globs), so the build is exactly those five files: one script, one stylesheet, no chunks.
// logo.svg and vue.min.js come from public/.
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: 100_000,
    rollupOptions: {
      input: path.resolve(__dirname, "ui.html"),
      output: {
        inlineDynamicImports: true,
        entryFileNames: "ui.js",
        assetFileNames: (a) => ((a.names?.[0] ?? a.name ?? "").endsWith(".css") ? "ui.css" : "[name][extname]"),
      },
    },
  },
  resolve: web(__dirname),
});
