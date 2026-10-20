// Proof for the identity layer: the same shipped screens in all four identities, at 1280×720, 1920×1080
// and 2560×1440, over a game scene, plus one contact sheet per identity. See results.md.
//
//   node bench/identity/shots.mjs [--ids=graphite,signal] [--screens=oxlib,pause] [--res=1920x1080]
//
// Starts each web app's Vite dev server (and stops it with SIGINT: the dev server restores the
// fxmanifest's ui_page on exit), loads its dev fixture, sends the identity as `nuikit:theme` (what the
// nuikit resource sends in game), and screenshots. Output: bench/identity/shots/<id>/<screen>-<res>.png,
// bench/identity/shots/<id>.png (contact sheet).
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const IDS = arg("ids", "graphite,signal,velvet,vector").split(",");
const RES = arg("res", "1280x720,1920x1080,2560x1440").split(",").map((r) => r.split("x").map(Number));
const OUT = path.join(here, "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const post = (page, msg) => page.evaluate((m) => window.postMessage(m, "*"), msg);
const nui = (action, data) => ({ action, data });

/** The screens: which app, which fixture, what to send after load, which scene. */
const SCREENS = {
  oxlib: {
    app: "addons/ox_lib/web",
    path: "/",
    scene: "street.jpg",
    async drive(page) {
      await post(page, nui("setLocale", { language: "English", ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } }));
      await post(page, nui("showContext", {
        title: "Garage — Legion Square",
        options: [
          { title: "Sultan RS", description: "Plate 46EEK572 · Stored", icon: "car", arrow: true, metadata: { Fuel: "71%", Engine: "98%", Body: "100%" }, progress: 71, colorScheme: "green" },
          { title: "Elegy Retro", description: "Plate 12LSC009 · Stored", icon: "car-side", arrow: true },
          { title: "Bati 801", description: "Plate 08KXR114 · Impounded", icon: "motorcycle", disabled: true },
          { title: "Pegasus delivery", description: "Order a vehicle from the depot", icon: "truck", menu: "depot" },
          { title: "Spots used", description: "2 of 6", icon: "circle-info", readOnly: true },
        ],
      }));
      for (const n of [
        { title: "Vehicle stored", description: "Your **Sultan RS** is in the Legion Square garage.", type: "success", position: "top-right", duration: 60000 },
        { title: "Not enough cash", description: "You need $2,500 for that.", type: "error", position: "top-right", duration: 60000 },
        { title: "Speed camera", description: "Flashed at 92 mph on Great Ocean Hwy", type: "warning", position: "top-right", duration: 60000 },
      ]) {
        await post(page, nui("notify", n));
        await sleep(60);
      }
      await post(page, nui("progress", { label: "Repairing engine", duration: 60000 }));
      await post(page, nui("textUi", { text: "[E] - Open garage", icon: "warehouse" }));
      await sleep(900);
      // keyboard to the first vehicle so the active row (the identity's indicator) shows
      await page.keyboard.press("Shift");
      await page.evaluate(() => {
        const row = [...document.querySelectorAll(".nk-row")].find((r) => r.textContent?.includes("Sultan RS"));
        row?.focus();
      });
      await sleep(400);
    },
  },
  pause: { app: "systems/nuikit_pause/web", path: "/?fixture=default", scene: null, settle: 1600 },
  death: { app: "systems/nuikit_death/web", path: "/?fixture=qbx-dead", scene: "stage-dusk.jpg", settle: 1200 },
  hud: { app: "systems/nuikit_hud/web", path: "/?fixture=driving", scene: "stage-day.jpg", settle: 1500 },
  bank: { app: "addons/Renewed-Banking/web", path: "/?bank", scene: "garage.jpg", settle: 1500 },
};
const CHOSEN = arg("screens", Object.keys(SCREENS).join(",")).split(",");

