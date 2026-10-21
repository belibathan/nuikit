// Reference polish: the shipped screens next to the Figma reference frames (docs/design/reference.md),
// per identity, so each gap can be checked by eye. HUD at 1280×720, 1920×1080 and 2560×1440; the rest
// at 1920×1080. Output: bench/polish/<screen>/<identity>-<res>.jpg and, per screen, a side-by-side
// sheet `<screen>/compare.jpg` (reference on the left, shipped on the right).
//
//   node bench/polish/shots.mjs [--ids=graphite,signal] [--screens=hud-foot,notify] [--tag=before]
//
// Dev servers are stopped with SIGINT (they restore the fxmanifest's ui_page on exit).
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
const TAG = arg("tag", "");
const HUD_RES = [[1920, 1080], [2560, 1440], [1280, 720]];
const ONE = [[1920, 1080]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (page, msg) => page.evaluate((m) => window.postMessage(m, "*"), msg);
const nui = (action, data) => ({ action, data });
const REF = path.join(repo, "bench/figma/reference");

const LOCALE = nui("setLocale", { language: "English", ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } });

/** The screens: app, fixture, what to send after load, the scene, the reference jpg. */
const SCREENS = {
  "hud-foot": { app: "systems/nuikit_hud/web", path: "/?fixture=low&heading=300", scene: "stage-day.jpg", res: HUD_RES, ref: "hud-on-foot.jpg", settle: 1200 },
  "hud-vehicle": { app: "systems/nuikit_hud/web", path: "/?fixture=damaged&heading=268", scene: "stage-dusk.jpg", res: HUD_RES, ref: "hud-in-vehicle.jpg", settle: 1200 },
  notify: {
    app: "addons/ox_lib/web",
    path: "/",
    scene: "street.jpg",
    res: ONE,
    ref: "notifications.jpg",
    async drive(page) {
      await post(page, LOCALE);
      for (const n of [
        { title: "Vehicle stored", description: "Your **Sultan RS** is in the Legion Square garage.", type: "success", position: "top-right", duration: 60000 },
        { title: "Not enough cash", description: "You need $2,500 for that.", type: "error", position: "top-right", duration: 60000 },
        { title: "Speed camera", description: "Flashed at 92 mph on Great Ocean Hwy", type: "warning", position: "top-right", duration: 60000 },
        { title: "Speed camera", description: "Flashed at 92 mph on Great Ocean Hwy", type: "warning", position: "top-right", duration: 60000 },
        { title: "New message", description: "From **Lester**", type: "inform", position: "top-right", duration: 60000 },
      ]) {
        await post(page, nui("notify", n));
        await sleep(80);
      }
      await post(page, nui("notify", { id: "fuel", title: "Fuel", description: "Refuelling… 40%", icon: "gas-pump", position: "top-right", duration: 60000 }));
      await sleep(900);
    },
  },
  context: {
    app: "addons/ox_lib/web",
    path: "/",
    scene: "street.jpg",
    res: ONE,
    ref: "context-menu.jpg",
    async drive(page) {
      await post(page, LOCALE);
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
      await sleep(700);
      await page.keyboard.press("Shift");
      await page.evaluate(() => {
        const row = [...document.querySelectorAll(".nk-row")].find((r) => r.textContent?.includes("Sultan RS"));
        row?.focus();
      });
      await sleep(400);
    },
  },
  input: {
    app: "addons/ox_lib/web",
    path: "/",
    scene: "street.jpg",
    res: ONE,
    ref: "input-dialog.jpg",
    async drive(page) {
      await post(page, LOCALE);
      await post(page, nui("openDialog", {
        heading: "Register vehicle",
        rows: [
          { type: "input", label: "Plate", description: "Up to 8 characters", placeholder: "46EEK572", required: true },
          { type: "number", label: "Amount", default: 2500, min: 0, max: 100000, step: 100 },
          { type: "select", label: "Garage", options: [{ value: "legion", label: "Legion Square" }, { value: "pillbox", label: "Pillbox Hill" }], default: "legion" },
          { type: "checkbox", label: "Insure the vehicle", checked: true },
        ],
      }));
      await sleep(900);
    },
  },
  progress: {
    app: "addons/ox_lib/web",
    path: "/",
    scene: "street.jpg",
    res: ONE,
    ref: "progress-skill-check.jpg",
    async drive(page) {
      await post(page, LOCALE);
      await post(page, nui("progress", { label: "Repairing engine", duration: 60000, canCancel: true }));
      await post(page, nui("startSkillCheck", { difficulty: ["easy", "medium"], inputs: ["E"] }));
      await sleep(900);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
      await sleep(100);
    },
  },
  death: { app: "systems/nuikit_death/web", path: "/?fixture=qbx-dead", scene: "stage-dusk.jpg", res: ONE, ref: "death.jpg", settle: 1400 },
  pause: { app: "systems/nuikit_pause/web", path: "/?fixture=default", scene: null, res: ONE, ref: "pause.jpg", settle: 1600 },
};
const CHOSEN = arg("screens", Object.keys(SCREENS).join(",")).split(",");

