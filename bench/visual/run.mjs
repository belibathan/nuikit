// Visual baselines (docs/design.md, "Follow-up: visual baselines"): the dev fixtures of systems/nuikit_hud
// and systems/nuikit_pause plus four sections of the site's /components, each under Default, Neon Pop,
// Flat and Square at 1920x1080, animations off, fonts from npm (fontsource), in Chromium 103 (the FiveM CEF build
// `pnpm proof` uses: @sparticuz/chromium from examples/cef-proof), compared with the committed PNGs in
// bench/visual/baselines/<page>-<theme>.png by a pixel ratio. Baselines are never committed (bench/.gitignore):
// CI only produces the shots as an artifact; compare locally after `pnpm visual:update`.
//
//   pnpm visual           compare; a missing baseline is written to bench/visual/out and reported, not failed
//   pnpm visual:update    rewrite the baselines (do it in the Playwright image, see contract.md)
//
// Env: VISUAL_MAX_DIFF (default 0.01 of pixels), VISUAL_CHROMIUM (browser path; default Chromium 103, else
// Playwright's own), VISUAL_ONLY (comma list of page names, e.g. "hud,pause"), PLAYWRIGHT_CORE (module path, see
// bench/host/lib/apps.mjs). Exit 1 on a diff over the threshold or when no browser can start.
import { execFileSync, spawn } from "node:child_process";
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
const ONLY = (process.env.VISUAL_ONLY ?? "").split(",").filter(Boolean);
const THEMES = [
  ["default", "Default"],
  ["neon-pop", "Neon Pop"],
  ["flat", "Flat"],
  ["square", "Square"],
];
const SECTIONS = ["Notice", "Band", "Meter: tones, colours, timed", "Slabs"];
const BASE = path.join(here, "baselines");
const OUT = path.join(here, "out");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(BASE, { recursive: true });
if (!process.argv.includes("--look")) fs.rmSync(OUT, { recursive: true, force: true }); // look keeps earlier shots
fs.mkdirSync(OUT, { recursive: true });

// The browser: VISUAL_CHROMIUM, else the Chromium 103 `pnpm proof` runs (FiveM's CEF), else Playwright's own.
async function launch(modern = false) {
  const tries = [];
  if (modern) {
    // the site is a modern page (not a NUI target): it needs a current Chromium
    if (process.env.VISUAL_MODERN_CHROMIUM) tries.push(["VISUAL_MODERN_CHROMIUM", async () => ({ executablePath: process.env.VISUAL_MODERN_CHROMIUM })]);
    tries.push(["Playwright's Chromium", async () => ({})]);
    tries.push(["/opt/pw-browsers Chromium", async () => {
      const root = "/opt/pw-browsers";
      const dir = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
      const sub = fs.readdirSync(path.join(root, dir)).find((d) => d.startsWith("chrome-linux"));
      return { executablePath: path.join(root, dir, sub, "chrome") };
    }]);
  } else if (process.env.VISUAL_CHROMIUM) tries.push(["VISUAL_CHROMIUM", async () => ({ executablePath: process.env.VISUAL_CHROMIUM })]);
  else
    tries.push(["Chromium 103 (@sparticuz/chromium)", async () => {
      const sp = createRequire(path.join(repo, "examples/cef-proof/package.json"))("@sparticuz/chromium");
      return { executablePath: await sp.executablePath, args: [...sp.args, "--no-sandbox"] };
    }]);
  if (!modern) tries.push(["Playwright's own", async () => ({})]);
  const errs = [];
  for (const [label, opts] of tries) {
    try {
      const browser = await chromium.launch(await opts());
      console.log(`browser: ${label} ${browser.version()}`);
      return browser;
    } catch (e) {
      errs.push(`${label}: ${String(e.message).split("\n")[0]}`);
    }
  }
  console.error(`no browser: could not start a Chromium (${errs.join("; ")}). Install deps (pnpm install) or set VISUAL_CHROMIUM.`);
  process.exit(1);
}

