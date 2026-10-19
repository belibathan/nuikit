import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig, type Plugin } from "vite";

// qbx_scoreboard's fxmanifest is untouched: `ui_page 'html/ui.html'` and `files { 'html/*' }`.
// `html/*` only matches files directly in html/, so the build is flat and keeps the original
// names: ui.html, app.js, style.css (they overwrite the stock ones when copied over).
const FILES = ["ui.html", "app.js", "style.css"];

/** Fails the build if it would emit a file the resource's fxmanifest doesn't serve. */
function onlyFiles(allowed: string[]): Plugin {
  return {
    name: "only-files",
    enforce: "post",
    generateBundle(_o, bundle) {
      const extra = Object.keys(bundle).filter((f) => !allowed.includes(f));
      if (extra.length) this.error(`not served by qbx_scoreboard's fxmanifest: ${extra.join(", ")}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false }), onlyFiles(FILES)],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    assetsDir: "",
    assetsInlineLimit: Infinity,
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: path.resolve(__dirname, "ui.html"),
      output: {
        entryFileNames: "app.js",
        inlineDynamicImports: true,
        assetFileNames: (a) => ((a.names?.[0] ?? "").endsWith(".css") ? "style.css" : "[name][extname]"),
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
