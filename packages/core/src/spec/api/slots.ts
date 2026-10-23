import type { DomainSpec } from "./types";

/** Slots: a cluster (the HUD's vitals row) draws what other resources join it with. */
export default {
  js: "slots",
  lua: "slot",
  title: "Slots",
  doc: "Join a cluster (the HUD's vitals row) with a slot; the cluster draws it, ordered.",
  docs: "docs/slots.md",
  entries: [
    { name: "join", kind: "call", doc: "Join a cluster; returns a handle (set, remove).", lua: "nk.slot.join", impl: "NUI.slot", sig: { lua: "nk.slot.join(cluster, key, { order?, label?, icon?, hue?, level?, value?, alert?, hidden? })" }, only: "lua only: resources join, pages draw", since: "0.6.0" },
    { name: "leave", kind: "call", doc: "Leave a cluster without the handle.", lua: "nk.slot.leave", impl: "NUI.unslot", only: "lua only: resources join, pages draw", since: "0.6.0" },
    { name: "all", kind: "call", doc: "Every joined slot by cluster.", lua: "nk.slot.all", impl: "NUI.slots", js: "getAllSlots", since: "0.6.0" },
    { name: "get", kind: "call", doc: "One cluster's slots, ordered.", js: "getSlots", only: "js only: the cluster draws", since: "0.6.0" },
    { name: "subscribe", kind: "call", doc: "Called on every change.", js: "onSlots", only: "js only: Lua is the source", since: "0.6.0" },
    { name: "replace", kind: "call", doc: "Replace the set (what the event does; dev).", js: "setSlots", only: "js only: dev", since: "0.6.0" },
    { name: "useSlots", kind: "hook", doc: "One cluster's slots, live.", js: "useSlots", only: "js only: React", since: "0.6.0" },
  ],
  events: [{ name: "nuikit:slot:changed", dir: "lua→page", payload: "Slots", sender: "runtime", doc: "Every slot, on change.", wire: "nuikit:slots", since: "0.6.0" }],
  legacy: [
    { old: "NUI.slot", now: "nk.slot.join", removeIn: "1.0.0" },
    { old: "NUI.unslot", now: "nk.slot.leave", removeIn: "1.0.0" },
    { old: "NUI.slots", now: "nk.slot.all", removeIn: "1.0.0" },
  ],
  rules: ["A resource joins and changes only its own slots (resource:key)."],
} satisfies DomainSpec;
