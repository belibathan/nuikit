// Visual baselines (docs/design/contract.md, "Follow-up: visual baselines"): a few sections of the site's
// /components page at 1920x1080, Chromium only, animations off, fonts from npm (fontsource), compared with
// the committed PNGs in bench/visual/baselines by a pixel ratio.
//
//   pnpm visual           compare; a missing baseline is written to bench/visual/out and reported, not failed
//   pnpm visual:update    rewrite the baselines (do it in the Playwright image, see contract.md)
//
// Env: VISUAL_MAX_DIFF (default 0.01 of pixels), VISUAL_CHROMIUM (browser path; default Playwright's own),
// PLAYWRIGHT_CORE (module path, see bench/host/lib/apps.mjs). Exit 1 on a diff over the threshold.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const { playwrightCore } = await import(pathToFileURL(path.join(repo, "bench/host/lib/apps.mjs")).href);
const { chromium } = playwrightCore(require);

const UPDATE = process.argv.includes("--update");
const MAX = Number(process.env.VISUAL_MAX_DIFF ?? 0.01);
const PORT = Number(process.env.PORT ?? 5892);
const SECTIONS = ["Notice", "Band", "Meter: tones, colours, timed", "Slabs"];
const BASE = path.join(here, "baselines");
const OUT = path.join(here, "out");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(BASE, { recursive: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

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

let failed = 0;
const browser = await chromium.launch(process.env.VISUAL_CHROMIUM ? { executablePath: process.env.VISUAL_CHROMIUM } : {});
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/components`, { waitUntil: "networkidle" });
  // NUI scale (1rem = 1.4815vh), as in game; nothing may move.
  await page.addStyleTag({ content: `html{font-size:1.4815vh !important}*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}` });
  await page.evaluate(() => document.fonts.ready);
  await sleep(600);
  const cmp = await context.newPage(); // the pixel diff runs in a page: no image dependency

  for (const title of SECTIONS) {
    const name = `${slug(title)}.png`;
    const section = page.locator("section", { has: page.locator(`h2:text-is("${title}")`) }).first();
    if (!(await section.count())) {
      console.log(`! ${name}: section "${title}" not found`);
      failed++;
      continue;
    }
    const stage = section.locator(":scope > div.relative.isolate").first();
    await stage.scrollIntoViewIfNeeded();
    await sleep(250);
    const shot = await stage.screenshot({ type: "png" });
    const file = path.join(BASE, name);
    if (UPDATE) {
      fs.writeFileSync(file, shot);
      console.log(`updated ${name}`);
      continue;
    }
    if (!fs.existsSync(file)) {
      fs.writeFileSync(path.join(OUT, `new-${name}`), shot);
      console.log(`new ${name}: no baseline, written to bench/visual/out`);
      continue;
    }
    const r = await cmp.evaluate(
      async ([a, b]) => {
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
        const [x, y] = await Promise.all([load(a), load(b)]);
        if (x.width !== y.width || x.height !== y.height) return { size: `${x.width}x${x.height} vs ${y.width}x${y.height}` };
        const px = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height); };
        const p = px(x), q = px(y);
        const d = document.createElement("canvas"); d.width = x.width; d.height = x.height;
        const g = d.getContext("2d"); const o = g.createImageData(x.width, x.height);
        let n = 0;
        for (let i = 0; i < p.data.length; i += 4) {
          const diff = Math.abs(p.data[i] - q.data[i]) + Math.abs(p.data[i + 1] - q.data[i + 1]) + Math.abs(p.data[i + 2] - q.data[i + 2]) > 24;
          if (diff) n++;
          o.data.set(diff ? [255, 0, 80, 255] : [q.data[i], q.data[i + 1], q.data[i + 2], 60], i);
        }
        g.putImageData(o, 0, 0);
        return { n, total: p.data.length / 4, diff: d.toDataURL("image/png") };
      },
      [`data:image/png;base64,${fs.readFileSync(file).toString("base64")}`, `data:image/png;base64,${shot.toString("base64")}`],
    );
    if (r.size || r.n / r.total > MAX) {
      fs.writeFileSync(path.join(OUT, `actual-${name}`), shot);
      if (r.diff) fs.writeFileSync(path.join(OUT, `diff-${name}`), Buffer.from(r.diff.split(",")[1], "base64"));
      console.log(`FAIL ${name}: ${r.size ? `size ${r.size}` : `${r.n} px differ (${((r.n / r.total) * 100).toFixed(2)}%, max ${MAX * 100}%)`}`);
      failed++;
    } else console.log(`ok ${name} (${r.n} px differ)`);
  }
} finally {
  await browser.close();
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGINT");
  await Promise.race([exited, sleep(10000)]);
}
process.exit(failed ? 1 : 0);
