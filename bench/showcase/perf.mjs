// Headless cost of two built NUI pages (pause, ox_inventory override): frames drawn and renderer
// main-thread time per scenario. Run: PLAYWRIGHT_CORE=<path to playwright-core> node bench/showcase/perf.mjs
// (CHROME=<chrome.exe> to override the browser). Reuses bench/motion/trace.mjs.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { trace } from "../motion/trace.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_CORE ?? "playwright-core");
const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };

async function open(browser, resource, build) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await context.addInitScript((res) => {
    Object.defineProperty(window, "GetParentResourceName", { value: () => res });
    const real = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      if (String(url).startsWith(`https://${res}/`)) return Promise.resolve(new Response('{"ok":true}', { headers: { "content-type": "application/json" } }));
      return real(url, opts);
    };
  }, resource);
  await context.route(new RegExp(`^https://cfx-nui-${resource}/`), (route) => {
    const file = path.join(build, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!file.startsWith(build) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] ?? "application/octet-stream", body: fs.readFileSync(file) });
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  await page.goto(`https://cfx-nui-${resource}/index.html`);
  await page.waitForTimeout(800);
  return { context, page };
}
const send = (page, action, data) => page.evaluate(([a, d]) => window.postMessage({ action: a, data: d }, "*"), [action, data]);
/** Running animations and what they animate: the suspects when an idle page draws frames. */
const animations = (page) =>
  page.evaluate(() =>
    document.getAnimations().filter((a) => a.playState === "running").map((a) => {
      const el = a.effect?.target;
      return `${a.animationName ?? a.transitionProperty ?? "anim"} on <${el?.tagName?.toLowerCase()} class="${String(el?.className?.baseVal ?? el?.className ?? "").slice(0, 60)}">`;
    }).slice(0, 8));

// ---- pause
const places = [["pillbox", 298.6, -584.5], ["mrpd", 428.2, -981], ["cityhall", -544.9, -204.3], ["legion", 195.2, -933.8], ["lsc", -337, -136.9], ["pdm", -56.8, -1098.8]]
  .map(([id, x, y]) => ({ id, label: id, category: "Services", icon: "hospital", x, y }));
const pauseData = {
  server: { name: "Los Santos", tagline: "Roleplay", logo: "LS" }, links: [{ label: "Discord", value: "discord.gg/x" }],
  buttons: ["resume", "map", "keybinds", "info", "settings", "disconnect"], help: [{ key: "Z", label: "Radial menu" }],
  serverId: 7, playerName: "niko", players: 42, maxPlayers: 128, ping: 38, uptime: 11520, restartIn: 7500,
  views: { map: true, keys: true, info: true, preview: true }, preview: true, places, pages: [],
};
const player = { loaded: true, id: "ABC123", name: "Niko Bellic", health: 86, armor: 40, cash: 1520, bank: 48210, job: { name: "police", label: "LSPD", grade: 2, gradeLabel: "Sergeant", onDuty: true }, dead: false, voice: { range: 3, talking: false } };
const N = 60;
const blips = Array.from({ length: N }, (_, i) => ({ id: 1000 + i, x: -800 + (i % 10) * 160, y: -1400 + Math.floor(i / 10) * 220, z: 30, s: [61, 108, 59, 110, 366, 71][i % 6], c: i % 5, sr: i % 2 === 0, a: 255, e: 4 }));
const pinsAt = (t) => {
  const b = [];
  for (let i = 0; i < 60; i++) b.push(0.1 + (i % 10) * 0.08 + 0.02 * Math.sin(t / 300 + i), 0.15 + Math.floor(i / 10) * 0.12 + 0.02 * Math.cos(t / 300 + i));
  return { at: [0.2, 0.4, 0.3, 0.4, 0.4, 0.4, 0.5, 0.4, 0.6, 0.4, 0.7, 0.4], b, d: 900, you: [0.5 + 0.1 * Math.sin(t / 500), 0.5, (t / 10) % 360], wp: [0.56, 0.36], h: 20 };
};
const openPause = (page, view) => send(page, "nuikit:surfaces", { surfaces: { pause: { open: true, visible: true, focused: true, layer: "panel", z: 1, data: { ...pauseData, view } } }, states: {} });
const stream = (page) => page.evaluate((src) => { const f = (0, eval)(`(${src})`); const t0 = performance.now(); setInterval(() => window.postMessage({ action: "pause:map:pins", data: f(performance.now() - t0) }, "*"), 16); }, pinsAt.toString());

