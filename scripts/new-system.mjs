// Scaffold a [nuikit] system or an addon (a UI replacement for another resource).
//
//   node scripts/new-system.mjs systems/nuikit_pause "Pause menu"
//   node scripts/new-system.mjs addons/ox_target "ox_target UI" --resource ox_target --path web
//
// Systems get fxmanifest.lua, client/main.lua and web/ (builds to web/dist).
// Addons get web/ (builds to web/build); `pnpm pack:systems` copies the build into
// overrides/<resource>/<path>/ in the release zip, so it merges into the real resource.
// Then: add components to nuikit.json, `pnpm sync`, `pnpm install`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [dir, title = "", ...rest] = process.argv.slice(2);
if (!dir || !/^(systems|addons)\/[\w-]+$/.test(dir)) {
  console.error('usage: new-system.mjs systems/<name>|addons/<name> "Title" [--resource r --path p]');
  process.exit(1);
}
const flag = (f) => {
  const i = rest.indexOf(f);
  return i >= 0 ? rest[i + 1] : undefined;
};
const addon = dir.startsWith("addons/");
const name = path.basename(dir);
const out = path.join(root, dir);
if (fs.existsSync(out)) {
  console.error(`${dir} exists`);
  process.exit(1);
}

const write = (rel, content) => {
  const p = path.join(out, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/^\n/, ""));
};
const version = JSON.parse(fs.readFileSync(path.join(root, "packages/core/package.json"), "utf8")).version;
const hud = path.join(root, "systems/nuikit_hud/web");

const manifest = addon
  ? { target: { resource: flag("--resource") ?? name, path: flag("--path") ?? "web/build" }, lua: [], components: ["button", "card"] }
  : { lua: ["nuikit.lua", "bridge.lua"], components: ["button", "card"] };
write("nuikit.json", JSON.stringify(manifest, null, 2) + "\n");

const pkg = JSON.parse(fs.readFileSync(path.join(hud, "package.json"), "utf8"));
pkg.name = `${name.replace(/_/g, "-").toLowerCase()}-web`;
pkg.version = version;
write("web/package.json", JSON.stringify(pkg, null, 2) + "\n");
fs.mkdirSync(path.join(out, "web/src/lib"), { recursive: true });
fs.copyFileSync(path.join(hud, "tsconfig.json"), path.join(out, "web/tsconfig.json"));
fs.copyFileSync(path.join(hud, "src/lib/utils.ts"), path.join(out, "web/src/lib/utils.ts"));
write(
  "web/index.html",
  `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />${addon ? '\n    <meta name="nuikit-handshake" content="off" />' : ""}
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
);
write(
  "web/vite.config.ts",
  `import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { nuikit } from "vite-plugin-nuikit";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), nuikit(${addon ? "{ hotInGame: false }" : ""})],
  base: "./",${addon ? `\n  build: { outDir: "build", emptyOutDir: true },` : ""}
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
`,
);
write(
  "web/src/main.tsx",
  `import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Browser-only devtools (press \`). Not bundled into the build the game loads.
const Dev = import.meta.env.DEV ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
`,
);
write(
  "web/src/App.tsx",
  `export default function App() {
  return null;
}
`,
);
write(
  "web/src/dev.tsx",
  `// The game, faked for browser development. Press \` for the devtools.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";

const mocks = defineMocks({ events: {} });

export default function Dev() {
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
`,
);

if (!addon) {
  write(
    "fxmanifest.lua",
    `fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name '${name}'
description 'nuikit: ${title}'
repository 'https://github.com/belibathan/nuikit'
version '${version}'

ui_page 'web/dist/index.html'

files {
  'web/dist/index.html',
  'web/dist/**/*',
}

client_scripts {
  'client/nuikit.lua',
  'client/bridge.lua',
  'client/main.lua',
}
`,
  );
  write("client/main.lua", `-- ${name}: client\n`);
}

write(
  "README.md",
  `# ${name}

${title}
`,
);
console.log(`✓ ${dir}. Next: edit nuikit.json components, then \`pnpm sync && pnpm install\`.`);
