// ox_inventory: { action, data } messages (docs/ox-inventory-protocol.md). Main flow: init, open with a
// drop beside it, drag a stack into the drop (swapItems), an item note, the hotbar, Escape (exit).
// Requests to the nuikit resource (theme, images) are counted apart: not ox_inventory's protocol.
export const resource = "ox_inventory";
export const scene = "street.jpg";

const items = {
  water: { name: "water", label: "Water", weight: 500, stack: true, close: true, usable: true },
  bread: { name: "bread", label: "Bread", weight: 200, stack: true, close: true, usable: true },
  money: { name: "money", label: "Money", weight: 0, stack: true, close: false },
};
const player = (list) => ({ id: 1, slots: 50, maxWeight: 30000, items: list });
const mine = [
  { slot: 1, name: "water", count: 4, weight: 2000 },
  { slot: 2, name: "bread", count: 2, weight: 400 },
  { slot: 3, name: "money", count: 1500, weight: 0 },
];

export async function run({ page, send, at, shot, sleep, reply }) {
  reply("swapItems", () => true);
  await sleep(300);
  await send("init", { action: "init", data: { locale: { ui_use: "Use", ui_give: "Give", ui_close: "Close", ui_drop: "Drop", ui_added: "Added", $: "$" }, items, leftInventory: player(mine), imagepath: "nui://ox_inventory/web/images" } });
  await sleep(200);
  await send("setupInventory", {
    action: "setupInventory",
    data: { leftInventory: { ...player(mine), type: "player", label: "Player" }, rightInventory: { id: "drop", type: "newdrop", slots: 50, maxWeight: 30000, items: [] } },
  });
  await sleep(700);
  await shot("open");

  // drag slot 1 into the drop's slot 1
  at("drag");
  const from = await page.locator('[data-drop="slot:left:1"]').boundingBox();
  const to = await page.locator('[data-drop="slot:right:1"]').boundingBox();
  if (!from || !to) throw new Error("slots not found");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await sleep(400);

  await send("itemNotify", { action: "itemNotify", data: [{ name: "bread", count: 1, slot: 2 }, "ui_added", 1] });
  await sleep(300);
  await shot("note");
  await send("toggleHotbar", { action: "toggleHotbar" });
  await sleep(400);

  at("escape");
  await page.keyboard.press("Escape");
  await sleep(500);
  await send("closeInventory", { action: "closeInventory" });
  await sleep(3200); // the note and the hotbar leave
  await shot("closed");
}
