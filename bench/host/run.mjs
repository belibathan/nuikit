// The host benchmark: a simulated server with N UIs, as N iframes (today) or one host page with
// N modules, in desktop Chromium through the fake NUI (lib/nui.mjs). See results.md.
//
//   node bench/host/build.mjs                       (after pnpm build:systems)
//   node bench/host/run.mjs [--n=1,5,10,20] [--runs=3] [--configs=a,b] [--latency] [--no-load]
//
// Per run (fresh browser): load all UIs; send each its initial state; steady state for 5 s where
// 3 UIs update at 10 Hz (HUD vehicle, taxi meter, death screen) and one animates (ox_lib
// progress bar); then memory, heap, DOM, and five open → first frame timings of the pause menu.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { APPS, OUT, REPO, appOf, playwrightCore, server } from "./lib/apps.mjs";
import { domNodes, jsHeap, median, parseTrace, percentile, processMemory } from "./lib/measure.mjs";
import { ROOT_URL, installNui } from "./lib/nui.mjs";

const require = createRequire(import.meta.url);
const { chromium } = playwrightCore(require);

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const NS = arg("n", "1,5,10,20").split(",").map(Number);
const RUNS = Number(arg("runs", "3"));
const STEADY_S = 5;

/** isolation: Chromium's site isolation (desktop default: every cfx-nui-* origin is its own process). */
export const CONFIGS = {
  iframes: { mode: "iframes", isolation: true, label: "N iframes (site isolation on)" },
  "iframes-1p": { mode: "iframes", isolation: false, label: "N iframes (one renderer process)" },
  "host+boot": { mode: "host", boot: true, isolation: true, css: "shadow", label: "host + N idle ui_pages (site isolation on)" },
  "host+boot-1p": { mode: "host", boot: true, isolation: false, css: "shadow", label: "host + N idle ui_pages (one renderer process)" },
  host: { mode: "host", boot: false, isolation: true, css: "shadow", label: "host only (shadow roots)" },
  "host-scoped": { mode: "host", boot: false, isolation: true, css: "scoped", label: "host only (scoped CSS)" },
};
const CHOSEN = arg("configs", Object.keys(CONFIGS).join(",")).split(",");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 30000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out waiting");
    await sleep(50);
  }
}

