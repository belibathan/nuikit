import type { DomainSpec } from "./types";

/** Devtools: the browser panel (press `) with event presets, surfaces, the call log and scenes. */
export default {
  js: "devtools",
  lua: "devtools",
  title: "Devtools",
  doc: "Work in the browser like in game: event presets, mocked callbacks, the surface stack, a call log, scenes.",
  entries: [
    { name: "NuiDevtools", kind: "component", doc: "The panel (press `).", js: "NuiDevtools", only: "js only: browser dev", since: "0.4.0" },
    { name: "defineMocks", kind: "call", doc: "Typed event presets and callback mocks.", js: "defineMocks", only: "js only: browser dev", since: "0.4.0" },
  ],
} satisfies DomainSpec;
