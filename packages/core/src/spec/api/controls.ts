import type { DomainSpec } from "./types";

const L = "lua only: DisableControlAction runs in Lua";
/** Controls: game controls disabled in named sets, released per set, never leaked. */
export default {
  js: "controls",
  lua: "controls",
  title: "Controls",
  doc: "Disable game controls in sets (presets or ids) until released; surfaces declare theirs.",
  docs: "docs/services.md#nkcontrols",
  entries: [
    { name: "disable", kind: "call", doc: "Disable a set until released; returns its handle.", lua: "nk.controls.disable", sig: { lua: "nk.controls.disable(spec, { onDeath?, name? }) → NuiControlsHandle" }, only: L, since: "0.8.0" },
    { name: "release", kind: "call", doc: "Release one set; the others stay.", lua: "nk.controls.release", only: L, since: "0.8.0" },
    { name: "releaseAll", kind: "call", doc: "Release every set ('dead' keeps onDeath = 'keep').", lua: "nk.controls.releaseAll", only: L, since: "0.8.0" },
    { name: "isDisabled", kind: "call", doc: "Is this control disabled by a set now.", lua: "nk.controls.isDisabled", only: L, since: "0.8.0" },
    { name: "active", kind: "call", doc: "The union being disabled: ids, or 'all'.", lua: "nk.controls.active", only: L, since: "0.8.0" },
    { name: "count", kind: "call", doc: "How many sets are active.", lua: "nk.controls.count", only: L, since: "0.8.0" },
    { name: "resolve", kind: "call", doc: "A spec (preset, id, list) as ids.", lua: "nk.controls.resolve", only: L, since: "0.8.0" },
    { name: "presets", kind: "const", doc: "movement, look, weapons, vehicle, frontend.", lua: "nk.controls.presets", only: L, since: "0.8.0" },
    { name: "handle.release", kind: "handle", doc: "Release this set.", lua: "NuiControlsHandle:release", only: L, since: "0.8.0" },
  ],
  rules: ["A surface's `controls` are disabled while it is open, released when it closes.", "Idle: no thread. Death releases every set without onDeath = 'keep'."],
} satisfies DomainSpec;
