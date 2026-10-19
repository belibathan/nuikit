import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig, type Plugin } from "vite";

// qbx_idcard's fxmanifest is untouched: `ui_page 'web/index.html'` and a fixed file list
// ('web/index.html', 'web/css/style.css', 'web/js/*.js', 'web/flags/*.png', 'web/badges/*.png',
// 'lang/global.js'). The build reproduces those names: index.html, css/style.css, js/main.js.
const allowed = (f: string) => f === "index.html" || f === "css/style.css" || /^js\/[\w.-]+\.js$/.test(f);

/** Fails the build if it would emit a file the resource's fxmanifest doesn't serve. */
function onlyServedFiles(): Plugin {
  return {
    name: "only-served-files",
    enforce: "post",
    generateBundle(_o, bundle) {
      const extra = Object.keys(bundle).filter((f) => !allowed(f));
      if (extra.length) this.error(`not served by qbx_idcard's fxmanifest: ${extra.join(", ")}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false }), onlyServedFiles()],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    assetsDir: "",
    assetsInlineLimit: Infinity,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        entryFileNames: "js/main.js",
        inlineDynamicImports: true,
        assetFileNames: (a) => ((a.names?.[0] ?? "").endsWith(".css") ? "css/style.css" : "[name][extname]"),
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
