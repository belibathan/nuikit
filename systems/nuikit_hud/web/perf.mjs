// The HUD's frame cost, measured the way CEF on a gaming PC is closest to: headless Chrome with the CPU
// throttled 4×, 1920×1080, the dev page driven by the same NUI messages Lua sends (window.postMessage).
// Each scenario runs on a fresh page; per scenario it prints frame times (from requestAnimationFrame),
// janky frames (over 25 ms), long tasks, and Chrome's layout / style recalc counts and durations.
//
//   pnpm --filter ./systems/nuikit_hud/web dev -- --port 5191     (or the preview server)
//   node systems/nuikit_hud/web/perf.mjs [http://localhost:5191/] [--json out.json]
//
// CHROME=<path to chrome.exe> picks the browser; playwright-core comes from the workspace.
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");

const base = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:5191/";
const jsonOut = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const exe = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SECONDS = Number(process.env.SECONDS ?? 6);

const player = (o = {}) => ({
  loaded: true, id: "ABC", name: "Niko Bellic", health: 100, armor: 50, hunger: 80, thirst: 70, stress: 10,
  cash: 1250, bank: 48000, dead: false, job: { name: "police", label: "LSPD", grade: "Officer", onDuty: true },
  voice: { talking: false, range: "Normal" }, ...o,
});

// What each scenario does inside the page, every `ms`; `i` counts ticks.
const SCENARIOS = {
  idle: { url: "?fixture=foot", setup: null, ms: 1000, tick: () => null },
  vitals: {
    url: "?fixture=foot",
    setup: null,
    ms: 200,
    // the vitals and money move as in a fight: several change at once, some cross their thresholds
    tick: (i) => ({ action: "nuikit:player", data: { __player: { health: 100 - ((i * 7) % 90), armor: (i * 13) % 100, hunger: 80 - ((i * 3) % 60), thirst: 70 - ((i * 5) % 60), stress: (i * 11) % 100, cash: 1250 + (i % 5 === 0 ? i * 10 : 0) } } }),
  },
  voice: {
    url: "?fixture=foot",
    setup: { styles: { "vitals.visibility": "voice", "vitals.voice": "collapse" } }, // (vitals.voice: builds before 2)
    ms: 450,
    // talking on and off: the vitals tuck behind voice and come back
    tick: (i) => ({ action: "nuikit:player", data: { __player: { voice: { talking: i % 2 === 0, range: "Normal" } } } }),
  },
  pills: {
    url: "?fixture=foot",
    setup: { styles: { "vitals.display": "pill", "vitals.visibility": "always" } },
    ms: 200,
    tick: (i) => ({ action: "nuikit:player", data: { __player: { health: 100 - ((i * 7) % 90), armor: (i * 13) % 100, hunger: 80 - ((i * 3) % 60) } } }),
  },
  entrance: { url: "?fixture=foot", setup: null, ms: 700, tick: (i) => ({ hud: i % 2 === 0 ? "close" : "open" }) },
  driving: {
    url: "?fixture=cruise",
    setup: null,
    ms: 33,
    // the live values at 30 a second, as Lua streams them, and a vital now and then
    tick: (i) => [
      { action: "hud:vehicle:speed", data: 40 + 25 * Math.sin(i / 20) },
      { action: "hud:vehicle:rpm", data: 0.45 + 0.35 * Math.abs(Math.sin(i / 9)) },
      { action: "hud:minimap:heading", data: (i * 1.5) % 360 },
      ...(i % 30 === 0 ? [{ action: "nuikit:player", data: { __player: { health: 100 - (i % 50) } } }] : []),
    ],
  },
};

