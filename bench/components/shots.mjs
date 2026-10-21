// Proof for design v2 step 3 (components on component tokens): the site's /components page in every
// identity, one contact sheet per identity, sections as tiles. NUI scale (1rem = 1.4815vh, 16px at
// 1080p) as in game, so the three resolutions differ the way they do in game.
//
//   node bench/components/shots.mjs [--ids=graphite,signal] [--res=1920x1080] [--sections=Slabs,Band]
//
// Starts apps/www's Vite dev server (stopped with SIGINT), opens /components, paints the identity on
// <html> the way applyTheme does (compiled vars + channels + keyword attributes), loads the identity
// fonts from packages/core/fonts, and screenshots each section's stage.
// Output: bench/components/shots/<id>-<w>x<h>.jpg
import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const IDS = arg("ids", "graphite,signal,velvet,vector,daylight").split(",");
const RES = arg("res", "1920x1080").split(",").map((r) => r.split("x").map(Number));
const ONLY = arg("sections", "");
const OUT = path.join(here, "shots");
const PORT = Number(arg("port", "5890"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SECTIONS = [
  "Panel",
  "Menu row",
  "Stat",
  "Meter",
  "Meter: tones, colours, timed",
  "HUD chip",
  "Notice",
  "Slabs",
  "Band",
  "Form field",
  "Key prompt",
  "Progress ring",
  "Speedometer",
  "Countdown",
  "Money",
  "Item slot",
  "Skill check",
  "Radial menu",
].filter((s) => !ONLY || ONLY.split(",").includes(s));

const { compileTheme, themeChannels } = await import(pathToFileURL(path.join(repo, "packages/core/dist/index.js")).href);
const themeFor = (id) => {
  const shipped = path.join(repo, "packages/core/themes", `${id}.css`);
  if (fs.existsSync(shipped)) return compileTheme(fs.readFileSync(shipped, "utf8"));
  // the flexibility check: a light theme, compiled in light mode as the nuikit resource would publish it
  return compileTheme(fs.readFileSync(path.join(repo, "packages/core/test/themes", `${id}.css`), "utf8"), { mode: "light" });
};

// what applyTheme paints from identity keywords (packages/core/src/theme.ts KEYWORD_ATTRS)
const KEYWORD_ATTRS = [["data-nk-row", "nk-row-indicator"], ["data-nk-gauge", "nk-gauge-style"], ["data-nk-elevation", "nk-elevation"], ["data-nk-label-case", "nk-label-case"]];
const fontsDir = path.join(repo, "packages/core/fonts");
const fontsJson = JSON.parse(fs.readFileSync(path.join(fontsDir, "fonts.json"), "utf8"));
const fontFaces = fontsJson.fonts
  .map(
    (f) =>
      `@font-face{font-family:"${f.family}";src:url("/@fs${path.join(fontsDir, f.file)}") format("woff2");font-weight:${f.weight};font-style:${f.style ?? "normal"};font-display:block;unicode-range:${fontsJson.unicodeRange}}`
  )
  .join("\n");

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

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
fs.mkdirSync(OUT, { recursive: true });
try {
  for (const id of IDS) {
    const theme = themeFor(id);
    const vars = { ...theme.vars, ...themeChannels(theme.vars) };
    for (const [w, h] of RES) {
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`http://127.0.0.1:${PORT}/components`, { waitUntil: "networkidle" });
      await sleep(500);
      await page.addStyleTag({ content: `${fontFaces}\nhtml{font-size:1.4815vh !important}` });
      await page.evaluate(
        ({ vars, attrs }) => {
          const el = document.documentElement;
          for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, v);
          el.setAttribute("data-nk-motion", vars["nk-motion"] === "0" ? "off" : "on");
          for (const [attr, token] of attrs) {
            if (vars[token]) el.setAttribute(attr, vars[token]);
            else el.removeAttribute(attr);
          }
        },
        { vars, attrs: KEYWORD_ATTRS }
      );
      await page.evaluate(() => document.fonts.ready);
      // keyboard-highlight one menu row per list so the identity's active indicator shows
      await page.keyboard.press("Shift");
      await sleep(900);
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
      if (errors.length) console.warn(`! ${id} ${w}x${h}: ${errors.join(" | ")}`);

      const html = `<!doctype html><meta charset="utf-8"><style>
        body{margin:0;background:#0b0b0c;color:#e5e5e5;font:600 22px system-ui,sans-serif;padding:28px}
        h1{font-size:34px;margin:0 0 20px;text-transform:capitalize} .g{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
        figure{margin:0} figcaption{color:#a1a1a1;font-size:18px;margin:0 0 8px} img{width:100%;display:block;border-radius:8px}</style>
        <h1>${id} · ${w}×${h}</h1><div class="g">${tiles.map((t) => `<figure><figcaption>${t.title}</figcaption><img src="${t.src}"></figure>`).join("")}</div>`;
      const sheet = await browser.newContext({ viewport: { width: 2400, height: 800 } });
      const sp = await sheet.newPage();
      await sp.setContent(html);
      await sp.waitForLoadState("load");
      const file = path.join(OUT, `${id}-${w}x${h}.jpg`);
      await sp.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 66 });
      await sheet.close();
      console.log(`✓ ${path.relative(repo, file)} (${tiles.length} sections)`);
    }
  }
} finally {
  await browser.close();
  const exited = new Promise((r) => child.once("exit", r));
  child.kill("SIGINT");
  await Promise.race([exited, sleep(10000)]);
}
