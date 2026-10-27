import type { DomainSpec } from "./types";

/** Layout: the screen box, the viewport table, zones as places, and the helpers that place things in them. */
export default {
  js: "layout",
  lua: "layout",
  title: "Layout",
  doc: "The 16:9 screen box, the viewport table, zone ids and placement: every part of every page is placed through these.",
  docs: "docs/design.md",
  entries: [
    { name: "viewports", kind: "const", doc: "The one table of aspects, scale floors and sample sizes.", js: "VIEWPORTS", also: ["VIEWPORT_SAMPLES", "DESIGN"], only: "js only: layout", since: "0.9.0" },
    { name: "viewport", kind: "call", doc: "The current viewport (size, aspect, scale, safe area).", js: "getViewport", also: ["viewportOf", "aspectOf", "parseViewport"], only: "js only: layout", since: "0.9.0" },
    { name: "watch", kind: "call", doc: "Paint data-nk-aspect on <html> and call back on change.", js: "watchViewport", also: ["onViewport"], only: "js only: layout", since: "0.9.0" },
    { name: "useViewport", kind: "hook", doc: "The viewport, live.", js: "useViewport", only: "js only: React", since: "0.9.0" },
    { name: "zones", kind: "const", doc: "The nine places and four edges a part can live in.", js: "ZONE_IDS", also: ["toZoneId", "zoneOf"], only: "js only: layout", since: "0.9.0" },
    { name: "place", kind: "call", doc: "Where a zone sits in the box, and how parts stack inside it.", js: "zonePlacement", also: ["zonePosition", "zoneRect", "stackOffsets"], only: "js only: layout", since: "0.9.0" },
    { name: "publish", kind: "call", doc: "Publish the rectangles a page's zone covers (locally, and to other pages).", js: "publishZone", also: ["setLocalZone"], only: "js only: a page publishes its own", since: "0.9.0" },
  ],
  events: [],
  legacy: [],
  rules: ["Every page root is a Screen; every anchored part sits in a Zone; nothing is positioned with ad-hoc coordinates."],
} satisfies DomainSpec;
