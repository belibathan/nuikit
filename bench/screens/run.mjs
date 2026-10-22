// Protocol check for an override rebuild: drives the override's BUILT page (web/build, GetParentResourceName
// stubbed as in game) through its scenario at 1280×720, 1920×1080 and 2560×1440, logs every POST to the
// resource (name, body, ms after the step that caused it) and screenshots every state over a game scene.
// Run it before and after a change, then `node bench/screens/diff.mjs <name>`: the diff must be empty
// apart from timestamps.
//
//   node bench/screens/run.mjs --name=qbx_scoreboard --out=before [--build=0] [--shots=0] [--res=1920x1080]
//
// Scenario: bench/screens/<name>/scenario.mjs exports { resource, entry, scene, run(api) }. The api:
//   send(step, message)        postMessage from "Lua" (the scenario shapes it: flat, {type}, {action,data})
//   at(step)                   start a step the scenario drives itself (keys, clicks)
//   shot(name)                 screenshot bench/screens/<name>/shots/<name>-<res>.jpg (when --shots=1)
//   page, sleep, reply(name, fn) what Lua answers a POST with (default 1; mm_radio answers 'ok')
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;

const NAME = arg("name");
if (!NAME) throw new Error("--name=<override> is required");
const DIR = path.join(here, NAME);
const OUT = path.join(DIR, `${arg("out", "posts")}.json`);
const SHOTS = path.join(DIR, "shots");
const WANT_SHOTS = arg("shots", "1") !== "0";
const RES = arg("res", "1280x720,1920x1080,2560x1440").split(",").map((r) => r.split("x").map(Number));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scenario = await import(pathToFileURL(path.join(DIR, "scenario.mjs")).href);

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit" });
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} → ${c}`))));
  });
}

const web = path.join(repo, "addons", NAME, "web");
if (arg("build", "1") !== "0") await run(process.execPath, [path.join(web, "node_modules/vite/bin/vite.js"), "build", "--logLevel", "warn"], web);

// a static server for web/build (the page uses relative paths)
const root = path.join(web, "build");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/$/, "/index.html"));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/${scenario.entry ?? "index.html"}`;

const scene = scenario.scene ? `data:image/jpeg;base64,${fs.readFileSync(path.join(repo, "apps/www/public/bg", scenario.scene)).toString("base64")}` : null;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const result = {};
if (WANT_SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

try {
  for (const [w, h] of RES) {
    const key = `${w}x${h}`;
    const log = [];
    const theme = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const resource = scenario.resource;
    await page.addInitScript((r) => {
      window.GetParentResourceName = () => r;
    }, resource);
    let mark = Date.now();
    let step = "load";
    const replies = {};
    await page.route(/^https:\/\//, async (route) => {
      const req = route.request();
      const u = new URL(req.url());
      const name = u.pathname.slice(1);
      if (u.hostname === resource) {
        log.push({ step, name, body: req.postData() ?? null, ms: Date.now() - mark });
        const reply = replies[name] ? await replies[name](req.postData()) : 1;
        if (reply === undefined) return route.abort("failed"); // "no reply at all"
        const body = typeof reply === "string" ? reply : JSON.stringify(reply);
        return route.fulfill({ status: 200, contentType: "application/json", body });
      }
      // theme requests go to the nuikit resource, not the override: counted, not part of its protocol
      theme.push({ step, host: u.hostname, name });
      return route.fulfill({ status: 404, body: "" });
    });
    await page.goto(url, { waitUntil: "networkidle" });
    if (scene) await page.addStyleTag({ content: `html { background: #000 url("${scene}") center / cover no-repeat fixed !important; }` });
    const api = {
      page,
      sleep,
      key,
      width: w,
      height: h,
      reply: (name, fn) => (replies[name] = fn),
      send: async (name, message) => {
        step = name;
        mark = Date.now();
        await page.evaluate((m) => window.postMessage(m, "*"), message);
      },
      at: (name) => {
        step = name;
        mark = Date.now();
      },
      shot: async (name) => {
        if (!WANT_SHOTS) return;
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: path.join(SHOTS, `${name}-${key}.jpg`), type: "jpeg", quality: 80 });
      },
    };
    try {
      await scenario.run(api);
    } catch (e) {
      console.error(`✗ ${NAME} ${key} failed at step "${step}"`);
      throw e;
    }
    result[key] = { posts: log, themeRequests: theme.length };
    await ctx.close();
    console.log(`✓ ${NAME} ${key}: ${log.length} posts, ${theme.length} theme requests`);
  }
} finally {
  await browser.close();
  server.close();
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + "\n");
console.log(`→ ${OUT}`);
