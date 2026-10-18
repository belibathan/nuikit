// Proof that nuikit fixes shadcn/Tailwind v4 in FiveM: compile a real shadcn page with
// Tailwind v4, render it in Chromium 103 (the version FiveM's NUI runs) before and after
// vite-plugin-nuikit, and assert computed styles. Writes before.png / after.png / compare.png.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatReport, lowerCss } from "vite-plugin-nuikit";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = (f) => path.join(dir, "out", f);
fs.mkdirSync(path.join(dir, "out"), { recursive: true });

const stock = execFileSync(path.join(dir, "node_modules/.bin/tailwindcss"), ["-i", "input.css"], { cwd: dir, encoding: "utf8" });
const { code: lowered, report } = lowerCss(stock, { has: true }); // static page: opt in to the :has() polyfill
console.log(formatReport(report, "page.html"));

const browser = await puppeteer.launch({
  executablePath: await chromium.executablePath,
  args: [...chromium.args, "--no-sandbox"],
  headless: true,
});
const version = await browser.version();
console.log(`\nrendering in ${version}`);
if (!/\/103\./.test(version)) throw new Error("expected Chromium 103");

const html = fs.readFileSync(path.join(dir, "page.html"), "utf8");
// what vite-plugin-nuikit injects: the css-has-pseudo runtime for :has()
const hasRuntime = fs.readFileSync(require.resolve("css-has-pseudo/browser-global"), "utf8") + ";cssHasPseudo(document);";
async function render(css, file, runtime = "") {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html class="dark"><head><style>${css}</style><style>body{margin:0;font-family:Inter,system-ui,sans-serif}</style></head><body>${html}<script>${runtime}</script></body></html>`);
  await new Promise((r) => setTimeout(r, 200));
  const probe = await page.evaluate(() => {
    const q = (s) => getComputedStyle(document.querySelector(s));
    return { buy: q("[data-probe=buy]").backgroundColor, badge: q("[data-probe=badge]").backgroundColor, dialog: q("[data-probe=dialog]").transform, grid: q("[data-probe=grid]").gridTemplateColumns, gradient: q("[data-probe=title]").backgroundImage.slice(0, 32), hasSelector: q("[data-probe=svgbtn]").paddingLeft };
  });
  await page.screenshot({ path: file });
  await page.close();
  return probe;
}

const before = await render(stock, out("before.png"));
const after = await render(lowered, out("after.png"), hasRuntime);
console.table({ before, after });

const fail = [];
if (after.buy === "rgba(0, 0, 0, 0)") fail.push("primary button has no background");
if (!/rgba\(.*0\.15\)/.test(after.badge)) fail.push("bg-primary/15 badge not translucent primary");
if (after.dialog === "none") fail.push("-translate-1/2 dialog not centered");
if (after.grid.split(" ").length !== 2) fail.push("md:grid-cols-2 breakpoint inactive");
if (!after.gradient.startsWith("linear-gradient")) fail.push("bg-gradient-to-r renders no gradient");
if (after.hasSelector !== "12px") fail.push("shadcn Button has-[>svg]:px-3 (:has) not applied");
if (before.buy !== "rgba(0, 0, 0, 0)") console.warn("note: stock CSS rendered the button — has Cfx shipped a newer CEF?");

// side-by-side for the README
const img = (f) => `data:image/png;base64,${fs.readFileSync(out(f)).toString("base64")}`;
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 440, deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><body style="margin:0;background:#0a0a0a;font:600 15px Inter,system-ui,sans-serif;color:#e7e9ee">
<div style="display:flex;gap:24px;padding:28px 32px 32px">${[["before.png", "Stock shadcn + Tailwind v4", "#ef4444", "in FiveM (Chromium 103)"], ["after.png", "With vite-plugin-nuikit", "#22c55e", "same code, same browser"]]
  .map(([f, t, c, s]) => `<figure style="margin:0;flex:1"><figcaption style="margin-bottom:12px;display:flex;gap:8px;align-items:center"><span style="width:8px;height:8px;border-radius:999px;background:${c}"></span>${t}<span style="color:#6b7385;font-weight:400">${s}</span></figcaption><img src="${img(f)}" style="width:100%;border-radius:12px;border:1px solid #ffffff1a;display:block"></figure>`)
  .join("")}</div></body>`);
await page.screenshot({ path: out("compare.png") });
await browser.close();

if (fail.length) {
  console.error("\n✗ " + fail.join("\n✗ "));
  process.exit(1);
}
console.log("\n✓ shadcn renders correctly in Chromium 103 after nuikit");
