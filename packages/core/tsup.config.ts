import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      react: "src/react.ts",
      devtools: "src/devtools.tsx",
    },
    format: ["esm"],
    dts: true,
    clean: false, // two configs share dist/: the build script empties it first
    target: "es2020",
    external: ["react", "react-dom"],
  },
  // The theme compiler for the nuikit resource's server script (FXServer's Node runtime).
  {
    entry: { "fxserver-compiler": "src/fxserver.ts" },
    format: ["iife"],
    globalName: "NuikitTheme",
    target: "es2019",
    platform: "neutral",
    minify: false,
    banner: { js: `/* nuikit-core theme compiler (tokens v1). MIT, https://github.com/belibathan/nuikit. Generated: do not edit (pnpm sync copies it from packages/core). */` },
    footer: { js: "globalThis.NuikitTheme = NuikitTheme;" },
    outExtension: () => ({ js: ".js" }),
  },
]);
