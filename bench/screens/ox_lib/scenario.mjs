// ox_lib: { action, data } in (docs/ox-lib-protocol.md). Main flows the 0.7 premium pass touched: radial
// (click, submenu, back, close), context (open, click, submenu, close), list menu (move, change, toggle,
// confirm, close), alert (confirm, cancel) and notify (no POSTs). A missed click is logged as a step, not
// thrown, so the before/after diff shows it.
export const resource = "ox_lib";
export const entry = "index.html";
export const scene = "stage-day.jpg";

const RADIAL = {
  items: [
    { label: "Phone", icon: "mobile-screen" },
    { label: "Inventory", icon: "box-open" },
    { label: "Vehicle", icon: "car", menu: "vehicle" },
    { label: "Emotes", icon: "face-smile" },
  ],
};
const RADIAL_SUB = { sub: true, items: [{ label: "Engine", icon: "power-off" }, { label: "Lock", icon: "lock" }] };
const CONTEXT = {
  title: "Garage",
  options: [
    { title: "Sultan RS", description: "Stored", icon: "car", metadata: { Fuel: "71%" } },
    { title: "Bati 801", description: "Impounded", icon: "motorcycle", disabled: true },
    { title: "Pegasus delivery", description: "Order a vehicle", icon: "truck", menu: "depot" },
  ],
};
const MENU = {
  title: "Vehicle options",
  position: "top-left",
  items: [
    { label: "Engine", icon: "power-off", checked: true },
    { label: "Doors", icon: "door-open", values: ["Front left", "Front right", "Trunk"] },
    { label: "Lock vehicle", icon: "lock" },
  ],
};

export async function run({ page, send, at, sleep }) {
  const click = async (step, text) => {
    at(step);
    try {
      // at the text's position, not on the element: the radial hit-tests by angle on its container
      const box = await page.getByText(text, { exact: true }).first().boundingBox({ timeout: 1500 });
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } catch {
      at(`${step}-missed`);
    }
    await sleep(300);
  };
  const key = async (step, k) => {
    at(step);
    await page.keyboard.press(k);
    await sleep(200);
  };

  await send("setLocale", { action: "setLocale", data: { language: "English", ui: { cancel: "Cancel", confirm: "Confirm", more: "More..." } } });

  // notify, twice (dedupe): no POSTs
  for (const i of [1, 2]) await send(`notify-${i}`, { action: "notify", data: { title: "Vehicle stored", type: "success", position: "top-right" } });
  await sleep(300);

  // radial
  await send("radial-open", { action: "openRadialMenu", data: RADIAL });
  await sleep(500);
  await click("radial-click-phone", "Phone");
  await send("radial-open-2", { action: "openRadialMenu", data: RADIAL });
  await sleep(500);
  await click("radial-click-vehicle", "Vehicle");
  await send("radial-sub", { action: "openRadialMenu", data: RADIAL_SUB });
  await sleep(500);
  at("radial-back");
  await page.mouse.click(page.viewportSize().width / 2, page.viewportSize().height / 2, { button: "right" });
  await sleep(300);
  await key("radial-close", "Escape");
  await send("radial-hide", { action: "openRadialMenu", data: false });
  await sleep(400);

  // context
  await send("context-open", { action: "showContext", data: CONTEXT });
  await sleep(600);
  await click("context-click-disabled", "Bati 801");
  await click("context-click-sultan", "Sultan RS");
  await send("context-open-2", { action: "showContext", data: CONTEXT });
  await sleep(600);
  await click("context-click-submenu", "Pegasus delivery");
  await send("context-open-3", { action: "showContext", data: CONTEXT });
  await sleep(600);
  await key("context-escape", "Escape");
  await send("context-hide", { action: "hideContext", data: null });
  await sleep(400);

  // list menu
  await send("menu-open", { action: "setMenu", data: MENU });
  await sleep(600);
  await key("menu-toggle-engine", "Enter");
  await key("menu-down", "ArrowDown");
  await key("menu-right", "ArrowRight");
  await key("menu-left", "ArrowLeft");
  await key("menu-down-2", "ArrowDown");
  await key("menu-confirm-lock", "Enter");
  await send("menu-open-2", { action: "setMenu", data: MENU });
  await sleep(600);
  await key("menu-escape", "Escape");
  await sleep(300);

  // alert
  await send("alert-open", { action: "sendAlert", data: { header: "Hello there", content: "General Kenobi", centered: true, cancel: true } });
  await sleep(600);
  await click("alert-confirm", "Confirm");
  await send("alert-open-2", { action: "sendAlert", data: { header: "Leave?", content: "Sure?", cancel: true } });
  await sleep(600);
  await click("alert-cancel", "Cancel");
  await send("alert-open-3", { action: "sendAlert", data: { header: "Rules", content: "Read them" } });
  await sleep(600);
  await key("alert-escape", "Escape");
  await sleep(400);
}