// A vite dev server for one app; resolves with a stop() that SIGINTs it (never SIGKILL: it rewrites ui_page).
async function serve(dir, port) {
  const cwd = path.join(repo, dir);
  const child = spawn(process.execPath, [path.join(cwd, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${dir} dev server didn't start:\n${log}`)), 60000);
    const i = setInterval(() => {
      if (/Local:|ready in/.test(log)) {
        clearInterval(i);
        clearTimeout(t);
        resolve();
      }
    }, 100);
  });
  return async () => {
    const exited = new Promise((r) => child.once("exit", r));
    child.kill("SIGINT");
    await Promise.race([exited, sleep(10000)]);
  };
}

let failed = 0;
let browser, context, cmp;
// `--viewport 2560x1440` (look only): the window size, as a player's screen (docs/design.md)
const VIEWPORT = (() => {
  const i = process.argv.indexOf("--viewport");
  const m = i === -1 ? null : String(process.argv[i + 1] ?? "").match(/^(\d{3,5})[x×](\d{3,5})$/i);
  if (i !== -1 && !m) {
    console.error("--viewport takes WxH, e.g. 2560x1440");
    process.exit(2);
  }
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
})();
async function use(modern) {
  await browser?.close();
  browser = await launch(modern);
  context = await browser.newContext({ viewport: VIEWPORT ?? { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  cmp = await context.newPage(); // the pixel diff runs in a page: no image dependency
}
// NUI scale as in game (index.css.tpl: the height, or a 16:9 width on a narrower screen, floored); nothing may move.
const FREEZE = `html{font-size:calc(clamp(calc(16px * var(--nk-scale-min, 0.75)), min(1.4815vh, 0.8333vw), 32px) * var(--nk-scale, 1)) !important}*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}`;

async function check(name, shot) {
  const file = path.join(BASE, `${name}.png`);
  if (UPDATE) {
    fs.writeFileSync(file, shot);
    console.log(`updated ${name}.png`);
    return;
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(path.join(OUT, `new-${name}.png`), shot);
    console.log(`new ${name}.png: no baseline, written to bench/visual/out`);
    return;
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
    fs.writeFileSync(path.join(OUT, `actual-${name}.png`), shot);
    if (r.diff) fs.writeFileSync(path.join(OUT, `diff-${name}.png`), Buffer.from(r.diff.split(",")[1], "base64"));
    console.log(`FAIL ${name}.png: ${r.size ? `size ${r.size}` : `${r.n} px differ (${((r.n / r.total) * 100).toFixed(2)}%, max ${MAX * 100}%)`}`);
    failed++;
  } else console.log(`ok ${name}.png (${r.n} px differ)`);
}

// An identity's file, as the game's nuikit resource would serve it (its cfx-nui @import has no server here).
const identityCss = (id) => fs.readFileSync(path.join(repo, "packages/core/themes", `${id}.css`), "utf8").replace(/^@import url\("https:\/\/cfx-nui-[^\n]*\n/gm, "");

// goto, retried: vite's first load can reload the page once after it optimises dependencies.
async function open(page, url) {
  for (let i = 0; ; i++) {
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      return;
    } catch (e) {
      if (i >= 3) throw e;
      await sleep(1500);
    }
  }
}

// The dev fixtures: load the page, then paint the identity with the app's own nuikit-core instance (same URL
// vite serves it from), so the page's theme listeners and attributes follow as in game.
async function fixture(name, dir, port, url) {
  const stop = await serve(dir, port);
  try {
    const page = await context.newPage();
    for (const [id] of THEMES) {
      await open(page, `http://127.0.0.1:${port}${url}`);
      await page.evaluate(async ([core, css]) => (await import(core)).applyTheme(css, undefined, "dark"), [`/@fs${repo}/packages/core/dist/index.js`, identityCss(id)]);
      await page.addStyleTag({ content: FREEZE });
      await sleep(500); // the identity's fonts start loading once its rules apply
      await page.evaluate(() => document.fonts.ready);
      await sleep(1000);
      await check(`${name}-${id}`, await page.screenshot({ type: "png", timeout: 120000 }));
    }
    await page.close();
  } finally {
    await stop();
  }
}

// The site's /components: a few sections, each under the page's own identity picker.
async function components(port) {
  const stop = await serve("apps/www", port);
  try {
    const page = await context.newPage();
    await open(page, `http://127.0.0.1:${port}/components`);
    await page.addStyleTag({ content: FREEZE });
    await page.evaluate(() => document.fonts.ready);
    await sleep(600);
    for (const [id, title] of THEMES) {
      const radio = page.getByRole("radio", { name: title, exact: true }).first();
      if (!(await radio.count())) {
        console.log(`! components-${id}: identity "${title}" not in the picker`);
        failed++;
        continue;
      }
      await radio.click();
      await sleep(400);
      for (const sec of SECTIONS) {
        const section = page.locator("section", { has: page.locator(`h2:has-text("${sec}")`) }).first();
        if (!(await section.count())) {
          console.log(`! components-${slug(sec)}-${id}: section "${sec}" not found`);
          failed++;
          continue;
        }
        const stage = section.locator(":scope > div.relative.isolate").first();
        await stage.scrollIntoViewIfNeeded();
        await sleep(250);
        await check(`components-${slug(sec)}-${id}`, await stage.screenshot({ type: "png" }));
      }
    }
    await page.close();
  } finally {
    await stop();
  }
}

// `pnpm look <dir> [url] [--viewport WxH] [--themes a,b]`: shoot one web package's dev fixture under every theme
// (or the listed ones) into bench/visual/out, no compare. With --viewport the files are named <name>-<theme>-<WxH>.png.
// Every lane that changes something visual runs it and Reads the PNGs before pushing (docs/next/dispatch.md, the gate).
const LOOK = process.argv.indexOf("--look");
if (LOOK !== -1) {
  const dir = process.argv[LOOK + 1];
  const third = process.argv[LOOK + 2];
  const url = third && !third.startsWith("--") ? third : "/";
  const ti = process.argv.indexOf("--themes");
  const pick = ti === -1 ? null : String(process.argv[ti + 1] ?? "").split(",");
  if (!dir || !fs.existsSync(path.join(repo, dir, "src/dev.tsx")) && !fs.existsSync(path.join(repo, dir, "index.html"))) {
    console.error("usage: pnpm look <web package dir> [url]   (a dir with src/dev.tsx or index.html)");
    process.exit(2);
  }
  await use(false);
  const name = slug(dir.replace(/\/web$/, "").split("/").pop());
  const stop = await serve(dir, 5897);
  try {
    const page = await context.newPage();
    for (const [id] of THEMES.filter(([t]) => !pick || pick.includes(t))) {
      await open(page, `http://127.0.0.1:5897${url}`);
      await page.evaluate(async ([core, css]) => (await import(core)).applyTheme(css, undefined, "dark"), [`/@fs${repo}/packages/core/dist/index.js`, identityCss(id)]);
      await page.addStyleTag({ content: FREEZE });
      await sleep(500);
      await page.evaluate(() => document.fonts.ready);
      await sleep(800);
      const file = path.join(OUT, `${name}-${id}${VIEWPORT ? `-${VIEWPORT.width}x${VIEWPORT.height}` : ""}.png`);
      fs.writeFileSync(file, await page.screenshot({ type: "png", timeout: 120000 }));
      console.log(file);
    }
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    await page.close();
  } finally {
    await stop();
    await browser?.close();
  }
  process.exit(0);
}

const want = (n) => !ONLY.length || ONLY.includes(n);
try {
  if (want("hud") || want("pause")) await use(false);
  if (want("hud")) await fixture("hud", "systems/nuikit_hud/web", 5893, "/?fixture=foot");
  if (want("pause")) await fixture("pause", "systems/nuikit_pause/web", 5894, "/");
  if (want("components")) {
    await use(true);
    await components(Number(process.env.PORT ?? 5892));
  }
} finally {
  await browser?.close();
}
process.exit(failed ? 1 : 0);
