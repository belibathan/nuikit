import { defineConfig } from "tsup";

// Bundle everything into one file: `npm create nuikit` should start instantly.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  clean: true,
  noExternal: ["@clack/prompts", "picocolors"],
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
});
