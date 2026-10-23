// mm_radio's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload mm_radio's Lua really sends (docs/mm-radio-protocol.md).
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { browserReplies } from "@/lib/nui";
import type { PlayerList, RadioData } from "@/lib/types";

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

const channelName = {
  "1": "MRPD CH#1",
  "1.%": "MRPD CH#1",
  "2": "MRPD CH#2",
  "2.%": "MRPD CH#2",
  "420": "Ballas CH#1",
  "420.%": "Ballas CH#1",
  // a long list of recommended stations, with a third-party name and a long one
  "9": "Pacific Standard Dispatch",
  "12.5": "🎵 | Vinewood Gospel Hour (Late Night Edition)",
  "77.7": "Weazel News",
  "88.5": "Radio Los Santos",
  "101.1": "Bounce FM",
  "150": "Sweet 96.1 (Ads)",
  "222": "Blaine County Sheriff",
  "300": "Mirror Park Rec",
  "415.2": "Vespucci Beach Club",
  "499": "Emergency Services (EMS)",
};

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

let state: RadioData = {
  radioId: "PERSONAL",
  onRadio: true,
  channel: 1,
  volume: 30,
  favourite: [1, 2, 88.5],
  recomended: [1, 12.5, 420, 9, 77.7, 88.5, 101.1, 150, 222, 300, 415.2, 499],
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

const players: PlayerList = {
  "1": { name: "Jordan Vale", isTalking: false },
  "7": { name: "Officer Casey Reed", isTalking: true },
  "12": { name: "Sgt. Morgan Hale", isTalking: false },
  "23": { name: "Dispatch", isTalking: false },
  // a long roster: mixed-case names, one with an emoji and " | ", one very long
  "31": { name: "🚔 | Officer Lupe Ortega", isTalking: false },
  "32": { name: "Dr. Priya Ramanathan-Whitfield (EMS)", isTalking: false },
  "33": { name: "mechanic_dan", isTalking: false },
  "34": { name: "Tommy Vercetti-Montgomery-Longname-Esquire", isTalking: false },
  "35": { name: "Kenji Ito", isTalking: true },
  "36": { name: "Shelby", isTalking: false },
  "37": { name: "DJ Sunshine 2026 (Bounce FM)", isTalking: false },
  "38": { name: "Officer Casey Reed", isTalking: false },
  "39": { name: "Gus", isTalking: false },
  "40": { name: "Lester Crest", isTalking: false },
};

let muted: Record<string, boolean> = {};
const notify = (msg: string, duration = 5000) => emit("notify", { msg, duration } as never);
const update = () => emit("updateRadio", { ...state, maxChannel: undefined } as never);

browserReplies.hideUI = () => {
  setTimeout(() => emit("setRadioHide", null as never), 30);
  return "ok";
};
browserReplies.join = (ch: string | number) => {
  const n = Number(ch);
  if (!n || n < 1 || n > 500) return notify(`Station ${n.toFixed(2)} MHz is not available`), "ok";
  if (n === state.channel && state.onRadio) return notify(`You are already joined to Station ${n.toFixed(2)} MHz`, 10000), "ok";
  if (n >= 3 && n <= 10) return notify(`You are not allowed to join Station ${n.toFixed(2)} MHz`, 10000), "ok";
  state = { ...state, onRadio: true, channel: n, recomended: state.recomended!.includes(n) ? state.recomended : [...state.recomended!, n] };
  notify(`Joined Station ${n.toFixed(2)} MHz`);
  update();
  emit("updateRadioList", { "1": { name: state.userData!.name!, isTalking: false } } as never);
  return "ok";
};
browserReplies.leave = () => {
  state = { ...state, onRadio: false, channel: 0 };
  update();
  return "ok";
};
browserReplies.volumeChange = (v) => {
  state = { ...state, volume: Number(v) };
  notify(`Volume set to ${Number(v)}%`);
  return "ok";
};
browserReplies.toggleMute = (v) => {
  state = { ...state, volume: Number(v) };
  notify(Number(v) === 0 ? "Radio Deafened" : "Radio Undeafened");
  return "ok";
};
browserReplies.addFav = (ch) => {
  if (ch === state.channel) state = { ...state, favourite: [...state.favourite!, ch], userData: { ...state.userData, favourite: [...state.userData!.favourite!, ch] } };
  return "ok";
};
browserReplies.removeFav = (ch) => {
  if (ch === state.channel) state = { ...state, favourite: state.favourite!.filter((c) => c !== ch), userData: { ...state.userData, favourite: state.userData!.favourite!.filter((c) => c !== ch) } };
  return "ok";
};
browserReplies.showPlayerList = (show) => {
  state = { ...state, userData: { ...state.userData, playerlist: { ...state.userData!.playerlist, show: !!show } } };
  return "ok";
};
browserReplies.saveData = ({ name }) => {
  state = { ...state, userData: { ...state.userData, name } };
  update();
  return "ok";
};
browserReplies.getMutedList = () => muted;
browserReplies.togglemutePlayer = (id: number) => {
  if (id === 1) return notify("Failed to Mute Player"), null;
  muted = { ...muted, [id]: !muted[id] };
  return muted;
};

const mocks = defineMocks({
  events: {
    setRadioVisible: [
      state,
      { ...state, onRadio: false, channel: 0 },
      { ...state, battery: 12, insideJammerZone: true },
      { ...state, battery: 0 },
      { ...state, overlay: "never" },
      { ...state, overlay: "always" },
    ],
    updateRadio: [{ ...state, channel: 12.5, maxChannel: undefined }],
    UpdateTime: ["21:08", "6:00"],
    setRadioHide: [null],
    insideJammer: [true, false],
    notify: [
      { msg: "Joined Station 1.00 MHz", duration: 5000 },
      { msg: "You are not allowed to join Station 5.00 MHz", duration: 10000 },
    ],
    updateRadioList: [players, []],
    updateRadioTalking: [
      { radioId: "12", radioTalking: true },
      { radioId: "12", radioTalking: false },
      { radioId: "1", radioTalking: true },
    ],
  },
});

declare global {
  interface Window {
    __radio?: { emit: typeof emit; state: () => RadioData; players: PlayerList };
  }
}

export default function Dev() {
  useEffect(() => {
    window.__radio = { emit, state: () => state, players };
    const q = new URLSearchParams(location.search);
    if (q.has("open")) {
      emit("setRadioVisible", state as never);
      emit("updateRadioList", players as never);
    }
  }, []);
  return <NuiDevtools events={mocks.events as never} scene="dusk" />;
}
