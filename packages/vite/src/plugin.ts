import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { formatReport, lowerCss, type CompatReport } from "./compat";

export interface NuikitOptions {
  /** Path to the resource's fxmanifest.lua, relative to the Vite root. Default: "../fxmanifest.lua" */
  manifest?: string;
  /** Built UI entry, relative to the fxmanifest. Default: "web/dist/index.html" */
  page?: string;
  /**
   * Point `ui_page` at the Vite dev server during `vite dev` for in-game hot reload.
   * Restored on exit and on build. Default: true
   */
  hotInGame?: boolean;
  /**
   * Lower modern CSS (Tailwind v4 / shadcn) for FiveM's Chromium 103. Default: true.
   * Pass a number to target a different Chromium (e.g. when Cfx ships a newer CEF).
   */
  compat?: boolean | number;
  /**
   * Opt in to polyfilling :has() (used by shadcn's Button, Card and Item for small layout
   * tweaks) with css-has-pseudo. Fine for static menus; avoid it on HUDs that update many
   * times a second, because its runtime re-evaluates selectors on every DOM change.
   * Default false.
   */
  hasPolyfill?: boolean;
  /** Print the compat report. Default: true */
  report?: boolean;
}

const UI_PAGE = /^(\s*ui_page\s+)(['"])(.*?)\2/m;
const CSS_ID = /\.(css|pcss|postcss)(?:$|\?)(?!.*[?&](?:raw|url|inline)\b)/;

/**
 * The nuikit Vite plugin. Put it after `tailwindcss()`:
 *
 *   plugins: [react(), tailwindcss(), nuikit()]
 */
export function nuikit(options: NuikitOptions = {}): Plugin {
  const { manifest = "../fxmanifest.lua", page = "web/dist/index.html", hotInGame = true, compat = true, report: showReport = true } = options;
  const hasPolyfill = Boolean(compat) && options.hasPolyfill === true;
  const chrome = typeof compat === "number" ? compat : 103;
  let manifestPath = "";
  let config: ResolvedConfig;
  const reported = new Set<string>();

  const writeUiPage = (target: string) => {
    if (!manifestPath || !fs.existsSync(manifestPath)) return false;
    const src = fs.readFileSync(manifestPath, "utf8");
    if (!UI_PAGE.test(src)) return false;
    const next = src.replace(UI_PAGE, (_m, pre, q) => `${pre}${q}${target}${q}`);
    if (next !== src) fs.writeFileSync(manifestPath, next);
    return true;
  };

  const log = (r: CompatReport, file: string) => {
    if (!showReport || reported.has(file)) return;
    reported.add(file);
    config.logger.info("\n" + formatReport(r, file) + "\n");
  };

  return {
    name: "nuikit",

    config(user) {
      return {
        base: user.base ?? "./",
        build: { target: "chrome" + chrome, cssTarget: "chrome" + chrome, emptyOutDir: true },
        server: { host: true, cors: true },
      };
    },

    configResolved(resolved) {
      config = resolved;
      manifestPath = path.resolve(resolved.root, manifest);
      if (resolved.command === "build") writeUiPage(page);

      const names = resolved.plugins.map((p) => p.name);
      const tw = names.findIndex((n) => n.startsWith("@tailwindcss/vite"));
      const me = names.indexOf("nuikit");
      if (compat && tw > me && me >= 0) {
        resolved.logger.warn("[nuikit] put nuikit() after tailwindcss() in your Vite plugins so in-game dev CSS gets lowered.");
      }
    },

    // Dev: lower each stylesheet as it's served, so in-game HMR renders correctly.
    transform(code, id) {
      if (!compat || config.command !== "serve" || !CSS_ID.test(id)) return;
      if (/^\s*(import|export)\b/.test(code)) return; // already a JS module
      const { code: out, report } = lowerCss(code, { chrome, filename: id, has: hasPolyfill });
      log(report, path.relative(config.root, id.split("?")[0]!));
      return { code: out, map: null };
    },

    // Build: lower the final, bundled CSS — catches every stylesheet regardless of plugin order.
    generateBundle(_opts, bundle) {
      if (!compat) return;
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;
        const source = typeof file.source === "string" ? file.source : Buffer.from(file.source).toString("utf8");
        const { code, report } = lowerCss(source, { chrome, filename: file.fileName, minify: true, has: hasPolyfill });
        file.source = code;
        log(report, file.fileName);
      }
    },

    // css-has-pseudo's runtime keeps the attribute selectors in sync with the DOM.
    transformIndexHtml() {
      if (!hasPolyfill) return;
      const require = createRequire(import.meta.url);
      const runtime = fs.readFileSync(require.resolve("css-has-pseudo/browser-global"), "utf8").replace(/\/\/# sourceMappingURL=.*$/m, "");
      return [
        {
          tag: "script",
          attrs: { "data-nuikit": "has-polyfill" },
          children: `${runtime}\nif(!CSS.supports("selector(:has(*))"))cssHasPseudo(document,{hover:true});`,
          injectTo: "head-prepend",
        },
      ];
    },

    configureServer(server) {
      if (!hotInGame) return;
      server.httpServer?.once("listening", () => {
        const address = server.httpServer?.address();
        const port = typeof address === "object" && address ? address.port : server.config.server.port ?? 5173;
        const url = `http://localhost:${port}`;
        if (writeUiPage(url)) {
          server.config.logger.info(
            `\n  \x1b[35m◆ nuikit\x1b[0m ui_page → ${url}\n  \x1b[2mensure the resource once — every save now hot-reloads in game\x1b[0m\n`,
          );
        }
      });
      const restore = () => writeUiPage(page);
      server.httpServer?.once("close", restore);
      for (const sig of ["SIGINT", "SIGTERM"] as const) {
        process.once(sig, () => {
          restore();
          process.exit(0);
        });
      }
    },
  };
}
