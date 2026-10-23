import type { DomainSpec } from "./types";

/** Radar: GTA's minimap, moved and masked by a HUD; the nuikit resource keeps the texture and puts it back. */
export default {
  js: "radar",
  lua: "radar",
  title: "Radar",
  doc: "A HUD that moves GTA's radar says so; the nuikit resource keeps its mask and puts it back when the HUD stops.",
  entries: [],
  events: [
    { name: "nuikit:radar:placed", dir: "local", payload: "()", sender: "owner", doc: "A HUD moved the radar (the nuikit resource restores it when that HUD stops).", wire: "nuikit:minimap:placed", since: "0.7.0" },
    { name: "nuikit:radar:released", dir: "local", payload: "()", sender: "owner", doc: "The HUD gave the radar back itself.", wire: "nuikit:minimap:released", since: "0.7.0" },
    { name: "nuikit:radar:mask", dir: "local", payload: "(kind: 'circle' | 'square', aspect: number)", sender: "owner", doc: "Use a runtime mask texture kept alive by the nuikit resource.", wire: "nuikit:minimap:mask", since: "0.8.0" },
    { name: "nuikit:radar:bars", dir: "local", payload: "(show: boolean)", sender: "owner", doc: "Show or hide the radar's health and armour bars.", wire: "nuikit:minimap:bars", since: "0.8.0" },
    { name: "nuikit:radar:satnav", dir: "local", payload: "(show: boolean)", sender: "owner", doc: "Hide GTA's satnav readout while the HUD shows its own.", wire: "nuikit:minimap:satnav", since: "0.8.0" },
  ],
  rules: ["The resource that placed the radar owns it until it stops or releases; the nuikit resource restores the stock layout after."],
} satisfies DomainSpec;