// ── what each resource serves
// iframes: the app's own web folder. host: module.js + the boot ui_page (HUD's index.html and
// its boot chunk only; if a boot page ever loaded the full app it would 404).
const HOSTED = path.join(OUT, "hosted");
function prepareHosted() {
  const hudDist = path.join(REPO, "systems/nuikit_hud/web/dist");
  const boot = fs.readdirSync(path.join(hudDist, "assets")).find((f) => /^index-.*\.js$/.test(f));
  for (const app of APPS) {
    const dir = path.join(HOSTED, app.name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
    fs.copyFileSync(path.join(OUT, "modules", app.name, "module.js"), path.join(dir, "module.js"));
    fs.copyFileSync(path.join(hudDist, "index.html"), path.join(dir, "index.html"));
    fs.copyFileSync(path.join(hudDist, "assets", boot), path.join(dir, "assets", boot));
  }
  fs.mkdirSync(path.join(HOSTED, "probe"), { recursive: true });
  fs.copyFileSync(path.join(OUT, "probe/module.js"), path.join(HOSTED, "probe/module.js"));
}

function filesFor(cfg) {
  return (resource) => {
    if (resource === "nuikit") return path.join(REPO, "systems/nuikit");
    if (resource === "probe") return cfg.mode === "host" ? path.join(HOSTED, "probe") : path.join(OUT, "probe");
    const app = appOf(resource);
    if (!app) return null;
    return cfg.mode === "host" ? path.join(HOSTED, app.name) : path.join(REPO, app.web);
  };
}

// ── simulated Lua (see results.md: what the numbers can't tell us)
const TICK = 1000 / 60;
const luaDelay = (model) => (model === "tick60" ? sleep(TICK - (performance.now() % TICK)) : Promise.resolve());

function makeLua(cfg, tokens, state) {
  const owner = async (resource, name, data) => {
    if (name === "probe:echo") {
      // The Lua forwarding work itself (host.lua + nuikit.lua, µs) is measured by lua-cost.mjs and
      // added in results.md; a timer can't wait that little.
      await luaDelay(state.luaModel);
      return { ok: true, i: data?.i };
    }
    if (name === "nuikit:ready") return { ok: true, resource };
    if (name === "getConfig") return { primaryColor: "blue", primaryShade: 8 };
    return {};
  };
  return async (resource, name, body) => {
    if (name === "nuikit:host:mode") return { hosted: cfg.mode === "host" };
    if (resource === "nuikit" && name === "nuikit:host:ready") return { ok: true };
    if (resource === "nuikit" && name === "nuikit:host:call") {
      const r = tokens.get(body?.t);
      if (!r) return { error: "unknown module" };
      return owner(r, body.n, body.d);
    }
    return owner(resource, name, body);
  };
}

// ── the steady-state driver, run inside the root page (FiveM's root relays SendNUIMessage)
function driver(spec) {
  const kindOf = (r) => spec.kinds[r];
  const post = (resource, msg) => {
    if (spec.mode === "iframes") return window.send(resource, msg);
    // Host: nuikit-core apps get their messages through the host ({ nkm }); qbx_taxijob reads
    // raw window messages (its Lua isn't nuikit.lua), so it gets them as-is.
    if (kindOf(resource) === "taxi") return window.send("nuikit", msg);
    return window.send("nuikit", { nkm: resource, ...msg });
  };
  const surfaces = (name, layer, data, extra = {}) => ({
    action: "nuikit:surfaces",
    data: { surfaces: { [name]: { open: true, visible: true, focused: false, layer, data, z: 1, ...extra } }, states: {} },
  });
  const player = {
    loaded: true, id: "ABC123", name: "Niko Bellic", health: 86, armor: 40, hunger: 72, thirst: 58, stress: 12, cash: 1520, bank: 48210,
    job: { name: "police", label: "LSPD", grade: 2, gradeLabel: "Sergeant", onDuty: true }, dead: false, voice: { range: 3, talking: false, radio: 101 },
  };
  const death = (t) => ({ phase: "dead", medical: "qbx", seconds: Math.max(0, 300 - Math.floor(t)), total: 300, respawn: { key: "E", available: true, progress: (t % 3) / 3 }, ems: { key: "G", state: "available" } });

  window.__init = () => {
    for (const [r, kind] of Object.entries(spec.kinds)) {
      if (kind === "hud") {
        post(r, surfaces("hud", "hud", { units: "mph", needs: true }));
        post(r, { action: "nuikit:player", data: player });
      } else if (kind === "taxi") {
        post(r, { action: "openMeter", toggle: true, meterData: { defaultPrice: 125, startingPrice: 0, useGpsPrice: false } });
        post(r, { action: "toggleMeter" });
      } else if (kind === "death") {
        post(r, surfaces("death", "system", death(0)));
      } else if (kind === "oxlib") {
        post(r, { action: "progress", data: { label: "Repairing engine", duration: 600000 } });
      }
    }
  };
  let timer = 0;
  window.__start = () => {
    const t0 = performance.now();
    timer = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      for (const [r, kind] of Object.entries(spec.kinds)) {
        if (kind === "hud") {
          const speed = 60 + 25 * Math.sin(t);
          post(r, { action: "hud:vehicle", data: { speed: Math.round(speed), units: "mph", rpm: Math.round((0.3 + 0.5 * Math.abs(Math.sin(t * 3))) * 100) / 100, gear: 1 + Math.floor(speed / 25), fuel: 64, engine: 92, seatbelt: true } });
        } else if (kind === "taxi") {
          post(r, { action: "updateMeter", meterData: { fareAmount: 6, currentFare: Math.floor(t * 7), distanceTraveled: t / 9 } });
        } else if (kind === "death") {
          post(r, surfaces("death", "system", death(t)));
        }
      }
    }, 100);
  };
  window.__stop = () => clearInterval(timer);
  const pauseData = { server: { name: "Bench RP", tagline: "benchmark" }, links: [], buttons: ["resume", "map", "settings", "keybinds", "disconnect"], help: [{ key: "ESC", label: "Close" }], playerName: "Niko", players: 48, maxPlayers: 128 };
  window.__pause = (open) => {
    const t = performance.timeOrigin + performance.now();
    post(spec.pause, {
      action: "nuikit:surfaces",
      data: { surfaces: { pause: { open, visible: open, focused: open, layer: "modal", data: pauseData, z: 3 } }, states: {} },
    });
    return t;
  };
}