function startDev(app, port) {
  const dir = path.join(repo, app);
  const vite = path.join(dir, "node_modules/vite/bin/vite.js");
  const child = spawn(process.execPath, [vite, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  const ready = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`dev server for ${app} didn't start:\n${log}`)), 60000);
    const check = setInterval(() => {
      if (/Local:|ready in/.test(log)) {
        clearInterval(check);
        clearTimeout(t);
        resolve();
      }
    }, 100);
  });
  return { child, ready, url: `http://127.0.0.1:${port}` };
}

async function stopDev(dev) {
  if (dev.child.exitCode !== null) return;
  const exited = new Promise((r) => dev.child.once("exit", r));
  dev.child.kill("SIGINT");
  await Promise.race([exited, sleep(10000)]);
}

const themes = Object.fromEntries(IDS.map((id) => [id, fs.readFileSync(path.join(repo, "packages/core/themes", `${id}.css`), "utf8")]));
const bg = (name) => (name ? `data:image/jpeg;base64,${fs.readFileSync(path.join(repo, "apps/www/public/bg", name)).toString("base64")}` : null);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let port = 5800;
const made = [];
for (const name of CHOSEN) {
  const s = SCREENS[name];
  const dev = startDev(s.app, port++);
  try {
    await dev.ready;
    for (const id of IDS) {
      fs.mkdirSync(path.join(OUT, id), { recursive: true });
      for (const [w, h] of RES) {
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        // the devtools' own scene off; ours is a real-looking frame behind the page
        await page.addInitScript(() => localStorage.setItem("nuikit:scene", "none"));
        await page.goto(dev.url + s.path, { waitUntil: "networkidle" });
        const scene = bg(s.scene);
        await page.addStyleTag({
          content: `[data-nuikit-devtools], .nkdt-scene-bg { display: none !important; }
            ${scene ? `html { background: #000 url("${scene}") center / cover no-repeat fixed !important; }` : `html { background: #10141c !important; }`}`,
        });
        await post(page, nui("nuikit:theme", themes[id]));
        await sleep(300);
        if (s.drive) await s.drive(page);
        else await sleep(s.settle ?? 1000);
        await page.evaluate(() => document.fonts.ready);
        const file = path.join(OUT, id, `${name}-${w}x${h}.png`);
        await page.screenshot({ path: file });
        made.push({ id, name, w, h, file });
        await context.close();
      }
      console.log(`✓ ${name} · ${id}`);
    }
  } finally {
    await stopDev(dev);
  }
}

// contact sheets: one per identity, screens as rows, resolutions as columns
for (const id of IDS) {
  const shots = made.filter((m) => m.id === id);
  if (!shots.length) continue;
  const names = [...new Set(shots.map((m) => m.name))];
  const cols = RES.map(([w, h]) => `${w}x${h}`);
  const cell = (n, c) => {
    const f = shots.find((m) => m.name === n && `${m.w}x${m.h}` === c);
    return f ? `<img src="data:image/png;base64,${fs.readFileSync(f.file).toString("base64")}">` : "<div></div>";
  };
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#0b0b0c;color:#e5e5e5;font:600 20px Inter,system-ui,sans-serif;padding:24px}
    h1{font-size:28px;margin:0 0 16px;text-transform:capitalize} .g{display:grid;grid-template-columns:120px repeat(${cols.length},640px);gap:12px;align-items:center}
    img{width:640px;height:360px;object-fit:cover;border-radius:6px;display:block} .c{color:#a1a1a1;font-size:16px}</style>
    <h1>${id}</h1><div class="g"><div></div>${cols.map((c) => `<div class="c">${c}</div>`).join("")}
    ${names.map((n) => `<div class="c">${n}</div>${cols.map((c) => cell(n, c)).join("")}`).join("")}</div>`;
  const context = await browser.newContext({ viewport: { width: 120 + cols.length * 652 + 48, height: 400 } });
  const page = await context.newPage();
  await page.setContent(html);
  await page.screenshot({ path: path.join(OUT, `${id}.jpg`), fullPage: true, type: "jpeg", quality: 82 });
  await context.close();
  console.log(`✓ contact sheet ${id}`);
}
await browser.close();
