// web/dist/renderers.js: the pack as a nuikit module (`{{pm}} run build`). One classic script; React
// comes from nuikit's frame, the CSS (lowered for Chromium 103) is inlined and scoped by the frame.
// vite.config.ts stays for `{{pm}} dev`: the browser preview in src/main.tsx.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit, nuikitModule } from "vite-plugin-nuikit";
import { defineConfig, type Plugin } from "vite";

/**
 * The pack draws inside nuikit's frame, which already serves the identity fonts: point the kit's
 * @font-face at the nuikit resource instead of inlining a megabyte of woff2 into the module.
 */
const hostFonts = (): Plugin => ({
  name: "renderer-pack:host-fonts",
  enforce: "pre",
  transform: (code, id) => (id.endsWith(".css") ? code.replace(/url\(["']?\.\/fonts\//g, 'url("https://cfx-nui-nuikit/fonts/') : undefined),
});

export default defineConfig({
  plugins: [hostFonts(), react(), tailwindcss(), nuikit({ hotInGame: false, report: false }), nuikitModule({ entry: "src/renderers.tsx", fileName: "renderers.js" })],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
