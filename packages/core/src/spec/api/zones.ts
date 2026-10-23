import type { DomainSpec } from "./types";

/** Zones: what each UI covers on screen, so others stay clear of it. */
export default {
  js: "zones",
  lua: "zone",
  title: "Zones",
  doc: "Publish what a UI covers on screen; every other UI stays clear of it.",
  docs: "docs/protocol.md",
  entries: [
    { name: "set", kind: "call", doc: "Publish (or with nil, remove) the rectangles this UI covers.", lua: "nk.zone.set", impl: "NUI.zone", sig: { lua: "nk.zone.set(name, rects|nil)" }, only: "lua only: the owner publishes through its state bag", since: "0.7.0" },
    { name: "all", kind: "call", doc: "Every published zone.", lua: "nk.zone.all", impl: "NUI.zones", js: "getZones", since: "0.7.0" },
    { name: "subscribe", kind: "call", doc: "Called on every change.", js: "onZones", only: "js only: Lua is the source", since: "0.7.0" },
    { name: "replace", kind: "call", doc: "Replace the zones (what the event does; override pages via the theme poll).", js: "setZones", only: "js only: Lua publishes", since: "0.7.0" },
    { name: "clearOf", kind: "call", doc: "The offsets that keep a position clear of the zones.", js: "clearOf", only: "js only: layout", since: "0.7.0" },
    { name: "useZones", kind: "hook", doc: "The zones, live.", js: "useZones", only: "js only: React", since: "0.7.0" },
    { name: "useClearOf", kind: "hook", doc: "A style that keeps a position clear of the zones.", js: "useClearOf", only: "js only: React", since: "0.7.0" },
  ],
  events: [{ name: "nuikit:zone:changed", dir: "lua→page", payload: "Zones", sender: "runtime", doc: "Every zone, on change.", wire: "nuikit:zones", since: "0.7.0" }],
  legacy: [
    { old: "NUI.zone", now: "nk.zone.set", removeIn: "1.0.0" },
    { old: "NUI.zones", now: "nk.zone.all", removeIn: "1.0.0" },
  ],
  rules: ["Rectangles in fractions of the screen; a resource publishes only its own."],
} satisfies DomainSpec;
