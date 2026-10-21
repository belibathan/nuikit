import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

// The nuikit resource's frame: the host page (docs/host.md) for other resources' UI modules, and
// the default renderers for the intents (docs/intents.md). It owns the one copy of React they share.
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit()],
  base: "./",
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
