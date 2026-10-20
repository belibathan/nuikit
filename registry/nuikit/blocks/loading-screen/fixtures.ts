// Every state of the loading screen: what the server hands over, and how far the game has loaded.
// Used by dev.tsx (browser development: ?handover=<name>&state=<name>, or a whole replayed load),
// screenshots and the site's previews.
import type { LoadingHandover } from "./handover"
import { initialLoad, reduceLoad, type LoadMessage, type LoadState } from "./progress"

/** A painted city at dusk standing in for a screenshot, so the scrim can be judged over an image. */
const scene = (a: string, b: string, c: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#s)"/>
  <path d="M0 760 L120 700 L180 720 L260 610 L300 640 L360 520 L420 560 L470 470 L520 540 L600 500 L660 600 L760 560 L820 640 L900 590 L980 660 L1080 600 L1160 680 L1260 620 L1340 700 L1460 650 L1560 720 L1680 660 L1800 720 L1920 690 L1920 1080 L0 1080 Z" fill="${c}" opacity=".9"/>
</svg>`)

const base: LoadingHandover = {
  serverName: "Los Santos",
  tagline: "Serious roleplay since 2026",
  playerName: "alex_m",
  tips: [
    { title: "Press Z for the radial menu", text: "Emotes, vehicle options, your phone and more live in one place." },
    { title: "Read the rules", text: "They're short, and staff will ask you about them. Find them on our Discord." },
    "Out-of-character chat goes in /ooc. Everything else is your story.",
  ],
  tipInterval: 6000,
  links: [
    { label: "Discord", url: "discord.gg/yourserver" },
    { label: "Website", url: "yourserver.com" },
  ],
}

export const loadingHandovers = {
  // nuikit-ignore-next-line color/hardcoded: painted stand-ins for background images, not UI colour
  full: { ...base, backgrounds: [scene("#2b3a67", "#c46b5a", "#1a1424"), scene("#14324a", "#3f7f8c", "#0b1520")], backgroundInterval: 7000 },
  // no backgrounds: the theme's own light
  plain: base,
  // only what the game always knows
  minimal: { serverName: "Los Santos", playerName: "alex_m" },
  none: {},
} satisfies Record<string, LoadingHandover>

/** One game load, roughly as the game posts it, phase by phase. */
export function loadTimeline(): LoadMessage[] {
  const ev: LoadMessage[] = []
  const order = (type: string, names: string[], from: number, to: number) => {
    ev.push({ eventName: "startInitFunction", type })
    ev.push({ eventName: "startInitFunctionOrder", type, order: 1, count: names.length })
    names.forEach((name, idx) => {
      ev.push({ eventName: "initFunctionInvoking", type, name, idx })
      ev.push({ eventName: "initFunctionInvoked", type, name })
      ev.push({ eventName: "loadProgress", loadFraction: from + ((to - from) * (idx + 1)) / names.length })
    })
    ev.push({ eventName: "endInitFunction", type })
  }
  order("INIT_CORE", ["CStreaming", "CGameWorld", "CPedPopulation", "CVehicleModelInfo"], 0, 0.1)
  order("INIT_BEFORE_MAP_LOADED", ["CScaleformMgr", "CAudioZones", "CPathServer", "CWaterAreas", "CTrain"], 0.1, 0.25)
  const files = ["platform:/data/gameconfig.xml", "dlc_mpheist/content.xml", "x64/levels/gta5/vehicles.rpf", "dlc_mpchristmas3/vehicles.meta", "x64/levels/gta5/props.rpf"]
  ev.push({ eventName: "startDataFileEntries", count: files.length * 3 })
  for (let r = 0; r < 3; r++)
    files.forEach((name, n) => {
      ev.push({ eventName: "onDataFileEntry", name, type: 0, isNew: false })
      if (n % 2) ev.push({ eventName: "performMapLoadFunction", idx: r * files.length + n })
      ev.push({ eventName: "loadProgress", loadFraction: 0.25 + (0.4 * (r * files.length + n + 1)) / (files.length * 3) })
    })
  ev.push({ eventName: "endDataFileEntries" })
  order("INIT_AFTER_MAP_LOADED", ["CPopZones", "CGarages", "CPhoneMgr", "CScenarioManager"], 0.65, 0.85)
  order("INIT_SESSION", ["CNetwork", "CTheScripts", "CRestart"], 0.85, 1)
  ev.push({ eventName: "onLogLine", message: "Awaiting scripts" })
  ev.push({ eventName: "nuikit:ready" })
  return ev
}

/** Where each named state stops in the timeline. */
const stops: Record<string, (e: LoadMessage) => boolean> = {
  core: (e) => e.eventName === "initFunctionInvoking" && e.name === "CGameWorld",
  map: (e) => e.eventName === "performMapLoadFunction" && e.idx === 8,
  afterMap: (e) => e.eventName === "initFunctionInvoking" && e.name === "CPhoneMgr",
  session: (e) => e.eventName === "initFunctionInvoking" && e.name === "CTheScripts",
  finishing: (e) => e.eventName === "onLogLine",
  ready: (e) => e.eventName === "nuikit:ready",
}

export const loadStates = ["connecting", "core", "map", "afterMap", "session", "finishing", "ready"] as const
export type LoadStateName = (typeof loadStates)[number]

/** The messages the game has posted by a named state. */
export function loadMessagesUntil(name: LoadStateName): LoadMessage[] {
  if (name === "connecting") return []
  const all = loadTimeline()
  const end = all.findIndex((e) => stops[name]?.(e))
  return end === -1 ? all : all.slice(0, end + 1)
}

/** The load folded up to a named state: a still for previews and screenshots. */
export function loadStateAt(name: LoadStateName): LoadState {
  return loadMessagesUntil(name).reduce(reduceLoad, initialLoad)
}
