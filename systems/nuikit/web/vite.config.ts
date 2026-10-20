import tailwindcss from "@tailwindcss/vite";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

// The host page (docs/host.md): the nuikit resource's ui_page. It renders other resources' UI
// modules, so it owns the one copy of React they all share.
export default defineConfig({
  plugins: [tailwindcss(), nuikit()],
});
