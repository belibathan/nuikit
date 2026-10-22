// ox_doorlock: { action, data } messages; the page POSTs exit / createDoor / deleteDoor / teleportToDoor /
// notify (docs/ox-doorlock-protocol.md). The main flow: open the list, copy a door's settings, delete a
// door, edit one, open one directly (/doorlock closest), place a new door, paste copied settings into a
// new door, teleport, close (button and Escape).
export const resource = "ox_doorlock";
export const entry = "index.html";
export const scene = "street.jpg";

const v = (x, y, z) => ({ x, y, z });
const doors = {
  1: { id: 1, name: "MRPD front doors", zone: "Mission Row", state: 1, coords: v(434.7, -981.9, 30.8), maxDistance: 2, groups: { police: 0 }, doors: [{ coords: v(434.7, -980.6, 30.8), heading: 270, model: -1215222675, hash: 1 }, { coords: v(434.7, -983.2, 30.8), heading: 270, model: 320433149, hash: 2 }], distance: 14.2 },
  2: { id: 2, name: "MRPD armoury", zone: "Mission Row", state: 1, coords: v(453.1, -982.6, 30.7), model: 749848321, heading: 90, hash: 3, maxDistance: 1.5, groups: { police: 2 }, items: [{ name: "mrpd_key", metadata: "armoury", remove: false }] },
  3: {
    id: 3, name: "Vault gate", zone: "Pillbox Hill", state: 1, coords: v(255.2, 223.9, 106.4), model: 961976194, heading: 160, hash: 4,
    passcode: "4471", autolock: 300, maxDistance: 2.5, doorRate: 1.5, auto: true, lockpick: true, hideUi: true, holdOpen: true,
    lockSound: "metal-locker", unlockSound: "button-remote", characters: ["ABC12345", 42], groups: { police: 3, ambulance: 1 },
    items: [{ name: "vault_card", metadata: "pacific", remove: true }, { name: "thermite" }],
    lockpickDifficulty: ["easy", "medium", { areaSize: 40, speedMultiplier: 1.5 }], distance: 6.1,
  },
  5: { id: 5, name: "Sandy Shores clinic", zone: "Sandy Shores", state: 0, coords: v(1839.4, 3672.9, 34.3), model: 1415151278, heading: 30, hash: 5, maxDistance: 2, groups: { ambulance: 0 } },
};

export async function run({ send, shot, sleep, at, page }) {
  const row = (name) => page.locator("[data-slot=menu-row]", { hasText: name });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const open = async (step, id) => {
    await send(step, id === undefined ? { action: "setVisible" } : { action: "setVisible", data: id });
    await sleep(600);
  };

  // first open: every door, the sounds, then the list
  await send("doors", { action: "updateDoorData", data: doors });
  await sleep(100);
  await send("sounds", { action: "setSoundFiles", data: ["button-remote", "door-bolt-4", "metal-locker", "metallic-creak"] });
  await open("open");
  await shot("list");

  at("copy");
  await row("Vault gate").getByRole("button", { name: "Copy settings" }).click();
  await sleep(200);

  at("delete-row");
  await row("Sandy Shores clinic").getByRole("button", { name: "Delete door" }).click();
  await sleep(300);
  await shot("confirm");
  at("delete-escape"); // Escape closes the confirm only
  await page.keyboard.press("Escape");
  await sleep(300);
  at("delete-row-2");
  await row("Sandy Shores clinic").getByRole("button", { name: "Delete door" }).click();
  await sleep(300);
  await button("Delete").click();
  await sleep(200);
  await send("deleted", { action: "updateDoorData", data: 5 });
  await sleep(300);

  // edit: unlock by default, save
  at("edit");
  await row("Vault gate").click();
  await sleep(500);
  await shot("edit");
  await page.getByRole("menuitemcheckbox", { name: /^Locked/ }).click();
  at("save");
  await button("Save door").click();
  await sleep(400);
  await send("edited", { action: "updateDoorData", data: { ...doors[3], state: 0 } });

  // /doorlock closest: straight into a door's settings; Escape closes the editor
  await open("closest", 3);
  at("closest-escape");
  await page.keyboard.press("Escape");
  await sleep(400);

  // a new double door
  await open("open-new");
  at("new");
  await button("New door").click();
  await sleep(400);
  await shot("new");
  await page.getByLabel("Name").fill("Bank side door");
  await page.getByRole("menuitemcheckbox", { name: /^Double door/ }).click();
  at("place");
  await button("Place door").click();
  await sleep(400);

  // a new door with the copied settings
  await open("open-paste");
  at("paste");
  await button("New door").click();
  await sleep(400);
  await button("Paste settings").click();
  await sleep(200);
  at("place-pasted");
  await button("Place door").click();
  await sleep(400);

  // teleport, then close with the button
  await open("open-teleport");
  at("teleport");
  await row("MRPD armoury").getByRole("button", { name: "Teleport to door" }).click();
  await sleep(400);
  await open("open-close");
  at("close");
  await page.getByRole("button", { name: /^Close/ }).click();
  await sleep(400);

  // a door sound with the editor closed: no POST
  await send("sound", { action: "playSound", data: { sound: "door-bolt-4", volume: 0.4 } });
  await sleep(200);
  await shot("closed");
}
