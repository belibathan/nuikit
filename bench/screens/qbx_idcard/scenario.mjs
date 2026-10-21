// qbx_idcard: { type, playerData | configData } in; `closeIdCard` (no body) out on the close key and after
// autoClose (docs/qbx-idcard-protocol.md). The close key posts even with no card showing.
export const resource = "qbx_idcard";
export const entry = "index.html";
export const scene = "stage-day.jpg";

const mugshot = (bg, skin, hair) =>
  "data:image/svg+xml;base64," +
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="${bg}"/>
  <ellipse cx="60" cy="160" rx="54" ry="44" fill="#2f3542"/>
  <rect x="49" y="96" width="22" height="22" fill="${skin}"/>
  <ellipse cx="60" cy="72" rx="27" ry="33" fill="${skin}"/>
  <path d="M33 66 C33 34 87 34 87 66 C80 50 46 48 33 66 Z" fill="${hair}"/>
</svg>`).toString("base64");

const NIKO = {
  citizenid: "QBX48213",
  firstname: "Niko",
  lastname: "Bellic",
  birthdate: "1978-07-14",
  sex: "Male",
  nationality: "Serbian",
  mugShot: mugshot("#9aa4b1", "#d9a77f", "#2b2118"),
  badge: "none",
};
const CARDS = {
  id: { ...NIKO, cardtype: "id_card" },
  driver: { ...NIKO, cardtype: "driver_license" },
  weapon: { citizenid: "QBX10552", firstname: "Claude", lastname: "Speed", birthdate: "1980-02-02", sex: "M", nationality: "American", cardtype: "weaponlicense", mugShot: mugshot("#a7b0a0", "#e8bf98", "#3a2a1a"), badge: "none" },
  lawyer: { citizenid: "QBX77310", firstname: "Maria", lastname: "Latore", birthdate: "1985-11-30", sex: "Female", nationality: "Italian", cardtype: "lawyerpass", mugShot: mugshot("#b7a99a", "#c8906b", "#1a1110"), badge: "none" },
  badge: { ...NIKO, cardtype: "id_card", badge: { img: "examplebadge", grade: "Sergeant" } },
  nomugshot: { ...NIKO, cardtype: "driver_license", mugShot: undefined },
  unknown: { ...NIKO, cardtype: "pilot_license", firstname: "Tommy", lastname: "Vercetti-Montgomery-Long" },
};
const CONFIG = {
  idCardSettings: { closeKey: "Backspace", autoClose: { status: false, time: 3000 } },
  licenses: {
    id_card: { header: "Identity", background: "#ebf7fd", prop: "prop_franklin_dl" },
    driver_license: { header: "Driver License", background: "#febbbb", prop: "prop_franklin_dl" },
    weaponlicense: { header: "Weapon License", background: "#c7ffe5", prop: "prop_franklin_dl" },
    lawyerpass: { header: "Lawyer Pass", background: "#f9c491", prop: "prop_cs_r_business_card" },
  },
};
const RECOLORED = { ...CONFIG, licenses: { ...CONFIG.licenses, id_card: { header: "San Andreas ID", background: "#7c9cff" } } };
const AUTOCLOSE = { ...CONFIG, idCardSettings: { closeKey: "Backspace", autoClose: { status: true, time: 1500 } } };

export async function run({ page, send, at, shot, sleep }) {
  // the close key with nothing showing still posts (so Lua can always release focus)
  at("key-nothing-shown");
  await page.keyboard.press("Backspace");
  await sleep(200);

  await send("config", { type: "configData", configData: CONFIG });
  for (const [name, card] of Object.entries(CARDS)) {
    await send(`card-${name}`, { type: "playerData", playerData: card });
    await sleep(400);
    await shot(name);
    at(`other-key-${name}`);
    await page.keyboard.press("e"); // not the close key: nothing posts
    await sleep(100);
    at(`close-${name}`);
    await page.keyboard.press("Backspace");
    await sleep(250);
  }
  await shot("closed");

  await send("config-recolored", { type: "configData", configData: RECOLORED });
  await send("card-recolored", { type: "playerData", playerData: CARDS.id });
  await sleep(400);
  await shot("recolored");
  at("close-recolored");
  await page.keyboard.press("Backspace");
  await sleep(250);

  // autoClose: closeIdCard on its own after `time` ms
  await send("config-autoclose", { type: "configData", configData: AUTOCLOSE });
  await send("card-autoclose", { type: "playerData", playerData: CARDS.driver });
  await sleep(2200);
}
