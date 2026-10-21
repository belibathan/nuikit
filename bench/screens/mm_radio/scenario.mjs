// mm_radio: { action, data } in, 16 callbacks out (docs/mm-radio-protocol.md). Lua answers 'ok' (a bare string,
// not JSON) to most; getMutedList / togglemutePlayer answer the muted table. The scenario plays Lua for the
// replies it needs (updateRadio after a join) so every screen is reached the way it is in game.
export const resource = "mm_radio";
export const entry = "index.html";
export const scene = "street.jpg";

const locale = {
  "ui.header": "IN RADIO",
  "ui.frequency": "Frequency",
  "ui.disconnect": "DISCONNECT",
  "ui.notconnected": "NOT CONNECTED",
  "ui.settings": "Settings",
  "ui.channels": "Channels",
  "ui.radio": "Radio",
  "ui.members": "Members",
  "ui.favorites": "Favorites",
  "ui.recommended": "Recommended",
  "ui.clear": "CLEAR",
  "ui.hide_overlay": "HIDE OVERLAY",
  "ui.show_overlay": "SHOW OVERLAY",
  "ui.save": "SAVE",
  "ui.radio_settings": "Radio Settings",
  "ui.move_radio": "Move Radio",
  "ui.allow_move": "Allow Move",
  "ui.overlay_settings": "Overlay Settings",
  "ui.enableClicks": "Radio Sound",
};
const channelName = { "1": "MRPD CH#1", "1.%": "MRPD CH#1", "2": "MRPD CH#2", "2.%": "MRPD CH#2", "420": "Ballas CH#1", "420.%": "Ballas CH#1" };
const userData = {
  favourite: [88.5],
  name: "Jordan Vale",
  overlaySizeMultiplier: 50,
  radioSizeMultiplier: 50,
  allowMovement: false,
  enableClicks: true,
  playerlist: { show: true, coords: { x: 15, y: 40 } },
  radio: { coords: { x: 40, y: 30 } },
};
const base = {
  radioId: "PERSONAL",
  onRadio: true,
  channel: 1,
  volume: 30,
  favourite: [1, 2, 88.5],
  recomended: [1, 12.5, 420],
  maxChannel: 500,
  userData,
  time: "21:07",
  street: "Vinewood Blvd",
  locale,
  channelName,
  insideJammerZone: false,
  battery: 100,
  overlay: "default",
};
const players = {
  "1": { name: "Jordan Vale", isTalking: false },
  "7": { name: "Officer Casey Reed", isTalking: true },
  "12": { name: "Sgt. Morgan Hale", isTalking: false },
  "23": { name: "Dispatch", isTalking: false },
};
const nui = (action, data) => ({ action, data });

