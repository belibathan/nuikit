// Screenshots of every block state over a game scene at the three resolutions, in an identity.
//
//   node bench/blocks/shots.mjs [--blocks=bank,garage] [--ids=graphite] [--res=1920x1080,2560x1440,1280x720]
//                              [--all] [--site] [--port=5891]
//
// Every state at 1920×1080; the other resolutions for the first (canonical) state of each block, as the
// component contract asks (item 23), or every state with --all.
//
// Starts apps/www's Vite dev server (stopped with SIGINT), opens /blocks/shot?block=&state=&identity=
// (apps/www/src/pages/shot.tsx: one block state full viewport, html { font-size: 1.4815vh } as in
// game, the identity applied with applyTheme) and screenshots the viewport. Output:
// bench/blocks/shots/<block>/<state>-<identity>-<w>x<h>.jpg, plus an index.html contact sheet per
// block. --site also shoots /blocks and /theme (the whole page) into shots/site/.
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
const has = (name) => process.argv.includes(`--${name}`);
const IDS = arg("ids", "graphite").split(",");
const RES = arg("res", "1920x1080,2560x1440,1280x720").split(",").map((r) => r.split("x").map(Number));
const ONLY = arg("blocks", "");
const OUT = path.join(here, "shots");
const PORT = Number(arg("port", "5891"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// The blocks and their states, read from the site's preview table (the single source).
const previews = fs.readFileSync(path.join(repo, "apps/www/src/components/block-previews.tsx"), "utf8");
const BLOCKS = [];
for (const m of previews.matchAll(/name: "([\w-]+)",[\s\S]*?states: \{([\s\S]*?)\n {4}\},/g)) {
  const states = [...m[2].matchAll(/^ {6}(?:"([^"]+)"|([\w]+)): \(\)/gm)].map((s) => s[1] ?? s[2]);
  BLOCKS.push({ name: m[1], states });
}
const blocks = BLOCKS.filter((b) => !ONLY || ONLY.split(",").includes(b.name));

const app = path.join(repo, "apps/www");
const child = spawn(process.execPath, [path.join(app, "node_modules/vite/bin/vite.js"), "--port", String(PORT), "--strictPort", "--host", "127.0.0.1"], {
  cwd: app,
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
child.stdout.on("data", (d) => (log += d));
child.stderr.on("data", (d) => (log += d));
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`www dev server didn't start:\n${log}`)), 60000);
  const i = setInterval(() => {
    if (/Local:|ready in/.test(log)) {
      clearInterval(i);
      clearTimeout(t);
      resolve();
    }
  }, 100);
});

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const base = `http://127.0.0.1:${PORT}`;
const problems = [];
try {
  for (const block of blocks) {
    const dir = path.join(OUT, block.name);
    fs.mkdirSync(dir, { recursive: true });
    const tiles = [];
    for (const id of IDS) {
      for (const [w, h] of RES) {
        const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        page.on("pageerror", (e) => problems.push(`${block.name} ${id} ${w}x${h}: ${e}`));
        page.on("console", (m) => m.type() === "error" && problems.push(`${block.name} ${id} ${w}x${h}: ${m.text()}`));
        for (const state of w === 1920 || has("all") ? block.states : block.states.slice(0, 1)) {
          const url = `${base}/blocks/shot?block=${block.name}&state=${encodeURIComponent(state)}&identity=${id}`;
          await page.goto(url, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          await sleep(700); // nk-enter and stagger settle; countdown ticks once
          const file = path.join(dir, `${slug(state)}-${id}-${w}x${h}.jpg`);
          await page.screenshot({ path: file, type: "jpeg", quality: 74 });
          if (w === 1920) tiles.push({ title: `${state} · ${id}`, file: path.basename(file) });
          console.log(`✓ ${block.name} / ${state} ${id} ${w}×${h}`);
        }
        await context.close();
      }
    }
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><meta charset="utf-8"><title>${block.name}</title><style>
      body{margin:0;background:#0b0b0c;color:#e5e5e5;font:600 20px system-ui,sans-serif;padding:24px}
      h1{font-size:30px;margin:0 0 16px} .g{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
      figure{margin:0} figcaption{color:#a1a1a1;font-size:16px;margin:0 0 6px} img{width:100%;display:block;border-radius:6px}</style>
      <h1>${block.name} at 1920×1080</h1><div class="g">${tiles.map((t) => `<figure><figcaption>${t.title}</figcaption><img src="${t.file}" loading="lazy"></figure>`).join("")}</div>`
    );
  }

  if (has("site")) {
    const dir = path.join(OUT, "site");
    fs.mkdirSync(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on("pageerror", (e) => problems.push(`site: ${e}`));
    for (const route of ["/blocks", "/theme"]) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await sleep(1200);
      await page.screenshot({ path: path.join(dir, `${route.slice(1)}.jpg`), type: "jpeg", quality: 80, fullPage: true });
      console.log(`✓ site ${route}`);
      // the identity switcher: each identity on the first stage, viewport only
      for (const id of ["Signal", "Velvet", "Vector"]) {
        const btn = page.getByRole("button", { name: id, exact: true }).first();
        if (!(await btn.count())) continue;
        await btn.click();
        await sleep(900);
        await page.screenshot({ path: path.join(dir, `${route.slice(1)}-${id.toLowerCase()}.jpg`), type: "jpeg", quality: 80 });
        console.log(`✓ site ${route} ${id}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  child.kill("SIGINT");
}
if (problems.length) {
  console.warn(`\n! ${problems.length} page problems:\n${[...new Set(problems)].join("\n")}`);
}
