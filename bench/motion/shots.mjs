// Screenshots of the reworked timed parts (ring, bar, skill check) mid-run, at the three
// resolutions, for a side-by-side with another build.
//
//   node bench/motion/shots.mjs <label> [build dir]     → bench/motion/.out/shots/<label>-*.png
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, OUT, REPO, openOxLib, playwright, send } from "./lib.mjs";

const label = process.argv[2] ?? "run";
const build = path.resolve(process.argv[3] ?? path.join(REPO, "addons/ox_lib/web/build"));
const dir = path.join(OUT, "shots");
fs.mkdirSync(dir, { recursive: true });
const { chromium } = playwright();
const browser = await chromium.launch({ executablePath: CHROMIUM });

const SIZES = [
  [1920, 1080],
  [2560, 1440],
  [1280, 720],
];
for (const [width, height] of SIZES) {
  const { context, page } = await openOxLib(browser, build, { width, height });
  await page.addStyleTag({ content: "html{background:#4b5b6b linear-gradient(160deg,#7d9ab3,#2b3440) !important}" });
  // ring at ~60%, bar at ~60%, skill-check needle at ~108° (easy: zone 215°–265°)
  await send(page, "circleProgress", { duration: 2500, label: "Lockpicking" });
  await send(page, "progress", { duration: 2500, label: "Repairing" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(dir, `${label}-progress-${width}.png`) });
  await page.waitForTimeout(1300);
  await send(page, "startSkillCheck", { difficulty: "easy", inputs: ["e"] });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(dir, `${label}-skill-${width}.png`) });
  await context.close();
}
await browser.close();
console.log(`✓ ${dir}/${label}-*.png`);
