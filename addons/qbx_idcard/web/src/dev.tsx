// qbx_idcard's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload qbx_idcard's Lua really sends (docs/qbx-idcard-protocol.md). The game
// sends { type, playerData | configData }; devtools sends { action, data }, which the page accepts too.
// Jump to a state with ?state=id|driver|weapon|lawyer|badge|nomugshot|unknown|recolored|avatar|closed.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

/** Stands in for MugShotBase64's data: URL headshot. */
const mugshot = (bg: string, skin: string, hair: string) =>
  "data:image/svg+xml;base64," +
  btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <rect width="120" height="160" fill="${bg}"/>
  <ellipse cx="60" cy="160" rx="54" ry="44" fill="#2f3542"/>
  <rect x="49" y="96" width="22" height="22" fill="${skin}"/>
  <ellipse cx="60" cy="72" rx="27" ry="33" fill="${skin}"/>
  <path d="M33 66 C33 34 87 34 87 66 C80 50 46 48 33 66 Z" fill="${hair}"/>
</svg>`);

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
  weapon: {
    citizenid: "QBX10552",
    firstname: "Claude",
    lastname: "Speed",
    birthdate: "1980-02-02",
    sex: "M",
    nationality: "American",
    cardtype: "weaponlicense",
    mugShot: mugshot("#a7b0a0", "#e8bf98", "#3a2a1a"),
    badge: "none",
  },
  lawyer: {
    citizenid: "QBX77310",
    firstname: "Maria",
    lastname: "Latore",
    birthdate: "1985-11-30",
    sex: "Female",
    nationality: "Italian",
    cardtype: "lawyerpass",
    mugShot: mugshot("#b7a99a", "#c8906b", "#1a1110"),
    badge: "none",
  },
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

const mocks = defineMocks({
  events: {
    playerData: Object.values(CARDS),
    configData: [CONFIG, RECOLORED, { ...CONFIG, idCardSettings: { closeKey: "Backspace", autoClose: { status: true, time: 3000 } } }],
  } as never,
});

const post = (data: object) => window.dispatchEvent(new MessageEvent("message", { data }));

export default function Dev() {
  useEffect(() => {
    const state = new URLSearchParams(location.search).get("state") ?? "id";
    post({ type: "configData", configData: state === "recolored" ? RECOLORED : state === "avatar" ? { ...CONFIG, photo: "avatar" } : CONFIG });
    const card = state === "recolored" || state === "closed" || state === "avatar" ? CARDS.id : CARDS[state as keyof typeof CARDS] ?? CARDS.id;
    post({ type: "playerData", playerData: card });
  }, []);
  return <NuiDevtools events={mocks.events} scene="day" />;
}
