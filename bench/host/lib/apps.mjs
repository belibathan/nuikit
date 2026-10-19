// The UIs a simulated server runs: real nuikit systems and overrides, built as they ship
// (ui_page builds from `pnpm build:systems`) and as host modules (bench/host/build.mjs).
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const OUT = path.join(REPO, "bench/host/.out");

/** web: the Vite root; page: its ui_page build, relative to web. */
export const APPS = [
  { name: "nuikit_hud", web: "systems/nuikit_hud/web", page: "dist/index.html" },
  { name: "qbx_taxijob", web: "addons/qbx_taxijob/web", page: "build/meter.html" },
  { name: "nuikit_death", web: "systems/nuikit_death/web", page: "dist/index.html" },
  { name: "ox_lib", web: "addons/ox_lib/web", page: "build/index.html" },
  { name: "nuikit_pause", web: "systems/nuikit_pause/web", page: "dist/index.html" },
  { name: "ox_inventory", web: "addons/ox_inventory/web", page: "build/index.html" },
  { name: "ox_target", web: "addons/ox_target/web", page: "build/index.html" },
  { name: "qbx_scoreboard", web: "addons/qbx_scoreboard/web", page: "build/ui.html" },
  { name: "qbx_idcard", web: "addons/qbx_idcard/web", page: "build/index.html" },
  { name: "qbx_vehiclesales", web: "addons/qbx_vehiclesales/web", page: "build/ui.html" },
  { name: "Renewed-Banking", web: "addons/Renewed-Banking/web", page: "build/index.html" },
  { name: "illenium-appearance", web: "addons/illenium-appearance/web", page: "build/index.html" },
  { name: "mm_radio", web: "addons/mm_radio/web", page: "build/index.html" },
];

/** N resources: the apps in order, then copies under new names (each its own frame / module). */
export function server(n) {
  const list = [];
  for (let i = 0; list.length < n; i++) {
    const app = APPS[i % APPS.length];
    const copy = Math.floor(i / APPS.length);
    list.push({ ...app, resource: copy ? `${app.name}_${copy + 1}` : app.name });
  }
  return list;
}

// Case-insensitive: Chromium lowercases hostnames, so https://cfx-nui-Renewed-Banking/ arrives as renewed-banking (FiveM resolves it either way).
export const appOf = (resource) => {
  const r = resource.toLowerCase();
  return APPS.find((a) => r === a.name.toLowerCase() || r.startsWith(a.name.toLowerCase() + "_"));
};
