import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "src/react.ts",
    devtools: "src/devtools.tsx",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2020",
  external: ["react", "react-dom"],
});
