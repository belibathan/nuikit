// Motion perf proof (design v2 §5A, motion.md §4.4–4.5): Chrome traces of the ox_lib override while
// idle, opening a menu, stacking notices and running a meter, a progress ring and a skill check.
// Budget: zero frames when idle; ≤ 1.5 ms of main thread per frame while animating (2560×1440).
//
//   node bench/motion/perf.mjs <label> [build dir]     → bench/motion/.out/perf-<label>.json
//
// "frames" = DrawFrame events (frames the compositor produced). "main/frame" = the renderer main
// thread's top-level task time over the window ÷ frames; "steady" leaves out the window's longest
// task (the open itself: React rendering the surface, a one-off start cost).
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, OUT, REPO, openOxLib, playwright, send } from "./lib.mjs";
import { trace } from "./trace.mjs";

const label = process.argv[2] ?? "run";
const build = path.resolve(process.argv[3] ?? path.join(REPO, "addons/ox_lib/web/build"));
const { chromium } = playwright();
const browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--enable-gpu-benchmarking"] });
fs.mkdirSync(OUT, { recursive: true });
const wait = (page, ms) => page.waitForTimeout(ms);
const animations = (page) => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);

const MENU = {
  title: "Garage",
  position: "top-left",
  items: Array.from({ length: 8 }, (_, i) => ({ label: `Vehicle ${i + 1}`, description: "Stored", icon: "car" })),
};
const notice = (i) => ({ id: `n${i}`, title: `Notice ${i + 1}`, description: "Paid $250", type: "success", duration: 3000 });

const SCENARIOS = {
  "idle (nothing open)": async (page) => trace(page, () => wait(page, 2000)),
  "menu open (8 rows)": async (page) => trace(page, async () => {
    await send(page, "setMenu", MENU);
    await wait(page, 600);
  }),
  "menu open, then idle": async (page) => {
    await send(page, "setMenu", MENU);
    await wait(page, 1000);
    return trace(page, async () => {
      await wait(page, 1500);
      return { running: await animations(page) };
    });
  },
  "menu, arrow keys ×5": async (page) => {
    await send(page, "setMenu", MENU);
    await wait(page, 800);
    return trace(page, async () => {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("ArrowDown");
        await wait(page, 120);
      }
      await wait(page, 300);
    });
  },
  "notice stack (4)": async (page) => trace(page, async () => {
    for (let i = 0; i < 4; i++) {
      await send(page, "notify", notice(i));
      await wait(page, 60);
    }
    await wait(page, 600);
  }),
  "notices gone, then idle": async (page) => {
    for (let i = 0; i < 4; i++) await send(page, "notify", notice(i));
    await wait(page, 4500);
    return trace(page, async () => {
      await wait(page, 1500);
      return { running: await animations(page) };
    });
  },
  "meter (progress bar, mid-run)": async (page) => {
    await send(page, "progress", { label: "Repairing", duration: 4000 });
    await wait(page, 800);
    return trace(page, () => wait(page, 1500));
  },
  "progress ring (mid-run)": async (page) => {
    await send(page, "circleProgress", { duration: 4000, label: "Lockpicking" });
    await wait(page, 800);
    return trace(page, () => wait(page, 1500));
  },
  "skill check (mid-sweep)": async (page) => {
    await send(page, "startSkillCheck", { difficulty: "easy", inputs: ["e"] });
    await wait(page, 300);
    return trace(page, () => wait(page, 1200));
  },
  "after everything, idle": async (page) => {
    await send(page, "progress", { label: "Repairing", duration: 500 });
    await send(page, "startSkillCheck", { difficulty: "hard", inputs: ["e"] });
    await wait(page, 2500);
    return trace(page, async () => {
      await wait(page, 1500);
      return { running: await animations(page) };
    });
  },
};

const out = { label, build, chromium: browser.version(), viewport: "2560×1440", scenarios: {} };
for (const [name, run] of Object.entries(SCENARIOS)) {
  const { context, page } = await openOxLib(browser, build, { width: 2560, height: 1440 });
  await wait(page, 500);
  const r = await run(page);
  const steady = r.frames ? Math.round(((r.mainMs - r.longestTaskMs) / r.frames) * 100) / 100 : 0;
  out.scenarios[name] = { ...r, steadyPerFrameMs: steady };
  console.log(
    `${name}: ${r.frames} frames in ${r.spanMs} ms, main ${r.mainMs} ms; per frame median ${r.perFrameMedianMs}, p90 ${r.perFrameP90Ms}, max ${r.perFrameMaxMs} ms; rAF ${r.animationFrames}, style ${r.styleRecalcs}, layout ${r.layouts}, paint ${r.paints}${r.extra?.running !== undefined ? `, running animations ${r.extra.running}` : ""}`,
  );
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, `perf-${label}.json`), JSON.stringify(out, null, 2));
