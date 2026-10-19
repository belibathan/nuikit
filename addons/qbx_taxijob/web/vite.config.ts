import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

// qbx_taxijob's fxmanifest serves exactly html/meter.html, html/meter.js and html/meter.css
// (no globs), so the build is exactly those three files: one script, one stylesheet, no chunks.
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: 100_000,
    rollupOptions: {
      input: path.resolve(__dirname, "meter.html"),
      output: {
        inlineDynamicImports: true,
        entryFileNames: "meter.js",
        assetFileNames: (a) => (a.names?.[0] ?? a.name ?? "").endsWith(".css") ? "meter.css" : "[name][extname]",
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
