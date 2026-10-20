import { transformWithEsbuild, type Plugin } from "vite";

export interface NuikitModuleOptions {
  /** Module entry, relative to the Vite root. Default "src/module.tsx". */
  entry?: string;
  /** Output file inside build.outDir. Default "module.js" (fxmanifest: nuikit_ui 'web/dist/module.js'). */
  fileName?: string;
}

/** What the host provides (docs/host.md); everything else is bundled into the module. */
const SHARED: Record<string, string> = {
  react: "deps.react",
  "react-dom": "deps.reactDom",
  "react-dom/client": "deps.reactDomClient",
  "react/jsx-runtime": "deps.jsxRuntime",
};

const CSS_ID = "virtual:nuikit-module-css";
const PLACEHOLDER = "__NUIKIT_MODULE_CSS__";

/**
 * Build the UI as a nuikit host module, next to the normal ui_page build:
 *
 *   // vite.module.config.ts
 *   plugins: [react(), tailwindcss(), nuikit({ hotInGame: false }), nuikitModule()]
 *
 * Output is one classic script (no CORS needed across cfx-nui-* origins) that calls
 * window.__nuikit.define(factory). React comes from the host; the module's CSS (lowered for
 * Chromium 103 by nuikit()) is inlined and available as `import css from "virtual:nuikit-module-css"`.
 */
export function nuikitModule(options: NuikitModuleOptions = {}): Plugin {
  const { entry = "src/module.tsx", fileName = "module.js" } = options;
  let target: string | string[] = "chrome103";
  return {
    name: "nuikit:module",
    enforce: "post",
    config() {
      return {
        define: { "process.env.NODE_ENV": JSON.stringify("production") },
        build: {
          // The ui_page build already wrote dist/; add module.js beside it.
          emptyOutDir: false,
          copyPublicDir: false,
          cssCodeSplit: false,
          // Minified in generateBundle, after the factory wrapper is added (Vite's own iife
          // minification would move a banner inside its wrapper).
          minify: false,
          lib: { entry, formats: ["iife"], name: "__nkModule", fileName: () => fileName },
          rollupOptions: {
            external: Object.keys(SHARED),
            output: { globals: SHARED, inlineDynamicImports: true },
          },
        },
      };
    },
    resolveId(id) {
      if (id === CSS_ID) return "\0" + CSS_ID;
    },
    load(id) {
      if (id === "\0" + CSS_ID) return `export default ${JSON.stringify(PLACEHOLDER)};`;
    },
    configResolved(config) {
      target = config.build.target as string | string[];
    },
    async generateBundle(_opts, bundle) {
      let css = "";
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "asset" && name.endsWith(".css")) {
          css += typeof file.source === "string" ? file.source : Buffer.from(file.source).toString("utf8");
          delete bundle[name];
        }
      }
      for (const file of Object.values(bundle)) {
        if (file.type !== "chunk") continue;
        const code = file.code.replace(new RegExp(`(["'\`])${PLACEHOLDER}\\1`, "g"), () => JSON.stringify(css));
        // The host runs the factory while this script executes and passes its shared deps.
        const wrapped = `window.__nuikit.define(function (deps) {\n${code}\nreturn __nkModule;\n});\n`;
        const out = await transformWithEsbuild(wrapped, file.fileName, { minify: true, target, loader: "js" });
        file.code = out.code;
        file.map = null;
      }
    },
  };
}
