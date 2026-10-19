// End-to-end check of the host prototype: the real Lua (nuikit.lua, host.lua, bridge.lua and
// nuikit_hud's client, under Lua 5.4 via the wasmoon harness) drives the real host page and the
// real HUD module in Chromium, through the fake NUI in lib/nui.mjs.
//
//   node bench/host/build.mjs && node bench/host/e2e.mjs      → screenshots in bench/host/.out/e2e
//
// Checks: discovery + mount, Lua → module and module → Lua through the host, the HUD's own
// ui_page staying empty, the server theme reaching the shadow root, Radix portals and focus in a
// shadow root (ox_lib's input dialog), error isolation, fallback to the ui_page when the host
// stops, and the three resolutions.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { OUT, REPO } from "./lib/apps.mjs";
import { ROOT_URL, installNui } from "./lib/nui.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("/home/claude/nuikit/node_modules/.pnpm/playwright-core@1.56.0/node_modules/playwright-core");
const { createClient } = await import(pathToFileURL(path.join(REPO, "packages/core/test/lua/harness.ts")).href);

const shots = path.join(OUT, "e2e");
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` (${detail})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await sleep(50);
  }
}

// A vivid server theme, so it's obvious whether it reached the module (green primary).
const THEME = `.dark { --primary: oklch(0.72 0.19 150); --primary-foreground: #04120a; --chart-1: #f59e0b; --chart-2: #38bdf8; }`;

const HUD = path.join(REPO, "systems/nuikit_hud/");
const hudNatives = `
  STARTED = { qbx_core = true, nuikit = true }
  PD = {}
  function GetResourceState(r) return (STARTED[r] or r == 'nuikit_hud') and 'started' or 'missing' end
  function GetConvar(_, d) return d end
  function PlayerPedId() return 1 end
  function PlayerId() return 0 end
  function GetEntityHealth() return 170 end
  function GetEntityMaxHealth() return 200 end
  function GetPedArmour() return 40 end
  function IsEntityDead() return false end
  function NetworkIsPlayerTalking() return false end
  function IsPauseMenuActive() return false end
  function CreateThread() end
  function Wait() end
  function LoadResourceFile(r, f) return THEME end
  LocalPlayer = { state = {} }
  exports = { qbx_core = { GetPlayerData = function() return PD end } }
`;
const player = {
  citizenid: "ABC123",
  charinfo: { firstname: "Niko", lastname: "Bellic" },
  money: { cash: 1520, bank: 48210 },
  job: { name: "police", label: "LSPD", grade: { level: 2, name: "Sergeant" }, onduty: true },
  metadata: { hunger: 72, thirst: 58, stress: 12 },
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
const requests = [];
context.on("request", (r) => requests.push(r.url()));
const posts = [];

// ── the Lua side
let chain = Promise.resolve();
const frames = new Set();
const client = await createClient({
  onNuiMessage: (resource, msg) => {
    // SendNUIMessage before the frame exists is lost, as in game.
    if (!frames.has(resource)) return;
    chain = chain.then(() => page.evaluate(([r, m]) => window.send(r, m), [resource, msg]).catch(() => {}));
  },
});
let forcedFocus = null; // the ox_lib check stands in for ox_lib's Lua, which would take focus
const syncFocus = () => {
  const owner = forcedFocus ?? client.focused();
  chain = chain.then(() => page.evaluate((r) => window.focusFrame(r), owner).catch(() => {}));
};

const files = { nuikit: path.join(REPO, "systems/nuikit"), nuikit_hud: HUD, ox_lib: path.join(OUT, "modules/ox_lib"), broken: path.join(OUT, "broken") };
await installNui(context, {
  files: (r) => files[r] ?? null,
  overrides: { "https://cfx-nui-nuikit/theme.css": THEME }, // the server's theme.css
  onCallback: async (resource, name, body) => {
    posts.push({ resource, name, body });
    const res = client.resources.get(resource);
    if (!res) return {};
    let out;
    try {
      out = await res.call(name, body);
    } catch {
      out = {}; // no such callback in that resource's Lua
    }
    syncFocus();
    return out;
  },
});
await page.goto(ROOT_URL);

async function startResource(name, opts, ui) {
  const res = await client.start(name, opts);
  if (ui) {
    frames.add(name);
    await page.evaluate(([r, u]) => window.addFrame(r, u), [name, ui]);
  }
  return res;
}

// The host first (it's `ensure nuikit` before `ensure [nuikit]`), then the HUD.
const host = await startResource(
  "nuikit",
  { before: `THEME = [[${THEME}]] function LoadResourceFile() return THEME end`, scripts: ["host.lua"] },
  "https://cfx-nui-nuikit/web/dist/index.html?shadow=open&debug=1",
);
const hud = await startResource(
  "nuikit_hud",
  { before: `THEME = [[${THEME}]]` + hudNatives, scripts: [HUD + "config.lua", "bridge.lua", HUD + "client/main.lua"], metadata: { nuikit_ui: ["web/dist/module.js"] } },
  "https://cfx-nui-nuikit_hud/web/dist/index.html",
);
const hostFrame = () => page.frames().find((f) => f.url().startsWith("https://cfx-nui-nuikit/"));
const hudFrame = () => page.frames().find((f) => f.url().startsWith("https://cfx-nui-nuikit_hud/"));

const mounted = await until(() => hostFrame()?.evaluate(() => window.__nuikitHost?.modules().find((m) => m.resource === "nuikit_hud")?.status === "mounted"));
check("host discovers nuikit_hud (nuikit_ui) and mounts its module", !!mounted);
check("nuikit_hud's Lua is in hosted mode", (await hud.run("return NUI.hosted")) === true);

// Character loads → bridge.lua sends the player, main.lua opens the hud surface: all via the host.
client.event("QBCore:Player:SetPlayerData", player);
await chain;
const inShadow = (sel) => hostFrame().evaluate((s) => !!document.querySelector('nk-module[data-resource="nuikit_hud"]')?.shadowRoot?.querySelector(s), sel);
check("Lua → module: player + surface reach the HUD module", !!(await until(() => inShadow('[data-surface="hud"] [aria-label="Cash"]'))));

await hud.run(`NUI.send('hud:vehicle', { speed = 87, units = 'mph', rpm = 0.62, gear = 4, fuel = 64, engine = 92, seatbelt = false })`);
await chain;
check("Lua → module: hud:vehicle renders the speedometer", !!(await until(() => inShadow("svg"))));

check(
  "module → Lua: the handshake (nuikit:ready) went through nuikit:host:call to nuikit_hud's Lua",
  posts.some((p) => p.resource === "nuikit" && p.name === "nuikit:host:call" && p.body.n === "nuikit:ready"),
);
check("no module traffic hits nuikit_hud's own callbacks except nuikit:host:mode", posts.filter((p) => p.resource === "nuikit_hud").every((p) => p.name === "nuikit:host:mode"));
const standaloneLoaded = requests.some((u) => /cfx-nui-nuikit_hud\/web\/dist\/assets\/standalone-/.test(u));
const hudBody = await hudFrame().evaluate(() => document.getElementById("root")?.childElementCount ?? -1);
check("the HUD's own ui_page stays empty (boot only, standalone bundle never fetched)", !standaloneLoaded && hudBody === 0, `root children ${hudBody}`);

// The server theme: nuikit.lua sent theme.css; the module's built-in default must not win.
// The host page applies the theme once (its own handshake with nuikit's Lua); modules don't.
await until(() => hostFrame().evaluate(() => /rgba\(32, 196/.test(getComputedStyle(document.documentElement).getPropertyValue("--primary"))), 3000);
const colors = await hostFrame().evaluate(() => {
  const root = document.querySelector('nk-module[data-resource="nuikit_hud"]').shadowRoot;
  const el = root.querySelector('[data-surface="hud"]');
  return {
    doc: getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    inner: getComputedStyle(el).getPropertyValue("--primary").trim(),
    chart1: getComputedStyle(el).getPropertyValue("--chart-1").trim(),
  };
});
const [r, g, b] = (colors.inner.match(/[\d.]+/g) ?? []).map(Number);check("server theme reaches the shadow root (module sees the theme's green --primary, not its default)", colors.inner === colors.doc && g > r && g > b, JSON.stringify(colors));

for (const [w, h] of [[1920, 1080], [2560, 1440], [1280, 720]]) {
  await page.setViewportSize({ width: w, height: h });
  await sleep(300);
  await page.screenshot({ path: path.join(shots, `hud-hosted-${w}x${h}.png`) });
}
await page.setViewportSize({ width: 1920, height: 1080 });

// ── Radix in a shadow root: ox_lib's input dialog (portal, focus trap, select popover).
// ox_lib's Lua can't route through the host (it isn't nuikit.lua), so this only checks rendering
// and input: the test posts its message as host.lua would, and its posts go nowhere.
await hostFrame().evaluate(() => window.__nuikitHost.load({ resource: "ox_lib", url: "https://cfx-nui-ox_lib/module.js" }));
await until(() => hostFrame().evaluate(() => window.__nuikitHost.modules().find((m) => m.resource === "ox_lib")?.status === "mounted"));
forcedFocus = "nuikit";
await page.evaluate(() => window.focusFrame("nuikit"));
await page.evaluate(() =>
  window.send("nuikit", {
    nkm: "ox_lib",
    action: "openDialog",
    data: {
      heading: "Register vehicle",
      rows: [
        { type: "input", label: "Plate", placeholder: "ABC 123" },
        { type: "select", label: "Colour", options: [{ value: "red", label: "Red" }, { value: "blue", label: "Blue" }] },
        { type: "checkbox", label: "Insured" },
      ],
    },
  }),
);
const ox = () => hostFrame().evaluate(() => {
  const root = document.querySelector('nk-module[data-resource="ox_lib"]').shadowRoot;
  const dialog = root.querySelector('[role="dialog"]');
  const active = root.activeElement;
  return {
    dialogInShadow: !!dialog,
    dialogInBody: !!document.body.querySelector(':scope > [role="dialog"], :scope > div > [role="dialog"]'),
    styled: dialog ? getComputedStyle(dialog).position === "fixed" && getComputedStyle(dialog).backgroundColor !== "rgba(0, 0, 0, 0)" : false,
    active: active ? active.tagName + (active.getAttribute("placeholder") ? `[${active.getAttribute("placeholder")}]` : "") : null,
    listbox: !!root.querySelector('[role="listbox"]'),
    value: root.querySelector('input[placeholder="ABC 123"]')?.value,
  };
});
await until(async () => (await ox()).dialogInShadow);
let s = await ox();
check("Radix Dialog portals into the module's shadow root, styled", s.dialogInShadow && !s.dialogInBody && s.styled, JSON.stringify(s));
if (!s.dialogInShadow) {
  console.log(await hostFrame().evaluate(() => JSON.stringify(window.__nuikitHost.modules())), consoleErrors.slice(-5));
  await page.screenshot({ path: path.join(shots, "debug.png") });
}
const frame = hostFrame();
await frame.locator('nk-module[data-resource="ox_lib"] input[placeholder="ABC 123"]').click();
await page.keyboard.type("NK 2026");
s = await ox();
check("focus trap lets you type into an input inside the dialog", s.value === "NK 2026", JSON.stringify(s));
await frame.locator('nk-module[data-resource="ox_lib"] [role="combobox"]').first().click();
await sleep(300);
s = await ox();
check("Select popover opens (portal) inside the shadow root", s.listbox, JSON.stringify(s));
await page.screenshot({ path: path.join(shots, "ox-lib-dialog-hosted.png") });
const after = await hostFrame().evaluate(() =>
  getComputedStyle(document.querySelector('nk-module[data-resource="nuikit_hud"]').shadowRoot.querySelector('[data-surface="hud"]')).getPropertyValue("--primary").trim(),
);
check("the HUD keeps the server theme while another module is mounted", after === colors.doc, after);
if (s.listbox) {
  await frame.locator('nk-module[data-resource="ox_lib"] [role="option"]', { hasText: "Blue" }).click();
  await sleep(200);
  s = await ox();
  check("clicking an option inside the popover selects it and keeps the dialog open", !s.listbox && s.dialogInShadow, JSON.stringify(s));
}
await page.keyboard.press("Escape");
await sleep(400);
s = await ox();
check("Escape closes the dialog", !s.dialogInShadow, JSON.stringify(s));
forcedFocus = null;
await page.evaluate(() => window.focusFrame(null));

// ── a module that throws while rendering doesn't take the others down
await startResource("broken", { metadata: { nuikit_ui: ["module.js"] } });
await until(() => hostFrame().evaluate(() => window.__nuikitHost.modules().some((m) => m.resource === "broken")));
await sleep(500);
check("a broken module leaves the HUD rendered", await inShadow('[data-surface="hud"] svg'));
await page.screenshot({ path: path.join(shots, "hud-hosted-with-broken-neighbour.png") });

// ── module → Lua security, end to end: a forged token from the page is refused
const forged = await hostFrame().evaluate(() =>
  fetch("https://nuikit/nuikit:host:call", { method: "POST", body: JSON.stringify({ t: "0".repeat(32), n: "nuikit:ready" }) }).then((r) => r.json()),
);
check("a request with a made-up token is refused by host.lua", forged?.error === "unknown module", JSON.stringify(forged));

// ── the host stops: the HUD falls back to its own ui_page
client.stop("nuikit");
frames.delete("nuikit");
await page.evaluate(() => window.removeFrame("nuikit"));
await chain;
check("nuikit_hud leaves hosted mode when nuikit stops", (await hud.run("return NUI.hosted")) === false);
const fallback = await until(() => hudFrame().evaluate(() => !!document.querySelector('[data-surface="hud"] [aria-label="Cash"]')), 8000);
check("fallback: the HUD renders on its own ui_page (boot loaded standalone + handshake resent state)", !!fallback);
await page.screenshot({ path: path.join(shots, "hud-fallback-ui-page.png") });

await sleep(200);
const real = consoleErrors.filter((e) => !/broken on purpose|The above error occurred|nuikit host\] broken|Failed to load resource/.test(e));
check("no unexpected console errors", real.length === 0, real.slice(0, 3).join(" | "));

await browser.close();
client.close();
fs.writeFileSync(path.join(shots, "results.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