function startDev(app, port) {
  const dir = path.join(repo, app);
  const child = spawn(process.execPath, [path.join(dir, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
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
let port = 5820;
const devs = {};
const made = [];
try {
  for (const name of CHOSEN) {
    const s = SCREENS[name];
    const out = path.join(here, name);
    fs.mkdirSync(out, { recursive: true });
    devs[s.app] ??= startDev(s.app, port++);
    const dev = devs[s.app];
    await dev.ready;
    for (const id of IDS) {
      for (const [w, h] of s.res) {
        const context = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await context.newPage();
        await page.addInitScript(() => localStorage.setItem("nuikit:scene", "none"));
        if (s.app.startsWith("addons/")) {
          // an override has no dev mocks: it posts to its resource, as in game
          await page.addInitScript(() => {
            window.GetParentResourceName = () => "ox_lib";
          });
          await page.route(/^https:\/\/[a-z_]+\//, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "1" }));
        }
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
        const file = path.join(out, `${id}-${w}x${h}${TAG ? `-${TAG}` : ""}.jpg`);
        await page.screenshot({ path: file, type: "jpeg", quality: 88 });
        made.push({ name, id, w, h, file, ref: path.join(REF, id, s.ref) });
        await context.close();
      }
      console.log(`✓ ${name} · ${id}`);
    }
  }
  // side-by-side sheets: reference left, shipped (1920×1080) right, one row per identity
  for (const name of CHOSEN) {
    const rows = made.filter((m) => m.name === name && m.w === 1920);
    if (!rows.length) continue;
    const img = (f) => `<img src="data:image/jpeg;base64,${fs.readFileSync(f).toString("base64")}">`;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#0b0b0c;color:#e5e5e5;font:600 18px Inter,system-ui,sans-serif;padding:20px}
      h1{font-size:24px;margin:0 0 12px} .g{display:grid;grid-template-columns:100px 960px 960px;gap:10px;align-items:center}
      img{width:960px;height:540px;display:block;border-radius:4px} .c{color:#a1a1a1;font-size:15px}</style>
      <h1>${name}${TAG ? ` (${TAG})` : ""}</h1><div class="g"><div></div><div class="c">reference</div><div class="c">shipped</div>
      ${rows.map((r) => `<div class="c">${r.id}</div>${fs.existsSync(r.ref) ? img(r.ref) : "<div></div>"}${img(r.file)}`).join("")}</div>`;
    const context = await browser.newContext({ viewport: { width: 2080, height: 400 } });
    const page = await context.newPage();
    await page.setContent(html);
    await page.screenshot({ path: path.join(here, name, `compare${TAG ? `-${TAG}` : ""}.jpg`), fullPage: true, type: "jpeg", quality: 80 });
    await context.close();
    console.log(`✓ sheet ${name}`);
  }
} finally {
  for (const dev of Object.values(devs)) await stopDev(dev);
  await browser.close();
}
