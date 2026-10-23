// The game, faked for browser development. Press ` for the devtools.
//
// The loading screen has no Lua → UI messages of its own: the game posts its load events and
// sets window.nuiHandoverData once. Here you can:
//   ?handover=full|minimal|themed|long|none   pick what server/main.lua would hand over
//   ?state=connecting|core|map|afterMap|session|finishing|ready   jump to a step
//   (no ?state)                           replay a whole load, like the game does
// and fire any single event from the devtools panel.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import serverTheme from "../../../nuikit/theme.css?raw";
import { setHandover, type LoadingHandover } from "@/lib/handover";

/** A painted backdrop standing in for a screenshot, so the scrim can be judged over an image. */
const scene = (a: string, b: string, c: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#s)"/>
  <circle cx="1460" cy="380" r="120" fill="#ffd9a8" opacity=".55"/>
  <path d="M0 760 L120 700 L180 720 L260 610 L300 640 L360 520 L420 560 L470 470 L520 540 L600 500 L660 600 L760 560 L820 640 L900 590 L980 660 L1080 600 L1160 680 L1260 620 L1340 700 L1460 650 L1560 720 L1680 660 L1800 720 L1920 690 L1920 1080 L0 1080 Z" fill="#0b0d16" opacity=".9"/>
  <g fill="#ffcf7a" opacity=".7">${Array.from({ length: 70 }, (_, i) => `<rect x="${(i * 137) % 1900}" y="${700 + ((i * 53) % 300)}" width="4" height="6"/>`).join("")}</g>
</svg>`);

const BASE: LoadingHandover = {
  serverName: "Los Santos Stories",
  tagline: "Serious roleplay, since 2026",
  playerName: "Niko",
  tips: [
    { title: "Press Z for the radial menu", text: "Emotes, vehicle options, your phone and more live in one place." },
    { title: "Read the rules", text: "They are short, and staff will ask you about them. Find them on our Discord." },
    "Out-of-character chat goes in /ooc. Everything else is your story.",
    { title: "Need help?", text: "Use /report in game. A staff member will get back to you." },
  ],
  tipInterval: 6000,
  links: [
    { label: "Discord", url: "discord.gg/lsstories" },
    { label: "Website", url: "lsstories.gg" },
  ],
};

const VIOLET = `.dark {
  --background: oklch(0.16 0.02 285); --foreground: oklch(0.97 0.01 285);
  --card: oklch(0.2 0.025 285); --card-foreground: oklch(0.97 0.01 285);
  --primary: oklch(0.72 0.17 295); --primary-foreground: oklch(0.15 0.03 295);
  --secondary: oklch(0.28 0.04 290); --secondary-foreground: oklch(0.97 0.01 285);
  --muted: oklch(0.26 0.03 285); --muted-foreground: oklch(0.72 0.03 285);
  --border: oklch(1 0 0 / 12%); --chart-2: oklch(0.65 0.15 200); --radius: 0.9rem;
}`;

const HANDOVERS: Record<string, LoadingHandover | undefined> = {
  full: {
    ...BASE,
    theme: serverTheme,
    backgrounds: [scene("#2b3a67", "#c46b5a", "#1a1424"), scene("#14324a", "#3f7f8c", "#0b1520")],
    backgroundInterval: 7000,
    music: ["data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA="],
  },
  minimal: { serverName: "Los Santos Stories", playerName: "Niko", theme: serverTheme },
  themed: { ...BASE, theme: VIOLET },
  // third-party strings as a server really sends them: an emoji and " | ", mixed case, long text
  long: {
    ...BASE,
    serverName: "🌴 | VINEWOOD NIGHTS RP — Serious roleplay since 2019 — discord.gg/vnr",
    tagline: "Long-form stories, real consequences, and a staff team that answers tickets within a day, most days of the week.",
    playerName: "Tommy Vercetti-Montgomery-Longname",
    tips: [
      { title: "Press Z for the radial menu and every other thing you can do in this world", text: "Emotes, vehicle options, your phone, documents and more live in one place. Hold Z to see the full list." },
      { title: "Read the server rules before your first session", text: "They are short, and staff will ask you about them in your first ticket. Find them in the #rules channel on our Discord, pinned at the top." },
      "Out-of-character chat goes in /ooc, and everything in /me and /do is your story to tell.",
      { title: "Need help? 🆘", text: "Use /report in game. A staff member will get back to you, usually within a few minutes during the evening." },
    ],
    links: [
      { label: "Discord (rules, events, the weekly town hall)", url: "discord.gg/vnr" },
      { label: "Website", url: "vinewoodnights.gg" },
    ],
  },
  none: undefined,
};

type Ev = { eventName: string } & Record<string, unknown>;
const post = (data: Ev) => window.dispatchEvent(new MessageEvent("message", { data }));

/** One game load, roughly as the game sends it (docs/loadscreen-events.md). */
function timeline(): Ev[] {
  const ev: Ev[] = [];
  const order = (type: string, names: string[], from: number, to: number) => {
    ev.push({ eventName: "startInitFunction", type });
    ev.push({ eventName: "startInitFunctionOrder", type, order: 1, count: names.length });
    names.forEach((name, idx) => {
      ev.push({ eventName: "initFunctionInvoking", type, name, idx });
      ev.push({ eventName: "initFunctionInvoked", type, name });
      ev.push({ eventName: "loadProgress", loadFraction: from + ((to - from) * (idx + 1)) / names.length });
    });
    ev.push({ eventName: "endInitFunction", type });
  };
  order("INIT_CORE", ["CStreaming", "CGameWorld", "CPedPopulation", "CVehicleModelInfo"], 0, 0.1);
  order("INIT_BEFORE_MAP_LOADED", ["CScaleformMgr", "CAudioZones", "CPathServer", "CWaterAreas", "CTrain"], 0.1, 0.25);
  const files = ["platform:/data/gameconfig.xml", "dlc_mpheist/content.xml", "x64/levels/gta5/vehicles.rpf", "update/x64/dlcpacks/patchday27ng/dlc.rpf", "dlc_mpchristmas3/vehicles.meta", "x64/levels/gta5/props.rpf"];
  ev.push({ eventName: "startDataFileEntries", count: files.length * 3 });
  for (let r = 0; r < 3; r++)
    files.forEach((name, n) => {
      ev.push({ eventName: "onDataFileEntry", name, type: 0, isNew: false });
      if (n % 2) ev.push({ eventName: "performMapLoadFunction", idx: r * files.length + n });
      ev.push({ eventName: "loadProgress", loadFraction: 0.25 + (0.4 * (r * files.length + n + 1)) / (files.length * 3) });
    });
  ev.push({ eventName: "endDataFileEntries" });
  order("INIT_AFTER_MAP_LOADED", ["CPopZones", "CGarages", "CStuntJumpManager", "CPhoneMgr", "CScenarioManager", "CTaskRecover"], 0.65, 0.85);
  order("INIT_SESSION", ["CNetwork", "CTheScripts", "CRestart"], 0.85, 1);
  ev.push({ eventName: "onLogLine", message: "Starting game" });
  ev.push({ eventName: "onLogLine", message: "Awaiting scripts" });
  ev.push({ eventName: "nuikit:ready" });
  return ev;
}

/** Where each ?state= stops in the timeline. */
const STOPS: Record<string, (e: Ev) => boolean> = {
  connecting: () => true,
  core: (e) => e.eventName === "initFunctionInvoking" && e.name === "CGameWorld",
  map: (e) => e.eventName === "performMapLoadFunction" && e.idx === 9,
  afterMap: (e) => e.eventName === "initFunctionInvoking" && e.name === "CPhoneMgr",
  session: (e) => e.eventName === "initFunctionInvoking" && e.name === "CTheScripts",
  finishing: (e) => e.eventName === "onLogLine" && e.message === "Awaiting scripts",
  ready: (e) => e.eventName === "nuikit:ready",
};

const mocks = defineMocks({
  events: {
    loadProgress: [{ loadFraction: 0.12 }, { loadFraction: 0.5 }, { loadFraction: 1 }],
    startInitFunctionOrder: [{ type: "INIT_AFTER_MAP_LOADED", order: 1, count: 42 }],
    initFunctionInvoking: [{ type: "INIT_AFTER_MAP_LOADED", name: "CScenarioManager", idx: 17 }],
    startDataFileEntries: [{ count: 120 }],
    onDataFileEntry: [{ name: "dlc_mpheist/content.xml", type: 0, isNew: false }],
    performMapLoadFunction: [{ idx: 3 }],
    onLogLine: [{ message: "Awaiting scripts" }],
    "nuikit:ready": [{}],
  } as never,
});

export default function Dev() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const which = q.get("handover") ?? "full";
    setHandover(HANDOVERS[which]);

    const events = timeline();
    const state = q.get("state");
    if (state && STOPS[state]) {
      if (state === "connecting") return;
      for (const e of events) {
        post(e);
        if (STOPS[state]!(e)) break;
      }
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      if (i >= events.length) return clearInterval(t);
      post(events[i++]!);
    }, 160);
    return () => clearInterval(t);
  }, []);

  return <NuiDevtools events={mocks.events} scene="none" />;
}