async function pause(browser, name, setup, settle = 1000) {
  const { context, page } = await open(browser, "nuikit_pause", path.join(REPO, "systems/nuikit_pause/web/dist"));
  await send(page, "nuikit:player", player);
  await setup(page);
  await page.waitForTimeout(settle);
  const r = await trace(page, () => page.waitForTimeout(2000));
  r.anims = r.frames > 0 ? await animations(page) : [];
  await context.close();
  return [name, r];
}

// ---- ox_inventory
const items = {}, slots = [];
for (let i = 1; i <= 30; i++) { items[`item${i}`] = { label: `Item ${i}`, stack: true, close: true, count: 2 }; slots.push({ slot: i, name: `item${i}`, count: 2, weight: 200, metadata: i % 7 === 0 ? { durability: 70 } : {} }); }
const oxInit = { locale: { ui_close: "Close" }, items, imagepath: "images", leftInventory: { id: 1, slots: 50, items: slots, maxWeight: 30000 } };
const left = { id: 1, type: "player", label: "Niko", slots: 50, items: slots, maxWeight: 30000, groups: {} };
const right = { id: "drop1", type: "drop", label: "Drop", slots: 20, items: slots.slice(0, 6).map((s, i) => ({ ...s, slot: i + 1 })), maxWeight: 10000 };
async function ox(browser, name, mode) {
  const { context, page } = await open(browser, "ox_inventory", path.join(REPO, "addons/ox_inventory/web/build"));
  await send(page, "init", oxInit);
  if (mode === "idle") await send(page, "setupInventory", { leftInventory: left, rightInventory: right });
  await page.waitForTimeout(1500);
  const r = await trace(page, async () => {
    if (mode === "transition") { await send(page, "setupInventory", { leftInventory: left, rightInventory: right }); await page.waitForTimeout(600); }
    else await page.waitForTimeout(2000);
  });
  r.anims = r.frames > 0 && mode !== "transition" ? await animations(page) : [];
  await context.close();
  return [name, r];
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const version = browser.version();
const mapSetup = (p) => openPause(p, "map").then(() => send(p, "pause:map:blips", blips));
const rows = [
  await pause(browser, "pause: closed", async () => {}),
  await pause(browser, "pause: open, Home idle", (p) => openPause(p, "home")),
  await pause(browser, "pause: map idle (60 blips, one pins)", async (p) => { await mapSetup(p); await send(p, "pause:map:pins", pinsAt(0)); }, 1500),
  await pause(browser, "pause: map, pins at 60 Hz", async (p) => { await mapSetup(p); await stream(p); }, 1500),
  await ox(browser, "ox_inventory: closed", "closed"),
  await ox(browser, "ox_inventory: open, idle", "idle"),
  await ox(browser, "ox_inventory: open transition (600 ms)", "transition"),
];
await browser.close();

const f = (n) => (Math.round(n * 100) / 100).toString();
const lines = [`Chrome ${version}, headless, 1920x1080, 2 s trace per scenario`, "", "| scenario | frames | main ms | ms/frame | longest task ms |", "|---|---|---|---|---|"];
for (const [n, r] of rows) lines.push(`| ${n} | ${r.frames} | ${f(r.mainMs)} | ${f(r.mainPerFrameMs)} | ${f(r.longestTaskMs)} |`);
for (const [n, r] of rows) if (r.anims?.length) lines.push("", `${n} animations: ${r.anims.join("; ")}`);
console.log(lines.join("\n"));
