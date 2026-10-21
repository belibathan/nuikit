// Screenshots of every intent fixture at 1920×1080, 2560×1440 and 1280×720 over the day scene, and
// a log of what each renderer POSTs to Lua when driven (click, keys, Escape).
//
//   node scripts/screenshots.mjs [outDir]      (pnpm --filter nuikit-host-web shots)
//
// Needs the dev server's fixtures (src/dev.tsx), so it starts `vite` itself. Chromium: Playwright's
// (PLAYWRIGHT = the playwright package, PW_CHROMIUM = the browser; defaults are Claude cloud paths).
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");

const web = fileURLToPath(new URL("..", import.meta.url));
const out = path.resolve(process.argv[2] ?? path.join(web, "shots"));
mkdirSync(out, { recursive: true });
const PORT = 5179;
const SIZES = [
  [1920, 1080],
  [2560, 1440],
  [1280, 720],
];
const FIXTURES = ["notify", "menu", "menu-keyboard", "menu-cursor", "menu-esx", "menu-preview", "input", "input-ox", "input-qb", "confirm", "confirm-ox", "progress", "progress-ring", "progress-driven", "prompt", "target", "target-eye", "radial", "challenge", "all"];

// vite's own binary (not through npx: a wrapper would swallow the SIGINT the nuikit plugin needs
// to put ui_page back in fxmanifest.lua).
const vite = spawn(process.execPath, [path.join(web, "node_modules/vite/bin/vite.js"), "--port", String(PORT), "--strictPort"], { cwd: web, stdio: ["ignore", "pipe", "pipe"] });
const ready = new Promise((resolve, reject) => {
  vite.stdout.on("data", (d) => String(d).includes("Local:") && resolve());
  vite.stderr.on("data", (d) => process.stderr.write(d));
  vite.on("exit", (code) => reject(new Error(`vite exited ${code}`)));
});
const stop = () => vite.exitCode === null && vite.kill("SIGINT"); // SIGINT: the nuikit plugin restores ui_page on exit
process.on("exit", stop);
process.on("SIGINT", () => process.exit(130));
process.on("uncaughtException", (e) => {
  console.error(e);
  process.exit(1);
});

try {
  await ready;
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const log = [];
  const errors = [];
  for (const [w, h] of SIZES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => errors.push(`${w}x${h}: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`${w}x${h} console: ${m.text()}`));
    for (const f of FIXTURES) {
      await page.goto(`http://localhost:${PORT}/?fixture=${f}`);
      await page.waitForFunction(() => !!window.nk);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(out, `${f}-${w}x${h}.png`) });
    }
    if (w === 1920) {
      // Drive the renderers and record what reaches Lua.
      const posts = async () => page.evaluate(() => window.nk.posts.splice(0));
      await page.goto(`http://localhost:${PORT}/?fixture=menu`);
      await page.waitForFunction(() => !!window.nk);
      await page.getByRole("button", { name: /Paint shop/ }).click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(out, `menu-submenu-${w}x${h}.png`) });
      await page.getByRole("button", { name: /^Black/ }).click();
      log.push({ step: "menu: open inline submenu, pick Black", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("menu-keyboard"));
      await page.waitForTimeout(200);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("Enter"); // checkbox toggles, stays open
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter"); // stepper resolves with value
      log.push({ step: "menu keyboard: arrows, toggle, step, enter", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("menu-cursor"));
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
      log.push({ step: "menu canClose=false: Escape ignored", posts: await posts() });
      await page.getByRole("button", { name: "Back" }).click();
      log.push({ step: "menu: back button (menu = 'main')", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("confirm"));
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: "Sell" }).click();
      log.push({ step: "confirm: Sell", posts: await posts() });
      await page.evaluate(() => window.nk.fixture("confirm-ox"));
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
      log.push({ step: "confirm cancel=false: Escape → cancel", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("input"));
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(out, `input-invalid-${w}x${h}.png`) });
      log.push({ step: "input: submit with a required field empty (blocked)", posts: await posts() });
      await page.getByPlaceholder("Full name").fill("Niko Bellic");
      await page.keyboard.press("Enter");
      log.push({ step: "input: fill owner, Enter submits", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("target"));
      await page.waitForTimeout(200);
      await page.getByRole("button", { name: /Services/ }).click();
      await page.waitForTimeout(100);
      await page.getByRole("button", { name: /Wash/ }).click();
      log.push({ step: "target: Services → Wash", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("radial"));
      await page.waitForTimeout(300);
      await page.getByRole("menuitem", { name: /Phone/ }).click({ force: true });
      log.push({ step: "radial: Phone", posts: await posts() });
      await page.evaluate(() => window.nk.fixture("radial"));
      await page.waitForTimeout(300);
      await page.getByRole("menuitem", { name: /Police/ }).click({ force: true });
      log.push({ step: "radial: Police (menu = 'police')", posts: await posts() });

      await page.evaluate(() => window.nk.fixture("challenge"));
      await page.waitForTimeout(300);
      await page.keyboard.press("x"); // not in keys: ignored
      await page.waitForTimeout(100);
      await page.keyboard.press("q"); // listed, wrong or right? the round picks E or Q at random
      await page.waitForTimeout(400);
      log.push({ step: "challenge: x ignored, q judged", posts: await posts() });

      await page.evaluate(() => window.nk.open("progress", { label: "Quick", duration: 300 }));
      await page.waitForTimeout(600);
      log.push({ step: "progress: 300 ms run resolves true", posts: await posts() });

      await page.evaluate(() => window.nk.open("notify", { title: "Short", duration: 200 }));
      await page.waitForTimeout(500);
      log.push({ step: "notify: 200 ms toast ends (timeout)", posts: await posts() });
    }
    await page.close();
  }
  await browser.close();
  writeFileSync(path.join(out, "posts.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
  if (errors.length) {
    console.error("page errors:\n" + errors.join("\n"));
    process.exitCode = 1;
  }
  console.log(`screenshots → ${out}`);
} finally {
  stop();
}
