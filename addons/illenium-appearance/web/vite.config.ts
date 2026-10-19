import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig, type Plugin } from "vite";

/**
 * illenium-appearance's fxmanifest only serves `web/dist/index.html` and `web/dist/assets/*.js`, so a
 * separate .css file would 404 in game. Move the (already Chromium-103-lowered) CSS into the entry
 * chunk as a <style> tag and drop the stylesheet link. Runs after nuikit()'s CSS lowering.
 */
function inlineCss(): Plugin {
  return {
    name: "appearance:inline-css",
    enforce: "post",
    generateBundle(_opts, bundle) {
      const css = Object.values(bundle).filter((f) => f.type === "asset" && f.fileName.endsWith(".css"));
      if (!css.length) return;
      const text = css.map((f) => (f.type === "asset" ? String(f.source) : "")).join("\n");
      const entry = Object.values(bundle).find((f) => f.type === "chunk" && f.isEntry);
      if (!entry || entry.type !== "chunk") return;
      entry.code = `(function(){var s=document.createElement("style");s.setAttribute("data-appearance","");s.textContent=${JSON.stringify(text)};document.head.appendChild(s)})();\n${entry.code}`;
      for (const f of css) {
        delete bundle[f.fileName];
        const html = bundle["index.html"];
        if (html?.type === "asset") {
          html.source = String(html.source).replace(new RegExp(`\\s*<link[^>]+${f.fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`), "");
        }
      }
    },
  };
}

// Builds into web/build; the release copies it over illenium-appearance/web/dist (ui_page 'web/dist/index.html').
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false }), inlineCss()],
  base: "./",
  build: { outDir: "build", emptyOutDir: true, assetsInlineLimit: 100_000_000, modulePreload: { polyfill: false } },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
