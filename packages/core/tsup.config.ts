import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      react: "src/react.ts",
      devtools: "src/devtools.tsx",
      // The host (docs/host.md): module side, ui_page boot, and the host page runtime.
      module: "src/module.ts",
      boot: "src/boot.ts",
      host: "src/host.ts",
    },
    format: ["esm"],
    dts: true,
    clean: false, // two configs share dist/: the build script empties it first
    target: "es2020",
    external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
    define: { __NUIKIT_CORE_VERSION__: JSON.stringify(version) },
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