export async function run({ page, send, at, shot, sleep, reply }) {
  let muted = {};
  reply("getMutedList", () => muted);
  reply("togglemutePlayer", (body) => {
    const id = Number(body);
    if (id === 1) return null;
    muted = { ...muted, [id]: !muted[id] };
    return muted;
  });
  reply("saveData", () => undefined); // may never reply
  for (const n of ["hideUI", "join", "leave", "volumeChange", "toggleMute", "addFav", "removeFav", "showPlayerList", "updatePlayerListPosition", "updateRadioPosition", "allowMovement", "enableClicks", "updateRadioSize"]) reply(n, () => "ok");

  const nav = (name) => page.getByRole("button", { name, exact: true });

  // home, on MRPD CH#1 (a job channel: the star is locked)
  await send("visible", nui("setRadioVisible", base));
  await send("list", nui("updateRadioList", players));
  await sleep(500);
  await shot("home");
  await send("time", nui("UpdateTime", "21:08"));
  await send("talking", nui("updateRadioTalking", { radioId: "12", radioTalking: true }));
  await sleep(200);
  await shot("home-talking");

  at("mute");
  await page.getByRole("button", { name: "Volume" }).click();
  await sleep(150);
  at("unmute");
  await page.getByRole("button", { name: "Volume" }).click();
  await sleep(150);
  at("volume-key");
  await page.getByRole("slider").first().focus(); // the only slider on the home screen
  await page.keyboard.press("ArrowRight");
  await sleep(150);

  // channels: join a recommended one by click
  at("nav-channels");
  await nav("Channels").click();
  await sleep(300);
  await shot("channels");
  at("tab-recommended");
  await page.getByRole("tab", { name: "Recommended" }).click();
  await sleep(200);
  at("join-click");
  await page.getByRole("button", { name: /12\.5 MHz/ }).click();
  await sleep(150);
  await send("notify-joined", nui("notify", { msg: "Joined Station 12.50 MHz", duration: 5000 }));
  await send("update-12.5", nui("updateRadio", { ...base, channel: 12.5, recomended: [1, 12.5, 420], maxChannel: undefined }));
  await sleep(100);
  at("nav-home-0");
  await nav("Back").click();
  await sleep(300);
  await shot("home-notify");
  // 12.5 isn't a favourite: the star adds it, then removes it
  at("fav-add");
  await page.getByRole("button", { name: "Favorites" }).click();
  await sleep(150);
  at("fav-remove");
  await page.getByRole("button", { name: "Favorites" }).click();
  await sleep(150);

  // keypad: clicks, then typed
  at("nav-keypad");
  await nav("Radio").click();
  await sleep(300);
  for (const k of ["4", "2", "0"]) {
    at(`key-${k}`);
    await page.getByRole("button", { name: k, exact: true }).click();
    await sleep(80);
  }
  await shot("keypad");
  at("join-keypad");
  await nav("Join").click();
  await sleep(150);
  await send("update-420", nui("updateRadio", { ...base, channel: 420, maxChannel: undefined }));
  await sleep(200);
  at("nav-home-1");
  await nav("Back").click();
  await sleep(150);
  at("nav-keypad-2");
  await nav("Radio").click();
  await sleep(200);
  await page.evaluate(() => document.activeElement?.blur()); // Enter must reach the keypad, not the nav button
  at("keypad-typed");
  await page.keyboard.type("88.555"); // the third decimal is dropped
  await page.keyboard.press("Enter");
  await sleep(150);
  at("keypad-over-max");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("9999"); // over maxChannel: stays at 88.5… then 9
  await sleep(100);
  at("nav-home");
  await nav("Back").click();
  await sleep(200);

  // members: muted list, mute one, overlay toggle, settings
  at("nav-members");
  await nav("Members").click();
  await sleep(300);
  await shot("members");
  at("mute-member");
  await page.getByRole("button", { name: "Mute" }).nth(1).click();
  await sleep(150);
  at("mute-self");
  await page.getByRole("button", { name: "Mute" }).first().click();
  await sleep(150);
  at("overlay-hide");
  await nav("Hide overlay").click();
  await sleep(150);
  at("overlay-show");
  await nav("Show overlay").click();
  await sleep(150);
  at("nav-settings");
  await nav("Settings").click();
  await sleep(300);
  await shot("settings");

  // settings: switches, sizes, call sign, save
  const switches = page.getByRole("switch");
  at("allow-move-on");
  await switches.nth(1).click();
  await sleep(150);
  at("clicks-off");
  await switches.nth(2).click();
  await sleep(150);
  at("radio-size");
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await sleep(150);
  at("overlay-size");
  await page.getByRole("slider").nth(1).focus();
  await page.keyboard.press("ArrowLeft");
  await sleep(150);
  at("call-sign");
  const name = page.getByRole("textbox");
  await name.fill("Vale 2");
  await sleep(100);
  at("save");
  await nav("Save").click();
  await sleep(300);
  await shot("members-after-save");

  // move the radio: Settings → Move radio, drag by a fixed delta, then off
  at("nav-settings-2");
  await nav("Settings").click();
  await sleep(200);
  at("move-on");
  await switches.nth(0).click();
  await sleep(150);
  at("drag-radio");
  const box = await page.locator("[data-radio]").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 20, box.y + 8 - 15, { steps: 4 });
  await page.mouse.move(box.x + box.width / 2 - 40, box.y + 8 - 30, { steps: 4 });
  await page.mouse.up();
  await sleep(200);
  await shot("move");
  at("move-off");
  await switches.nth(0).click();
  await sleep(150);
  // drag the overlay (forced to show while Settings is open)
  at("drag-overlay");
  const ov = await page.locator("[data-overlay]").boundingBox();
  await page.mouse.move(ov.x + ov.width / 2, ov.y + 6);
  await page.mouse.down();
  await page.mouse.move(ov.x + ov.width / 2 - 15, ov.y + 6 + 20, { steps: 4 });
  await page.mouse.move(ov.x + ov.width / 2 - 30, ov.y + 6 + 40, { steps: 4 });
  await page.mouse.up();
  await sleep(200);
  at("nav-home-2");
  await nav("Back").click();
  await sleep(200);

  // disconnect, then the off-channel home
  at("leave");
  await nav("Disconnect").click();
  await sleep(150);
  await send("update-off", nui("updateRadio", { ...base, onRadio: false, channel: 0, maxChannel: undefined }));
  await sleep(300);
  await shot("offline");

  // states driven by Lua
  await send("jammer", nui("insideJammer", true));
  await send("update-low", nui("updateRadio", { ...base, battery: 12, insideJammerZone: true, maxChannel: undefined }));
  await sleep(300);
  await shot("jammed-low");
  await send("update-dead", nui("updateRadio", { ...base, battery: 0, maxChannel: undefined }));
  await sleep(300);
  await shot("no-charge");
  await send("update-never", nui("updateRadio", { ...base, overlay: "never", maxChannel: undefined }));
  await send("list-2", nui("updateRadioList", players));
  await sleep(300);
  await shot("overlay-never");
  await send("update-always", nui("updateRadio", { ...base, overlay: "always", maxChannel: undefined }));
  await sleep(300);
  await shot("overlay-always");
  await send("list-empty", nui("updateRadioList", []));
  await sleep(200);

  // Escape → hideUI; Lua answers with setRadioHide
  at("escape");
  await page.keyboard.press("Escape");
  await sleep(150);
  await send("hide", nui("setRadioHide", null));
  await sleep(400);
  await shot("hidden");
  at("escape-hidden");
  await page.keyboard.press("Escape"); // nothing: the radio is away
  await sleep(150);
}