const KINDS = { nuikit_hud: "hud", qbx_taxijob: "taxi", nuikit_death: "death", ox_lib: "oxlib" };

/** The browser (root) process whose command line carries `marker`. */
function findPid(marker) {
  for (const pid of fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p))) {
    try {
      const cmd = fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
      if (cmd.includes(marker) && !cmd.includes("--type=")) return Number(pid);
    } catch {
      /* gone */
    }
  }
  throw new Error("browser process not found");
}

async function launch(cfg) {
  const args = cfg.isolation ? [] : ["--disable-site-isolation-trials", "--disable-features=IsolateOrigins,site-per-process"];
  // A marker flag finds the browser process (playwright-core's Browser has no process()).
  const marker = `--nk-bench=${process.pid}-${Date.now()}`;
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: [...args, marker] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  browser.pid = findPid(marker);
  return { browser, context };
}

async function loadServer(cfg, n, page, tokens, extra = []) {
  const list = [...server(n).map((r) => ({ ...r, url: `https://cfx-nui-${r.resource}/${cfg.mode === "host" ? "module.js" : r.page}` })), ...extra];
  const t0 = Date.now();
  if (cfg.mode === "iframes") {
    await Promise.all(list.map((r) => page.evaluate(([name, url]) => window.addFrame(name, url), [r.resource, r.url])));
  } else {
    const hostUrl = `https://cfx-nui-nuikit/web/dist/index.html?shadow=open&debug=1&isolation=${cfg.css}`;
    await page.evaluate(([name, url]) => window.addFrame(name, url), ["nuikit", hostUrl]);
    for (const r of list) {
      const token = Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      tokens.set(token, r.resource);
      await page.evaluate(([res, url, tok]) => window.send("nuikit", { action: "nuikit:host:load", data: { resource: res, url, token: tok } }), [r.resource, r.url, token]);
    }
    const host = () => page.frames().find((f) => f.url().startsWith("https://cfx-nui-nuikit/"));
    await until(() => host().evaluate((count) => {
      const m = window.__nuikitHost?.modules() ?? [];
      return m.length === count && m.every((x) => x.status !== "loading");
    }, list.length));
    const failed = await host().evaluate(() => window.__nuikitHost.modules().filter((m) => m.status !== "mounted").map((m) => `${m.resource}: ${m.error}`));
    if (failed.length) console.warn("  modules failed:", failed);
    if (cfg.boot) {
      await Promise.all(server(n).map((r) => page.evaluate(([name, url]) => window.addFrame(name, url), [r.resource, `https://cfx-nui-${r.resource}/index.html`])));
    }
  }
  return Date.now() - t0;
}

async function runOnce(name, n) {
  const cfg = CONFIGS[name];
  const { browser, context } = await launch(cfg);
  const tokens = new Map();
  const state = { luaModel: "none" };
  const errors = [];
  await installNui(context, { files: filesFor(cfg), onCallback: makeLua(cfg, tokens, state) });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(ROOT_URL);

  const loadMs = await loadServer(cfg, n, page, tokens);
  await sleep(1500);
  const resources = server(n);
  const kinds = Object.fromEntries(resources.filter((r) => KINDS[r.resource]).map((r) => [r.resource, KINDS[r.resource]]));
  const pause = resources.find((r) => r.resource === "nuikit_pause")?.resource ?? null;
  await page.evaluate(driver, { mode: cfg.mode, kinds, pause });
  await page.evaluate(() => window.__init());
  await sleep(1000);
  await page.evaluate(() => window.__start());
  await sleep(2000);

  await browser.startTracing(page, { categories: ["toplevel", "devtools.timeline", "disabled-by-default-devtools.timeline", "v8.execute"] });
  await sleep(STEADY_S * 1000);
  const trace = parseTrace(await browser.stopTracing(), STEADY_S);

  const memory = processMemory(browser.pid);
  const heap = await jsHeap(context, page);
  const dom = await domNodes(page);
  await page.evaluate(() => window.__stop());

  // Open the pause menu: message → first frame with it in the DOM.
  const opens = [];
  if (pause) {
    const target = cfg.mode === "iframes" ? page.frames().find((f) => f.url().startsWith(`https://cfx-nui-${pause}/`)) : page.frames().find((f) => f.url().startsWith("https://cfx-nui-nuikit/"));
    for (let i = 0; i < 5; i++) {
      const painted = target.evaluate(([mode, res]) => new Promise((resolve) => {
        const root = mode === "iframes" ? document : (document.querySelector(`nk-module[data-resource="${res}"]`)?.shadowRoot ?? document);
        const done = () => requestAnimationFrame(() => resolve(performance.timeOrigin + performance.now()));
        if (root.querySelector('[data-surface="pause"]')) return done();
        const mo = new MutationObserver(() => {
          if (root.querySelector('[data-surface="pause"]')) {
            mo.disconnect();
            done();
          }
        });
        mo.observe(root, { childList: true, subtree: true });
      }), [cfg.mode, pause]);
      await sleep(30);
      const sent = await page.evaluate(() => window.__pause(true));
      opens.push((await painted) - sent);
      await page.evaluate(() => window.__pause(false));
      await sleep(400);
    }
  }
  await browser.close();
  return { config: name, n, loadMs, ...memory, ...heap, dom, trace, openMs: median(opens), errors: errors.length };
}

