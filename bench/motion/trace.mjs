// Chrome tracing over CDP for the motion bench: frames produced, and main-thread time per frame.
//
// Frames: each frame the compositor draws ("DrawFrame"). An idle page draws none.
// Main thread: the renderer main thread's top-level tasks ("RunTask" etc. in "toplevel"), summed over
// the window and divided by the frames drawn in it; plus style, layout and paint counts.
const CATEGORIES = [
  "toplevel",
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "blink",
  "cc",
  "benchmark",
];

export async function trace(page, during) {
  const cdp = await page.context().newCDPSession(page);
  const events = [];
  cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
  const done = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.start", { traceConfig: { includedCategories: CATEGORIES }, transferMode: "ReportEvents" });
  const t0 = await page.evaluate(() => performance.timeOrigin + performance.now());
  const extra = await during();
  const t1 = await page.evaluate(() => performance.timeOrigin + performance.now());
  await cdp.send("Tracing.end");
  await done;
  await cdp.detach();
  return { ...analyse(events, t0, t1), extra };
}

function analyse(events, t0Ms, t1Ms) {
  // the renderer process and its main thread
  const names = new Map();
  for (const e of events) if (e.ph === "M" && e.name === "thread_name") names.set(`${e.pid}:${e.tid}`, e.args.name);
  const mainKeys = [...names].filter(([, n]) => n === "CrRendererMain").map(([k]) => k);
  // ts are µs on the trace clock; anchor the window by the trace's own span (the during() callback)
  const ts = events.filter((e) => e.ts > 0).map((e) => e.ts);
  const start = Math.min(...ts);
  const end = Math.max(...ts);
  const inWin = (e) => e.ts >= start && e.ts <= end;
  const frames = events.filter((e) => e.name === "DrawFrame" && inWin(e)).length;
  const main = events.filter((e) => mainKeys.includes(`${e.pid}:${e.tid}`) && e.ph === "X" && inWin(e));
  // top-level tasks, merged where they nest or overlap (RunTask wraps ThreadControllerImpl::RunTask…)
  const spans = main
    .filter((e) => e.cat.split(",").includes("toplevel"))
    .map((e) => [e.ts, e.ts + (e.dur ?? 0)])
    .sort((a, b) => a[0] - b[0]);
  const top = [];
  for (const [s, f] of spans) {
    const last = top.at(-1);
    if (last && s <= last.ts + last.dur) last.dur = Math.max(last.dur, f - last.ts);
    else top.push({ ts: s, dur: f - s });
  }
  const busyMs = top.reduce((s, e) => s + (e.dur ?? 0), 0) / 1000;
  const count = (n) => main.filter((e) => e.name === n).length;
  if (process.env.TRACE_DEBUG) {
    const by = new Map();
    for (const e of main) by.set(e.name, (by.get(e.name) ?? 0) + (e.dur ?? 0) / 1000);
    console.log([...by].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([n, d]) => `${n} ${d.toFixed(1)}`).join(" | "));
  }
  const longest = Math.max(0, ...top.map((e) => (e.dur ?? 0) / 1000));
  const spanMs = (end - start) / 1000;
  // main-thread time per frame: each top-level task counts toward the frame interval it starts in
  const drawn = events.filter((e) => e.name === "DrawFrame" && inWin(e)).map((e) => e.ts).sort((a, b) => a - b);
  const buckets = drawn.map(() => 0);
  for (const e of top) {
    let i = drawn.findIndex((t) => t >= e.ts);
    if (i < 0) continue; // after the last frame: no frame to charge it to
    buckets[i] += (e.dur ?? 0) / 1000;
  }
  const q = (arr, p) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))] * 100) / 100;
  };
  return {
    perFrameMedianMs: q(buckets, 0.5),
    perFrameP90Ms: q(buckets, 0.9),
    perFrameMaxMs: q(buckets, 1),
    perFrame: buckets.map((b) => Math.round(b * 100) / 100),
    spanMs: Math.round(spanMs),
    frames,
    mainMs: Math.round(busyMs * 100) / 100,
    mainPerFrameMs: frames ? Math.round((busyMs / frames) * 100) / 100 : 0,
    longestTaskMs: Math.round(longest * 100) / 100,
    styleRecalcs: count("UpdateLayoutTree") + count("RecalculateStyles"),
    layouts: count("Layout"),
    paints: count("Paint"),
    animationFrames: count("FireAnimationFrame"),
    wallMs: Math.round(t1Ms - t0Ms),
  };
}
