// ox_lib override: the main flow of every routed feature (notify, context menu, list menu, input dialog,
// alert, progress bar + circle, skill check, text UI), logging every POST back to ox_lib.
//
//   node bench/screens/run.mjs --name=ox_lib --out=before --shots=0            # the page draws locally
//   OX_ROUTED=1 node bench/screens/run.mjs --name=ox_lib --out=after --shots=0 # routed through a fake nuikit door
//   node bench/screens/diff.mjs ox_lib
//
// Local: the door (https://nuikit/intent) is a 404, so the page falls back and the scenario drives its own
// UI with keys and clicks. Routed: a fake runtime answers the door the way systems/nuikit/client/intents.lua
// does (probe, held yielding opens, the `listen` long-poll, cancel/replaced), and the scenario plays the
// frame's renderers (resolve, cancel with a reason, events). The two POST logs must be identical.
export const resource = "ox_lib";
export const entry = "index.html";
export const scene = "stage-day.jpg";

const ROUTED = process.env.OX_ROUTED === "1";
const YIELDS = new Set(["menu", "input", "confirm", "progress", "challenge"]);

/** A fake `nuikit` runtime behind https://nuikit/intent (docs/intents.md §4, docs/adapters/ox-lib.md §2). */
function fakeDoor(page) {
  const open = new Map(); // id → { kind, props, route? }
  const listeners = new Map(); // id → route (held `listen`)
  const queues = new Map(); // id → events
  const json = (route, body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  const idOf = (key) => `page:ox_lib#${key}`;
  const end = (id, answer) => {
    const it = open.get(id);
    if (!it) return false;
    open.delete(id);
    if (it.route) void json(it.route, { id, ...answer });
    const l = listeners.get(id);
    if (l) {
      listeners.delete(id);
      void json(l, { id, ended: true });
    }
    queues.delete(id);
    return true;
  };
  const stats = { probes: 0, opens: [] };
  page.route(/^https:\/\/nuikit\/intent$/, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    if (body.probe) {
      stats.probes++;
      return json(route, { ok: true, route: true });
    }
    if (typeof body.listen === "string") {
      const id = body.listen;
      if (!open.has(id)) return json(route, { id, ended: true });
      const q = queues.get(id);
      if (q?.length) {
        queues.set(id, []);
        return json(route, { id, events: q });
      }
      listeners.set(id, route);
      return;
    }
    if (typeof body.cancel === "string") {
      const ok = end(body.cancel, { reason: body.cancel ? (body.reason ?? "cancel") : "cancel" });
      return json(route, { ok });
    }
    if (typeof body.update === "string") return json(route, { ok: open.has(body.update) });
    const id = idOf(body.id);
    if (open.has(id)) end(id, { reason: "replaced" });
    stats.opens.push({ kind: body.intent, props: body.props });
    if (!YIELDS.has(body.intent)) {
      open.set(id, { kind: body.intent, props: body.props });
      return json(route, { id });
    }
    open.set(id, { kind: body.intent, props: body.props, route });
  });
  return {
    stats,
    open: (key) => open.get(idOf(key)),
    /** The renderer resolved the intent. */
    resolve: (key, result) => end(idOf(key), { result }),
    /** The renderer cancelled it (escape, close, back, submenu) or nuikit stopped. */
    cancel: (key, reason, data) => end(idOf(key), { reason, data }),
    /** The renderer emitted an event. */
    emit: (key, event, data) => {
      const id = idOf(key);
      const l = listeners.get(id);
      if (l) {
        listeners.delete(id);
        void json(l, { id, events: [{ event, data }] });
      } else queues.set(id, [...(queues.get(id) ?? []), { event, data }]);
    },
  };
}

