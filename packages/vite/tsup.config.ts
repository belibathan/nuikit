import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", cli: "src/cli.ts" },
  format: ["esm"],
  dts: { entry: { index: "src/index.ts" } },
  clean: true,
  target: "node18",
  platform: "node",
  external: ["vite", "lightningcss", "postcss", "css-has-pseudo"],
});
