// Identity surface spike: what gradients, inner edges, shadows, glow and clip-path cut corners cost per
// frame, against flat panels, at 1920×1080. See results.md.
//
//   node bench/identity/spike.mjs [--runs=3] [--seconds=4] [--gpu]
//
// Per cell (fresh page): 1 s warm-up, then N seconds of: CPU time of every browser process (/proc),
// main-thread paint + compositor/raster busy time from a trace, and rAF frame intervals.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const RUNS = Number(arg("runs", "3"));
const SECONDS = Number(arg("seconds", "4"));
const VARIANTS = arg("v", "flat,v1,edge,soft,deep,glow,cut,cut-drop,all").split(",");
const SCENES = arg("scene", "composite,content,transform,repaint").split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const TICK = 100; // USER_HZ
function cpuMs(rootPid) {
  const children = new Map();
  for (const pid of fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      const rest = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      const ppid = Number(rest[1]);
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid).push({ pid: Number(pid), cpu: (Number(rest[11]) + Number(rest[12])) * (1000 / TICK) });
    } catch {}
  }
  let total = 0;
  const walk = (pid) => {
    for (const c of children.get(pid) ?? []) {
      total += c.cpu;
      walk(c.pid);
    }
  };
  walk(rootPid);
  return total;
}

function parseTrace(json, seconds) {
  const { traceEvents } = JSON.parse(json);
  const names = new Map();
  for (const e of traceEvents) if (e.ph === "M" && e.name === "thread_name") names.set(`${e.pid}:${e.tid}`, e.args.name);
  const busy = { paint: [], raster: [], gpu: [] };
  for (const e of traceEvents) {
    if (e.ph !== "X" || !e.dur) continue;
    const t = names.get(`${e.pid}:${e.tid}`) ?? "";
    if (t === "CrRendererMain" && /^(Paint|PrePaint|Layerize|UpdateLayer|CompositeLayers)$/.test(e.name)) busy.paint.push([e.ts, e.ts + e.dur]);
    // raster runs on several pool workers at once: summed (CPU time), not unioned
    else if (e.name === "RasterTask") busy.raster.push(e.dur);
    else if (/^(Compositor|VizCompositorThread|CrGpuMain)$/.test(t) && /RunTask$/.test(e.name)) busy.gpu.push([e.ts, e.ts + e.dur]);
  }
  const union = (list) => {
    list.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let [s, en] = [-Infinity, -Infinity];
    for (const [a, b] of list) {
      if (a > en) {
        if (en > s) total += en - s;
        [s, en] = [a, b];
      } else if (b > en) en = b;
    }
    if (en > s) total += en - s;
    return total / 1000 / seconds;
  };
  const raster = busy.raster.reduce((a, b) => a + b, 0) / 1000 / seconds;
  return { paint: union(busy.paint), raster, gpu: union(busy.gpu) };
}

const args = ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"];
if (process.argv.includes("--gpu")) args.push("--enable-gpu-rasterization", "--ignore-gpu-blocklist");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args });
const version = browser.version();
// every process Playwright started descends from this one
const pid = process.pid;

const results = [];
const url = (v, scene) => `file://${path.join(here, "spike.html")}?v=${v}&scene=${scene}`;
for (const scene of SCENES) {
  for (const v of VARIANTS) {
    const cells = [];
    for (let r = 0; r < RUNS; r++) {
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
      const page = await context.newPage();
      await page.goto(url(v, scene));
      await sleep(1000);
      const cdp = await context.newCDPSession(page);
      const chunks = [];
      cdp.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
      const done = new Promise((res) => cdp.once("Tracing.tracingComplete", res));
      await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,cc,viz,toplevel", transferMode: "ReportEvents" });
      await page.evaluate(() => (window.__frames = []));
      const c0 = cpuMs(pid);
      await sleep(SECONDS * 1000);
      const c1 = cpuMs(pid);
      const frames = await page.evaluate(() => window.__frames.slice(1));
      await cdp.send("Tracing.end");
      await done;
      const trace = parseTrace(JSON.stringify({ traceEvents: chunks }), SECONDS);
      cells.push({ cpu: (c1 - c0) / SECONDS, fps: frames.length / SECONDS, p95: pct(frames, 95), ...trace });
      await context.close();
    }
    const row = { scene, v };
    for (const k of Object.keys(cells[0])) row[k] = median(cells.map((c) => c[k]));
    results.push(row);
    console.log(`${scene.padEnd(9)} ${v.padEnd(9)} cpu ${row.cpu.toFixed(0).padStart(4)} ms/s  paint ${row.paint.toFixed(1).padStart(5)}  raster ${row.raster.toFixed(1).padStart(6)}  gpu ${row.gpu.toFixed(1).padStart(6)} ms/s  ${row.fps.toFixed(0)} fps  p95 ${row.p95.toFixed(1)} ms`);
  }
}
await browser.close();
fs.writeFileSync(path.join(here, "results.json"), JSON.stringify({ date: new Date().toISOString(), chromium: version, runs: RUNS, seconds: SECONDS, gpu: process.argv.includes("--gpu"), results }, null, 2));
