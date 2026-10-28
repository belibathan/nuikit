import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";
import { web } from "../../../scripts/vite-web.mjs";

// Builds into web/build; the release copies it over Renewed-Banking/web/public (ui_page 'web/public/index.html').
// Renewed-Banking's server stops the resource unless web/public/build/bundle.js exists, so the entry
// script must be exactly build/bundle.js (docs/renewed-banking-protocol.md §0).
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false })],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "build/bundle.js",
        chunkFileNames: "build/[name]-[hash].js",
        assetFileNames: (asset) => (asset.names?.some((n) => n.endsWith(".css")) ? "build/bundle.css" : "build/[name]-[hash][extname]"),
      },
    },
  },
  resolve: web(__dirname),
});
