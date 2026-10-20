// ox_lib request timings: what the override posts to Lua (progressComplete, skillCheckOver), and
// when, measured in the page from the message (or the key press) that caused it. Run it on two
// builds of the ox_lib override to show the motion work kept every request and its timing:
//
//   node bench/motion/timings.mjs <label> [build dir, default addons/ox_lib/web/build]
//   node bench/motion/timings.mjs --compare before after     → bench/motion/.out/timings-*.json
//
// The skill check's zone is fixed by Math.random = 0.5 (lib.mjs): easy 215°–265° of a 2000 ms turn,
// medium 220°–260° of a 1333 ms turn.
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, OUT, REPO, openOxLib, playwright, posts, send } from "./lib.mjs";

const RUNS = Number(process.env.RUNS ?? 5);
fs.mkdirSync(OUT, { recursive: true });

if (process.argv[2] === "--compare") {
  const [a, b] = process.argv.slice(3).map((l) => JSON.parse(fs.readFileSync(path.join(OUT, `timings-${l}.json`), "utf8")));
  let ok = true;
  console.log(`| Case | Request | ${a.label} (ms) | ${b.label} (ms) | Δ (ms) |\n|---|---|---|---|---|`);
  for (const [name, x] of Object.entries(a.cases)) {
    const y = b.cases[name];
    const d = y.median - x.median;
    const same = JSON.stringify(x.requests) === JSON.stringify(y.requests);
    if (Math.abs(d) > 15 || !same) ok = false;
    console.log(`| ${name} | ${y.requests.join(", ")}${same ? "" : ` (was ${x.requests.join(", ")})`} | ${x.median.toFixed(1)} | ${y.median.toFixed(1)} | ${d >= 0 ? "+" : ""}${d.toFixed(1)} |`);
  }
  console.log(ok ? "\n✓ every request identical, every timing within ±15 ms" : "\n✗ a request or a timing differs");
  process.exit(ok ? 0 : 1);
}

const label = process.argv[2] ?? "run";
const build = path.resolve(process.argv[3] ?? path.join(REPO, "addons/ox_lib/web/build"));
const { chromium } = playwright();
const browser = await chromium.launch({ executablePath: CHROMIUM });

/** Press `key` `ms` after `from` (page clock); returns the press time. */
const pressAt = (page, from, ms, key = "e") =>
  page.evaluate(
    ([from, ms, key]) =>
      new Promise((resolve) => {
        setTimeout(() => {
          const t = performance.now();
          window.dispatchEvent(new KeyboardEvent("keydown", { key, code: `Key${key.toUpperCase()}` }));
          resolve(t);
        }, Math.max(0, from + ms - performance.now()));
      }),
    [from, ms, key],
  );

const CASES = {
  "progress 1000 ms": async (page) => {
    const t = await send(page, "progress", { label: "Repairing", duration: 1000 });
    await page.waitForTimeout(1500);
    return { from: t, wait: "progressComplete" };
  },
  "progress cancelled at 400 ms": async (page) => {
    await send(page, "progress", { label: "Repairing", duration: 3000 });
    await page.waitForTimeout(400);
    const t = await send(page, "progressCancel");
    await page.waitForTimeout(600);
    return { from: t, wait: "progressComplete" };
  },
  "circle 1000 ms": async (page) => {
    const t = await send(page, "circleProgress", { duration: 1000, label: "Lockpicking" });
    await page.waitForTimeout(1500);
    return { from: t, wait: "progressComplete" };
  },
  "skill easy, no press (miss at a full turn)": async (page) => {
    const t = await send(page, "startSkillCheck", { difficulty: "easy", inputs: ["e"] });
    await page.waitForTimeout(2400);
    return { from: t, wait: "skillCheckOver" };
  },
  "skill easy, press in the zone (1330 ms)": async (page) => {
    const t = await send(page, "startSkillCheck", { difficulty: "easy", inputs: ["e"] });
    const p = await pressAt(page, t, 1330);
    await page.waitForTimeout(300);
    return { from: p, wait: "skillCheckOver" };
  },
  "skill easy, press early (600 ms)": async (page) => {
    const t = await send(page, "startSkillCheck", { difficulty: "easy", inputs: ["e"] });
    const p = await pressAt(page, t, 600);
    await page.waitForTimeout(300);
    return { from: p, wait: "skillCheckOver" };
  },
  "skill medium ×2, both in the zone": async (page) => {
    const t = await send(page, "startSkillCheck", { difficulty: ["medium", "medium"], inputs: ["e"] });
    const p1 = await pressAt(page, t, 890);
    const p2 = await pressAt(page, p1, 890);
    await page.waitForTimeout(300);
    return { from: p2, wait: "skillCheckOver" };
  },
};

const out = { label, build, chromium: browser.version(), cases: {} };
for (const [name, run] of Object.entries(CASES)) {
  const deltas = [];
  let requests = [];
  for (let i = 0; i < RUNS; i++) {
    const { context, page } = await openOxLib(browser, build);
    const start = await page.evaluate(() => performance.now());
    const { from, wait } = await run(page);
    const log = (await posts(page, start)).filter((p) => p.name !== "init" && p.name !== "getConfig");
    requests = log.map((p) => `${p.name}(${p.body ?? ""})`);
    const hit = log.find((p) => p.name === wait);
    deltas.push(hit ? hit.t - from : NaN);
    await context.close();
  }
  const sorted = [...deltas].sort((a, b) => a - b);
  out.cases[name] = { requests, deltas: deltas.map((d) => Math.round(d * 10) / 10), median: sorted[Math.floor(sorted.length / 2)] };
  console.log(`${name}: ${requests.join(", ")} at +${out.cases[name].median.toFixed(1)} ms (runs ${out.cases[name].deltas.join(", ")})`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, `timings-${label}.json`), JSON.stringify(out, null, 2));
