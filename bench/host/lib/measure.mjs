// What the benchmark measures, outside the page: process memory (PSS from /proc), JS heap and
// DOM nodes (CDP), and main-thread / compositor time from a Chrome trace.
import fs from "node:fs";

/** All processes under the browser's pid (renderers, GPU, utility), Linux only. */
function descendants(root) {
  const children = new Map();
  for (const pid of fs.readdirSync("/proc").filter((d) => /^\d+$/.test(d))) {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
      const ppid = Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]);
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid).push(Number(pid));
    } catch {
      /* gone */
    }
  }
  const out = [];
  const walk = (pid) => {
    out.push(pid);
    for (const c of children.get(pid) ?? []) walk(c);
  };
  walk(root);
  return out;
}

/** Proportional set size of the whole browser, in MB, plus per-kind breakdown. */
export function processMemory(browserPid) {
  let pss = 0;
  let renderers = 0;
  let rendererPss = 0;
  for (const pid of descendants(browserPid)) {
    try {
      const rollup = fs.readFileSync(`/proc/${pid}/smaps_rollup`, "utf8");
      const kb = Number(/^Pss:\s+(\d+)/m.exec(rollup)?.[1] ?? 0);
      pss += kb;
      const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
      if (cmd.includes("--type=renderer")) {
        renderers++;
        rendererPss += kb;
      }
    } catch {
      /* gone */
    }
  }
  return { pssMB: pss / 1024, rendererPssMB: rendererPss / 1024, renderers };
}

/**
 * JS heap after GC, summed over the page's process and every out-of-process frame.
 * In-process frames share the page's isolate, so they're counted once.
 */
export async function jsHeap(context, page) {
  const sessions = [await context.newCDPSession(page)];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      sessions.push(await context.newCDPSession(frame));
    } catch {
      /* in-process frame */
    }
  }
  let used = 0;
  for (const s of sessions) {
    try {
      await s.send("HeapProfiler.collectGarbage");
      const { usedSize } = await s.send("Runtime.getHeapUsage");
      used += usedSize;
    } catch {
      /* detached */
    }
    await s.detach().catch(() => {});
  }
  return { heapMB: used / 1048576, isolates: sessions.length };
}

/** Elements in every frame, shadow roots included. */
export async function domNodes(page) {
  let total = 0;
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    try {
      total += await frame.evaluate(() => {
        let n = 0;
        const walk = (root) => {
          for (const el of root.querySelectorAll("*")) {
            n++;
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document);
        return n;
      });
    } catch {
      /* navigating */
    }
  }
  return total;
}

const SCRIPT = new Set(["FunctionCall", "EvaluateScript", "v8.compile", "v8.compileModule", "v8.evaluateModule", "TimerFire", "FireAnimationFrame", "RunMicrotasks", "EventDispatch", "V8.Execute"]);
const STYLE = new Set(["UpdateLayoutTree", "RecalculateStyles", "Layout"]);
const PAINT = new Set(["PrePaint", "Paint", "Layerize", "UpdateLayer", "CompositeLayers"]);
const TASK = new Set(["ThreadControllerImpl::RunTask", "RunTask"]);

function union(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [s, e] = [-Infinity, -Infinity];
  for (const [a, b] of intervals) {
    if (a > e) {
      if (e > s) total += e - s;
      [s, e] = [a, b];
    } else if (b > e) e = b;
  }
  if (e > s) total += e - s;
  return total;
}

/**
 * Busy time per second of trace, in ms: renderer main threads (script, style+layout, paint, all
 * tasks) and the compositor/GPU side (renderer compositor threads, viz, GPU main).
 */
export function parseTrace(buffer, seconds) {
  const { traceEvents } = JSON.parse(buffer.toString("utf8"));
  const threadName = new Map();
  for (const e of traceEvents) if (e.ph === "M" && e.name === "thread_name") threadName.set(`${e.pid}:${e.tid}`, e.args.name);
  const buckets = new Map(); // `${pid}:${tid}:${kind}` → intervals
  const add = (key, ts, dur) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([ts, ts + dur]);
  };
  for (const e of traceEvents) {
    if (e.ph !== "X" || !e.dur) continue;
    const t = `${e.pid}:${e.tid}`;
    const name = threadName.get(t);
    if (name === "CrRendererMain") {
      if (TASK.has(e.name)) add(`${t}:task`, e.ts, e.dur);
      if (SCRIPT.has(e.name)) add(`${t}:script`, e.ts, e.dur);
      if (STYLE.has(e.name)) add(`${t}:style`, e.ts, e.dur);
      if (PAINT.has(e.name)) add(`${t}:paint`, e.ts, e.dur);
    } else if (name === "Compositor" || name === "VizCompositorThread" || name === "CrGpuMain") {
      if (TASK.has(e.name)) add(`${t}:gpu`, e.ts, e.dur);
    }
  }
  const sum = { task: 0, script: 0, style: 0, paint: 0, gpu: 0 };
  for (const [key, list] of buckets) sum[key.split(":")[2]] += union(list) / 1000; // µs → ms
  for (const k of Object.keys(sum)) sum[k] /= seconds;
  return sum;
}

export const median = (xs) => {
  const s = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const percentile = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