// ── callback latency: fetchNui from a UI to its resource's Lua, direct vs through the host
async function latency(name, model) {
  const cfg = CONFIGS[name];
  const { browser, context } = await launch(cfg);
  const tokens = new Map();
  const state = { luaModel: model };
  await installNui(context, { files: filesFor(cfg), onCallback: makeLua(cfg, tokens, state) });
  const page = await context.newPage();
  await page.goto(ROOT_URL);
  await loadServer(cfg, 0, page, tokens, [{ resource: "probe", page: "index.html", url: `https://cfx-nui-probe/${cfg.mode === "host" ? "module.js" : "index.html"}` }]);
  const frame = page.frames().find((f) => f.url().startsWith(cfg.mode === "host" ? "https://cfx-nui-nuikit/" : "https://cfx-nui-probe/"));
  await until(() => frame.evaluate(() => typeof window.__probe === "function"));
  await frame.evaluate(() => window.__probe(30)); // warm up
  const times = await frame.evaluate(() => window.__probe(300));
  await browser.close();
  return { config: name, model, median: median(times), p95: percentile(times, 95) };
}

// ── main
if (!fs.existsSync(path.join(OUT, "modules/nuikit_hud/module.js"))) throw new Error("run node bench/host/build.mjs first");
prepareHosted();
const file = path.join(REPO, "bench/host/results.json");
const results = process.argv.includes("--no-load") && fs.existsSync(file)
  ? { ...JSON.parse(fs.readFileSync(file, "utf8")), latency: [] }
  : { date: new Date().toISOString(), chromium: null, cpus: (await import("node:os")).cpus().length, runs: [], latency: [] };
{
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  results.chromium = b.version();
  await b.close();
}

if (!process.argv.includes("--no-load")) {
  for (let run = 0; run < RUNS; run++) {
    for (const n of NS) {
      for (const name of CHOSEN) {
        const t = Date.now();
        try {
          const r = await runOnce(name, n);
          results.runs.push({ run, ...r });
          console.log(
            `[${run}] ${name.padEnd(13)} N=${String(n).padEnd(2)} pss ${r.pssMB.toFixed(0)}MB (${r.renderers} renderers) heap ${r.heapMB.toFixed(1)}MB dom ${r.dom} main ${r.trace.task.toFixed(1)}ms/s script ${r.trace.script.toFixed(1)} style ${r.trace.style.toFixed(1)} paint ${r.trace.paint.toFixed(1)} gpu ${r.trace.gpu.toFixed(1)} load ${r.loadMs}ms open ${r.openMs?.toFixed(1) ?? "-"}ms (${((Date.now() - t) / 1000).toFixed(0)}s)`,
          );
        } catch (e) {
          console.error(`[${run}] ${name} N=${n} failed:`, e.message);
        }
        fs.writeFileSync(file, JSON.stringify(results, null, 2));
      }
    }
  }
}

if (process.argv.includes("--latency")) {
  for (let run = 0; run < RUNS; run++) {
    for (const model of ["none", "tick60"]) {
      for (const name of ["iframes", "host"]) {
        const r = await latency(name, model);
        results.latency.push({ run, ...r });
        console.log(`[${run}] latency ${name.padEnd(8)} lua=${model.padEnd(6)} median ${r.median.toFixed(2)}ms p95 ${r.p95.toFixed(2)}ms`);
        fs.writeFileSync(file, JSON.stringify(results, null, 2));
      }
    }
  }
}
console.log(`→ ${path.relative(REPO, file)}`);
