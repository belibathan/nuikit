// Builds what the benchmark and the end-to-end check load, into bench/host/.out:
//   modules/<app>/module.js   every app in lib/apps.mjs as a host module (same App + CSS as its
//                             ui_page; React from the host). nuikit_hud ships its own.
//   probe/                    a tiny UI that times fetchNui round trips, as a page and a module
//   broken/module.js          a module that throws while rendering (error isolation)
//
// Needs: pnpm -r --filter "./packages/**" build && pnpm build:systems
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { APPS, OUT, REPO } from "./lib/apps.mjs";

const only = process.argv.slice(2);
const { nuikit, nuikitModule } = await import(pathToFileURL(path.join(REPO, "packages/vite/dist/index.js")).href);

async function viteFor(webDir, plugins = true) {
  const require = createRequire(path.join(webDir, "package.json"));
  const load = (id) => import(pathToFileURL(require.resolve(id)).href);
  if (!plugins) return { vite: await load("vite") };
  return { vite: await load("vite"), react: (await load("@vitejs/plugin-react")).default, tailwind: (await load("@tailwindcss/vite")).default };
}

for (const app of APPS) {
  if (only.length && !only.includes(app.name)) continue;
  const web = path.join(REPO, app.web);
  const outDir = path.join(OUT, "modules", app.name);
  // nuikit_hud is converted for real: use its own module build.
  if (app.name === "nuikit_hud") {
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(path.join(web, "dist/module.js"), path.join(outDir, "module.js"));
    console.log(`✓ ${app.name} (its own web/dist/module.js)`);
    continue;
  }
  const main = fs.readFileSync(path.join(web, "src/main.tsx"), "utf8");
  const cssImports = [...main.matchAll(/^import\s+["'](\.\/[^"']+\.css)["'];?$/gm)].map((m) => m[1]);
  const entry = path.join(web, "src/__nk_bench_module.tsx");
  fs.writeFileSync(
    entry,
    [
      `import css from "virtual:nuikit-module-css";`,
      `import { defineReactModule } from "nuikit-core/module";`,
      `import App from "./App";`,
      ...cssImports.map((c) => `import "${c}";`),
      `export default defineReactModule({ App, css });`,
    ].join("\n"),
  );
  const { vite, react, tailwind } = await viteFor(web);
  const cwd = process.cwd();
  process.chdir(web);
  try {
    await vite.build({
      configFile: false,
      root: web,
      logLevel: "warn",
      plugins: [react(), tailwind(), nuikit({ hotInGame: false, report: false, manifest: "/nonexistent" }), nuikitModule({ entry })],
      resolve: { alias: { "@": path.join(web, "src") } },
      build: { outDir },
    });
  } finally {
    process.chdir(cwd);
    fs.rmSync(entry);
  }
  console.log(`✓ ${app.name} → ${path.relative(REPO, outDir)}/module.js (${(fs.statSync(path.join(outDir, "module.js")).size / 1024).toFixed(0)} kB)`);
}

// ── probe: times fetchNui round trips. Same code as a ui_page (iframe) and as a module.
if (!only.length || only.includes("probe")) {
  const web = path.join(REPO, "systems/nuikit/web"); // borrow its vite + react
  const { vite } = await viteFor(web, false);
  const probe = path.join(REPO, "bench/host/probe");
  const alias = [
    { find: /^nuikit-core$/, replacement: path.join(REPO, "packages/core/src/index.ts") },
    { find: /^nuikit-core\/module$/, replacement: path.join(REPO, "packages/core/src/module.ts") },
  ];
  await vite.build({
    configFile: false,
    root: probe,
    logLevel: "warn",
    base: "./",
    resolve: { alias },
    build: { outDir: path.join(OUT, "probe"), emptyOutDir: true, target: "chrome103" },
  });
  await vite.build({
    configFile: false,
    root: probe,
    logLevel: "warn",
    resolve: { alias },
    plugins: [nuikitModule({ entry: path.join(probe, "module.ts") })],
    build: { outDir: path.join(OUT, "probe"), target: "chrome103" },
  });
  console.log("✓ probe (page + module)");
}

// ── broken: throws while rendering, through the host's own React.
fs.mkdirSync(path.join(OUT, "broken"), { recursive: true });
fs.writeFileSync(
  path.join(OUT, "broken/module.js"),
  `window.__nuikit.define(function (deps) {
  var R = deps.react;
  function Broken() { throw new Error("broken on purpose"); }
  return { default: { mount: function (el) { var root = deps.reactDomClient.createRoot(el); root.render(R.createElement(Broken)); return function () { root.unmount(); }; } } };
});\n`,
);
console.log("✓ broken");
