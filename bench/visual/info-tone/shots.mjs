// `info` follows `primary` (grey in the stock theme) or a fixed blue? Two contact sheets of the
// site's /components sections that use the info tone, in the stock neutral theme, so the owner can
// pick (docs/roadmap.md, open items). Not a decision: a comparison.
//
//   node bench/visual/info-tone/shots.mjs            → bench/visual/info-tone/{primary,blue}-1920x1080.jpg
//
// A: the stock theme as compiled today (--info = --primary, grey).
// B: the same theme with --info: oklch(0.68 0.16 250) (the armor blue from docs/tokens.md) and the
//    foreground the compiler derives for it. Everything else identical.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const require = createRequire(import.meta.url);
const { playwrightCore } = await import(pathToFileURL(path.join(repo, "bench/host/lib/apps.mjs")).href);
const { chromium } = playwrightCore(require);
const PORT = Number(process.env.PORT ?? 5891);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SECTIONS = ["Notice", "Band", "Meter: tones, colours, timed", "Slabs"];

const { compileTheme, themeChannels } = await import(pathToFileURL(path.join(repo, "packages/core/dist/index.js")).href);
const stock = fs.readFileSync(path.join(repo, "systems/nuikit/theme.css"), "utf8");
const VARIANTS = {
  primary: compileTheme(stock),
  blue: compileTheme(`${stock}\n.dark { --info: oklch(0.68 0.16 250); }`),
};
for (const [name, t] of Object.entries(VARIANTS)) {
  const c = t.contrast.find((x) => x.fg === "info-foreground" && x.bg === "info");
  console.log(`${name}: --info ${t.vars.info}, --info-foreground ${t.vars["info-foreground"]}${c ? `, contrast ${c.ratio.toFixed(1)}:1` : ""}`);
}

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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
try {
  for (const [name, theme] of Object.entries(VARIANTS)) {
    const vars = { ...theme.vars, ...themeChannels(theme.vars) };
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/components`, { waitUntil: "networkidle" });
    await sleep(500);
    await page.addStyleTag({ content: `html{font-size:1.4815vh !important}` });
    await page.evaluate((vars) => {
      const el = document.documentElement;
      for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, v);
    }, vars);
    await page.evaluate(() => document.fonts.ready);
    await sleep(600);
    const tiles = [];
    for (const title of SECTIONS) {
      const section = page.locator("section", { has: page.locator(`h2:text-is("${title}")`) }).first();
      if (!(await section.count())) continue;
      const stage = section.locator(":scope > div.relative.isolate").first();
      await stage.scrollIntoViewIfNeeded();
      await sleep(250);
      const buf = await stage.screenshot({ type: "jpeg", quality: 85 });
      tiles.push({ title, src: `data:image/jpeg;base64,${buf.toString("base64")}` });
    }
    await context.close();

    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;background:#0b0b0c;color:#e5e5e5;font:600 22px system-ui,sans-serif;padding:28px}
      h1{font-size:34px;margin:0 0 6px} p{margin:0 0 20px;color:#a1a1a1;font-weight:400;font-size:18px}
      .g{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
      figure{margin:0} figcaption{color:#a1a1a1;font-size:18px;margin:0 0 8px} img{width:100%;display:block;border-radius:8px}</style>
      <h1>info ${name === "primary" ? "follows primary (today)" : "is a fixed blue"}</h1>
      <p>--info ${theme.vars.info} · --info-foreground ${theme.vars["info-foreground"]} · stock neutral theme · 1920×1080</p>
      <div class="g">${tiles.map((t) => `<figure><figcaption>${t.title}</figcaption><img src="${t.src}"></figure>`).join("")}</div>`;
    const sheet = await browser.newContext({ viewport: { width: 2400, height: 800 } });
    const sp = await sheet.newPage();
    await sp.setContent(html);
    await sp.waitForLoadState("load");
    const file = path.join(here, `${name}-1920x1080.jpg`);
    await sp.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 66 });
    await sheet.close();
    console.log(`✓ ${path.relative(repo, file)} (${tiles.length} sections)`);
  }
} finally {
  await browser.close();
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGINT");
  await Promise.race([exited, sleep(10000)]);
}
