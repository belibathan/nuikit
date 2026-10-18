// Renders brand PNGs from docs/src/banner.html. Usage: node docs/src/render.mjs [photo.jpg]
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../..");
const photo = process.argv[2] ?? fs.readdirSync(path.join(root, "docs/brand/bg")).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => path.join(root, "docs/brand/bg", f))[0];
const credit = photo && fs.existsSync(photo.replace(/\.\w+$/, ".txt")) ? fs.readFileSync(photo.replace(/\.\w+$/, ".txt"), "utf8").trim() : "";
const jobs = [
  { out: "docs/assets/banner.png", w: 1280, h: 640, s: 116 },
  { out: "docs/assets/social-preview.png", w: 1280, h: 640, s: 116 },
  { out: "apps/www/public/og.png", w: 1200, h: 630, s: 112 },
  { out: "docs/brand/avatar.png", w: 512, h: 512, s: 0, icon: true },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.icon ? 1 : 2 });
  await page.goto(pathToFileURL(path.join(dir, "banner.html")).href);
  await page.evaluate(({ j, photo, credit }) => {
    const r = document.documentElement.style;
    r.setProperty("--w", j.w + "px"); r.setProperty("--h", j.h + "px"); r.setProperty("--s", j.s + "px");
    if (photo) document.body.style.setProperty("--photo", `url("${photo}")`);
    if (j.icon) { document.body.classList.add("icon"); document.querySelector(".word").remove(); document.querySelector(".tag").remove(); document.querySelector(".cmd").remove(); document.body.style.setProperty("--blur", "10px"); }
    else document.querySelector(".foot").textContent = credit;
  }, { j, photo: photo ? pathToFileURL(photo).href : "", credit });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(root, j.out) });
  console.log("wrote", j.out, photo ? "(photo)" : "(no photo)");
}
await browser.close();
