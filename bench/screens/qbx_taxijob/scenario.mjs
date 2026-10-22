// qbx_taxijob: flat messages ({ action, ...fields }); the page owns running/stopped and POSTs
// enableMeter on every flip, hideMouse when it gives the cursor back (docs/qbx-taxijob-protocol.md).
export const resource = "qbx_taxijob";
export const entry = "meter.html";
export const scene = "street.jpg";

const meter = { defaultPrice: 125.0, startingPrice: 15, useGpsPrice: true };
const update = (currentFare, distanceTraveled) => ({ action: "updateMeter", meterData: { fareAmount: 6, currentFare, distanceTraveled } });

export async function run({ send, shot, sleep, at, page }) {
  // NPC pickup: open, start, live values
  await send("open", { action: "openMeter", toggle: true, meterData: meter });
  await sleep(500);
  await send("start", { action: "toggleMeter" });
  await sleep(200);
  await send("update-1", update(37, 0.29));
  await send("update-2", update(301, 2.41));
  await sleep(600);
  await shot("running");

  // the cursor (toggleMuis): stop and start by clicking, then give it back with Escape
  at("cursor");
  await page.mouse.move(200, 200);
  await sleep(300);
  await page.getByRole("button", { name: "Stop meter" }).click();
  await sleep(200);
  await page.getByRole("button", { name: "Start meter" }).click();
  await sleep(200);
  at("escape");
  await page.keyboard.press("Escape");
  await sleep(300);

  // drop-off: stop, reset; hide and show again keeps the stopped state
  await send("stop", { action: "toggleMeter" });
  await sleep(200);
  await send("reset", { action: "resetMeter" });
  await send("hide", { action: "openMeter", toggle: false });
  await sleep(400);
  await send("toggle-hidden", { action: "toggleMeter" });
  await sleep(200);
  await send("reopen", { action: "openMeter", toggle: true, meterData: { defaultPrice: 42.5, startingPrice: 0, useGpsPrice: false } });
  await sleep(500);
  await shot("reopened");
  await send("close", { action: "openMeter", toggle: false });
  await sleep(400);
  await shot("closed");
}