export async function run({ page, send, at, sleep, shot }) {
  const msg = (action, data) => ({ action, data });
  const frame = ROUTED ? fakeDoor(page) : null;
  if (ROUTED) {
    // the page probed at load (a 404 then); its retry comes 2 s later
    await sleep(2600);
    if (!frame.stats.probes) throw new Error("the page never probed the door");
  }
  // ox_lib answers init with the locale
  await send("locale", msg("setLocale", { ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } }));
  await sleep(100);

  // ── notify: nothing comes back
  await send("notify", msg("notify", { title: "Vehicle stored", description: "In the garage", type: "success", position: "top-right" }));
  await sleep(200);
  await shot("notify");

  // ── context menu: click an option (stays open until Lua hides it), a submenu, back, Escape
  const context = {
    title: "Garage",
    options: [
      { title: "Sultan RS", description: "Plate 46EEK572", icon: "car", progress: 71, metadata: { Fuel: "71%" } },
      { title: "Pegasus", icon: "truck", menu: "depot" },
      { title: "Info", readOnly: true },
    ],
  };
  await send("showContext", msg("showContext", context));
  await sleep(300);
  await shot("context");
  at("context-click");
  if (ROUTED) frame.emit("context", "select", { index: 1, id: "0", path: [1] });
  else await page.getByRole("button", { name: /Sultan RS/ }).click();
  await sleep(150);
  await send("hideContext", msg("hideContext"));
  await sleep(250);
  await send("showContext-2", msg("showContext", context));
  await sleep(300);
  at("context-submenu");
  if (ROUTED) frame.cancel("context", "submenu", { menu: "depot", index: 2, id: "1" });
  else await page.getByRole("button", { name: /Pegasus/ }).click();
  await sleep(150);
  await send("showContext-depot", msg("showContext", { title: "Depot", menu: "garage", options: { Banshee: { description: "$1,250" }, Faggio: { description: "Free" } } }));
  await sleep(300);
  at("context-back");
  if (ROUTED) frame.cancel("context", "back", { menu: "garage" });
  else await page.getByRole("button", { name: "Back" }).click();
  await sleep(150);
  await send("showContext-3", msg("showContext", context));
  await sleep(300);
  at("context-escape");
  if (ROUTED) frame.cancel("context", "escape");
  else await page.keyboard.press("Escape");
  await sleep(200);

  // ── list menu: open (changeSelected), down, Enter (confirmSelected), then Escape on a second menu
  const list = { title: "Vehicle", position: "top-left", items: [{ label: "Engine", icon: "power-off", checked: true }, { label: "Lock", icon: "lock" }, { label: "Doors", values: ["Front", "Rear"] }] };
  await send("setMenu", msg("setMenu", list));
  if (ROUTED) frame.emit("menu", "change", { index: 1, id: "1", checked: true, path: [1] });
  await sleep(300);
  await shot("list");
  at("list-down");
  if (ROUTED) frame.emit("menu", "change", { index: 2, id: "2", path: [2] });
  else await page.keyboard.press("ArrowDown");
  await sleep(300);
  at("list-enter");
  if (ROUTED) frame.resolve("menu", { index: 2, id: "2", path: [2] });
  else await page.keyboard.press("Enter");
  await sleep(200);
  await send("setMenu-2", msg("setMenu", list));
  if (ROUTED) frame.emit("menu", "change", { index: 1, id: "1", checked: true, path: [1] });
  await sleep(300);
  at("list-right");
  // down twice to the stepper row, then right: changeSelected ×2 then changeIndex
  if (ROUTED) {
    frame.emit("menu", "change", { index: 2, id: "2", path: [2] });
    await sleep(200);
    frame.emit("menu", "change", { index: 3, id: "3", value: 1, path: [3] });
    await sleep(200);
    frame.emit("menu", "scroll", { index: 3, id: "3", value: 2, path: [3] });
  } else {
    await page.keyboard.press("ArrowDown");
    await sleep(200);
    await page.keyboard.press("ArrowDown");
    await sleep(200);
    await page.keyboard.press("ArrowRight");
  }
  await sleep(300);
  at("list-escape");
  if (ROUTED) frame.cancel("menu", "escape");
  else await page.keyboard.press("Escape");
  await sleep(200);

  // ── input dialog: submit (values in row order), then cancel with Escape
  const dialog = {
    heading: "Register",
    rows: [
      { type: "input", label: "Name", default: "Niko" },
      { type: "number", label: "Amount", default: 5 },
      { type: "checkbox", label: "Insured", checked: true },
      { type: "select", label: "Class", options: [{ value: "sports", label: "Sports" }], default: "sports" },
      { type: "color", label: "Paint", default: "#ff0000", format: "rgb" },
    ],
    options: { size: "sm" },
  };
  await send("openDialog", msg("openDialog", dialog));
  await sleep(300);
  await shot("input");
  at("input-submit");
  if (ROUTED) frame.resolve("input", { values: ["Niko", 5, true, "sports", "#ff0000"], byId: { 1: "Niko", 2: 5, 3: true, 4: "sports", 5: "#ff0000" } });
  else await page.getByRole("button", { name: "Confirm" }).click();
  await sleep(400);
  await send("openDialog-2", msg("openDialog", dialog));
  await sleep(300);
  at("input-escape");
  if (ROUTED) frame.cancel("input", "escape");
  else await page.keyboard.press("Escape");
  await sleep(400);

  // ── alert: confirm, then Escape (always cancel)
  await send("sendAlert", msg("sendAlert", { header: "Sell?", content: "You get **$1,000**", cancel: true }));
  await sleep(300);
  await shot("alert");
  at("alert-confirm");
  if (ROUTED) frame.resolve("alert", "confirm");
  else await page.getByRole("button", { name: "Confirm" }).click();
  await sleep(200);
  await send("sendAlert-2", msg("sendAlert", { header: "Notice", content: "Restart soon" }));
  await sleep(300);
  at("alert-escape");
  if (ROUTED) frame.resolve("alert", "cancel");
  else await page.keyboard.press("Escape");
  await sleep(200);

  // ── progress bar: runs out (progressComplete after duration + exit), then a circle cancelled by Lua
  await send("progress", msg("progress", { label: "Repairing", duration: 500 }));
  await sleep(150);
  await shot("progress");
  if (ROUTED) {
    await sleep(350);
    frame.resolve("progress", true);
  }
  await sleep(500);
  await send("circleProgress", msg("circleProgress", { label: "Searching", duration: 5000 }));
  await sleep(300);
  await shot("circle");
  await send("progressCancel", msg("progressCancel"));
  await sleep(400);

  // ── skill check: cancelled by Lua (the UI must post false)
  await send("startSkillCheck", msg("startSkillCheck", { difficulty: "easy", inputs: ["e"] }));
  await sleep(300);
  await shot("skill");
  await send("skillCheckCancel", msg("skillCheckCancel"));
  await sleep(200);

  // ── text UI: show, replace, hide: nothing comes back
  await send("textUi", msg("textUi", { text: "[E] - Open garage", icon: "warehouse" }));
  await sleep(200);
  await shot("textui");
  await send("textUi-2", msg("textUi", { text: "Press [G] to unlock", position: "top-center" }));
  await sleep(200);
  await send("textUiHide", msg("textUiHide"));
  await sleep(200);

  // ── nuikit stops under an open context menu: the page tells ox_lib the menu closed (focus released)
  await send("showContext-stop", msg("showContext", context));
  await sleep(300);
  at("nuikit-stop");
  if (ROUTED) frame.cancel("context", "stopped");
  else await page.keyboard.press("Escape"); // the local equivalent: the menu goes away
  await sleep(200);
}
