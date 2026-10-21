// Request check for component changes: drives the built ox_lib override and nuikit_death through the
// features that use registry components, at 1280×720, 1920×1080 and 2560×1440, and logs every POST
// (name, body, ms after the step that caused it). Run it before and after a change and diff the logs.
//
//   node bench/components/posts.mjs --out=before.json [--build=0]
//
// ox_lib: the built page (web/build) with GetParentResourceName stubbed, as in game. Protocol:
// docs/ox-lib-protocol.md. nuikit_death: its dev fixture; the page posts nothing (Lua drives it), so
// the check is that it stays that way. Screenshots of each step land next to the log.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/npm-tools/node_modules/playwright");
const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const OUT = path.resolve(arg("out", path.join(here, ".out/posts.json")));
const SHOTS = OUT.replace(/\.json$/, "");
const RES = arg("res", "1280x720,1920x1080,2560x1440").split(",").map((r) => r.split("x").map(Number));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit" });
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} → ${c}`))));
  });
}

const oxWeb = path.join(repo, "addons/ox_lib/web");
if (arg("build", "1") !== "0") await run(process.execPath, [path.join(oxWeb, "node_modules/vite/bin/vite.js"), "build", "--logLevel", "warn"], oxWeb);

// a static server for web/build (the page uses relative paths)
const root = path.join(oxWeb, "build");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/$/, "/index.html"));
  if (!file.startsWith(root) || !fs.existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const oxUrl = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const result = {};

async function oxPage(w, h, log) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.GetParentResourceName = () => "ox_lib";
  });
  let mark = Date.now();
  let step = "load";
  await page.route(/^https:\/\/ox_lib\//, async (route) => {
    const req = route.request();
    const name = new URL(req.url()).pathname.slice(1);
    log.push({ step, name, body: req.postData() ?? null, ms: Date.now() - mark });
    const reply = name === "getConfig" ? { primaryColor: "blue", primaryShade: 8 } : 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(reply) });
  });
  await page.goto(oxUrl, { waitUntil: "networkidle" });
  const send = async (name, action, data) => {
    step = name;
    mark = Date.now();
    await page.evaluate((m) => window.postMessage(m, "*"), { action, data });
  };
  const at = (name) => {
    step = name;
    mark = Date.now();
  };
  return { ctx, page, send, at };
}

const ROWS = [
  { type: "input", label: "Name", default: "Niko" },
  { type: "number", label: "Amount", default: 12.345, precision: 2, min: 0, max: 100 },
  { type: "checkbox", label: "Agree", checked: true },
  { type: "select", label: "Car", options: [{ value: "rs", label: "Sultan RS" }, { value: "elegy" }], default: "rs" },
  { type: "slider", label: "Volume", min: 0, max: 10, default: 4 },
  { type: "date", label: "Birth date", format: "YYYY-MM-DD", min: "1900-01-01", max: "2006-12-31", default: "1990-01-15" },
  { type: "date-range", label: "Lease", default: ["2026-03-01", "2026-03-05"] },
  { type: "time", label: "Meet", format: "24", default: "2026-01-01T21:30:00" },
  { type: "color", label: "Paint", default: "#e11d48" },
];

try {
  for (const [w, h] of RES) {
    const key = `${w}x${h}`;
    const log = [];
    const { ctx, page, send, at } = await oxPage(w, h, log);
    const shot = (n) => page.screenshot({ path: path.join(SHOTS, `oxlib-${key}-${n}.png`) });
    await send("locale", "setLocale", { language: "English", ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } });

    await send("notify", "notify", { title: "Vehicle stored", description: "In the **Legion** garage", type: "success", duration: 60000 });
    await send("notify-2", "notify", { title: "Speed camera", type: "warning", duration: 60000, position: "top-left" });
    await send("textUi", "textUi", { text: "[E] - Open garage", icon: "warehouse" });
    await send("textUi-nokey", "textUi", { text: "Searching the glovebox for anything useful to take", position: "left-center" });
    await sleep(400);
    await shot("feedback");
    await send("textUiHide", "textUiHide");

    await send("progress", "progress", { label: "Repairing engine", duration: 800 });
    await sleep(300);
    await shot("progress");
    await sleep(1000);
    await send("progress-cancel", "progress", { label: "Cancelled", duration: 5000 });
    await sleep(200);
    await send("progressCancel", "progressCancel");
    await sleep(500);
    await send("circleProgress", "circleProgress", { duration: 800, label: "Lockpicking" });
    await sleep(1300);

    await send("openDialog-defaults", "openDialog", { heading: "Every row", rows: ROWS });
    await sleep(500);
    await shot("dialog");
    at("submit-enter");
    await page.locator("input").first().press("Enter");
    await sleep(600);
    await send("openDialog-escape", "openDialog", { heading: "Escape", rows: ["Plate"] });
    await sleep(400);
    at("escape");
    await page.keyboard.press("Escape");
    await sleep(600);

    await send("showContext", "showContext", {
      title: "Garage",
      options: [
        { title: "Sultan RS", description: "Stored", progress: 71, colorScheme: "green", metadata: { Fuel: "71%" } },
        { title: "Elegy", description: "No colour bar", progress: 40 },
        { title: "Bati", disabled: true },
      ],
    });
    await sleep(400);
    await shot("context");
    at("click-context");
    await page.getByText("Sultan RS", { exact: true }).click();
    await sleep(400);

    await send("setMenu", "setMenu", { title: "Wardrobe", items: [{ label: "Hat", values: ["Cap", "Beanie"] }, { label: "Glasses", checked: false }, { label: "Armor", progress: 60 }] });
    await sleep(400);
    await shot("menu");
    at("menu-keys");
    await page.keyboard.press("ArrowRight");
    await sleep(100);
    await page.keyboard.press("ArrowDown");
    await sleep(100);
    await page.keyboard.press("Enter");
    await sleep(100);
    await page.keyboard.press("Escape");
    await sleep(400);

    await send("sendAlert", "sendAlert", { header: "Sell the car?", content: "You get **$12,000**.", cancel: true });
    await sleep(400);
    await shot("alert");
    at("alert-confirm");
    await page.getByRole("button", { name: /confirm/i }).click();
    await sleep(400);

    result[`oxlib ${key}`] = log;
    await ctx.close();
    console.log(`✓ ox_lib ${key}: ${log.length} posts`);
  }

  // nuikit_death: dev fixtures; any request to https://<resource>/ is logged
  const deathWeb = path.join(repo, "systems/nuikit_death/web");
  const dev = spawn(process.execPath, [path.join(deathWeb, "node_modules/vite/bin/vite.js"), "--port", "5897", "--strictPort", "--host", "127.0.0.1"], { cwd: deathWeb, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  dev.stdout.on("data", (d) => (out += d));
  await new Promise((r) => {
    const i = setInterval(() => /Local:|ready in/.test(out) && (clearInterval(i), r()), 100);
  });
  try {
    for (const fixture of ["qbx-dead", "qbx-laststand-help"]) {
      for (const [w, h] of RES) {
        const key = `${w}x${h}`;
        const log = [];
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const page = await ctx.newPage();
        await page.addInitScript(() => localStorage.setItem("nuikit:scene", "none"));
        await page.route(/^https:\/\/[a-z_]+\//, async (route) => {
          log.push({ step: fixture, name: route.request().url(), body: route.request().postData() ?? null });
          await route.fulfill({ status: 200, contentType: "application/json", body: "1" });
        });
        await page.goto(`http://127.0.0.1:5897/?fixture=${fixture}`, { waitUntil: "networkidle" });
        await sleep(1500);
        await page.addStyleTag({ content: "[data-nuikit-devtools]{display:none!important}" });
        await page.screenshot({ path: path.join(SHOTS, `death-${fixture}-${key}.png`) });
        result[`death ${fixture} ${key}`] = log;
        await ctx.close();
        console.log(`✓ death ${fixture} ${key}: ${log.length} posts`);
      }
    }
  } finally {
    dev.kill("SIGINT");
  }
} finally {
  await browser.close();
  server.close();
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(`→ ${OUT}`);
