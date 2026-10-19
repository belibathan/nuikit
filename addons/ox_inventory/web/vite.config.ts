import fs from "node:fs";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig, type Plugin } from "vite";

/**
 * Dev only: item images for the browser fixtures. In game they come from
 * nui://ox_inventory/web/images. Point OX_INVENTORY_IMAGES at a local ox_inventory/web/images
 * folder to use your own; otherwise requests go to the upstream repository.
 */
function devImages(): Plugin {
  const dir = process.env.OX_INVENTORY_IMAGES;
  return {
    name: "ox-inventory-dev-images",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__ox_images", (req, res) => {
        const file = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "");
        if (dir) {
          const full = path.join(dir, path.basename(file));
          if (fs.existsSync(full)) {
            res.setHeader("Content-Type", "image/png");
            fs.createReadStream(full).pipe(res);
            return;
          }
          res.statusCode = 404;
          res.end();
          return;
        }
        res.statusCode = 302;
        res.setHeader("Location", `https://raw.githubusercontent.com/overextended/ox_inventory/main/web/images/${file}`);
        res.end();
      });
    },
  };
}

// Builds into web/build, exactly where ox_inventory's fxmanifest points (ui_page 'web/build/index.html').
// Its manifest only serves web/build/assets/*.js and *.css, so every asset must be one of those.
export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit({ hotInGame: false }), devImages()],
  base: "./",
  build: {
    outDir: "build",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