const browser = await chromium.launch({ executablePath: exe, headless: true });
const results = {};
// ONLY=voice,idle runs just those
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
for (const [name, sc] of Object.entries(SCENARIOS)) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const cdp = await page.context().newCDPSession(page);
  await page.goto(base + sc.url, { waitUntil: "load" });
  await page.waitForTimeout(2500); // the entrance and the first data settle
  if (sc.setup) {
    await page.evaluate((s) => window.__hud?.open(s), sc.setup);
    await page.waitForTimeout(800);
  }
  await cdp.send("Performance.enable");
  const profiling = process.env.PROFILE === name;
  if (profiling) {
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
    await cdp.send("Profiler.start");
  }
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const before = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));

  await page.evaluate(
    ({ ms, seconds, tickSrc, base }) => {
      const tick = new Function(`return (${tickSrc})`)();
      const rec = (window.__perf = { frames: [], long: [] });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => rec.long.push(e.duration))).observe({ entryTypes: ["longtask"] });
      let last = performance.now();
      const end = last + seconds * 1000;
      const frame = (t) => {
        rec.frames.push(t - last);
        last = t;
        if (t < end) requestAnimationFrame(frame);
        else rec.done = true;
      };
      requestAnimationFrame(frame);
      let i = 0;
      let cur = { ...base };
      const id = setInterval(() => {
        if (performance.now() > end) return clearInterval(id);
        const out = tick(i++);
        for (const m of [].concat(out ?? [])) {
          if (m.hud) window.__hud?.[m.hud]();
          else if (m.data && m.data.__player) {
            cur = { ...cur, ...m.data.__player };
            window.postMessage({ action: "nuikit:player", data: cur }, "*");
          } else window.postMessage(m, "*");
        }
      }, ms);
    },
    { ms: sc.ms, seconds: SECONDS, tickSrc: sc.tick.toString(), base: player() },
  );
  await page.waitForFunction(() => window.__perf?.done === true, null, { timeout: (SECONDS + 20) * 1000 });
  const after = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const rec = await page.evaluate(() => window.__perf);
  if (profiling) {
    // the functions that spent the most time themselves (self time), with their file
    const { profile } = await cdp.send("Profiler.stop");
    // and who called the native layout and style reads (the forced ones)
    const parentOf = new Map();
    profile.nodes.forEach((n) => (n.children ?? []).forEach((c) => parentOf.set(c, n)));
    const callers = new Map();
    const self = new Map();
    const dt = profile.timeDeltas ?? [];
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    (profile.samples ?? []).forEach((id, k) => {
      const n = byId.get(id);
      const f = n.callFrame;
      const key = `${f.functionName || "(anon)"} ${(f.url || "").split("/").pop()}:${f.lineNumber + 1}`;
      self.set(key, (self.get(key) ?? 0) + (dt[k] ?? 0) / 1000);
      if (f.functionName === "getBoundingClientRect" || f.functionName === "getPropertyValue" || f.functionName === "getComputedStyle") {
        const p = parentOf.get(n.id)?.callFrame;
        const pk = `${f.functionName} ← ${p?.functionName || "(anon)"} ${(p?.url || "").split("/").pop()}:${(p?.lineNumber ?? 0) + 1}`;
        callers.set(pk, (callers.get(pk) ?? 0) + (dt[k] ?? 0) / 1000);
      }
    });
    console.log(`top self time, ${name}:`);
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, ms]) => console.log(`  ${ms.toFixed(0).padStart(6)} ms  ${k}`));
    console.log("forced reads by caller:");
    [...callers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, ms]) => console.log(`  ${ms.toFixed(0).padStart(6)} ms  ${k}`));
  }
  const f = rec.frames.slice(1).sort((a, b) => a - b);
  const pct = (p) => f[Math.min(f.length - 1, Math.floor(f.length * p))] ?? 0;
  const d = (k) => (after[k] ?? 0) - (before[k] ?? 0);
  results[name] = {
    frames: f.length,
    fps: +(f.length / SECONDS).toFixed(1),
    meanMs: +(f.reduce((a, b) => a + b, 0) / Math.max(1, f.length)).toFixed(2),
    p95Ms: +pct(0.95).toFixed(2),
    maxMs: +(f.at(-1) ?? 0).toFixed(1),
    jank25: f.filter((x) => x > 25).length,
    longTasks: rec.long.length,
    longTaskMs: +rec.long.reduce((a, b) => a + b, 0).toFixed(0),
    layouts: d("LayoutCount"),
    layoutMs: +(d("LayoutDuration") * 1000).toFixed(1),
    styleRecalcs: d("RecalcStyleCount"),
    styleMs: +(d("RecalcStyleDuration") * 1000).toFixed(1),
    scriptMs: +(d("ScriptDuration") * 1000).toFixed(1),
  };
  await page.close();
}
await browser.close();
console.table(results);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
