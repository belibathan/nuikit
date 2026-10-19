// The nuikit host page (docs/host.md). client/host.lua tells it which modules to load; each one
// mounts in its own shadow root with the server theme, and talks only to its own resource.
import { applyTheme, onNui } from "nuikit-core";
import { createHost, type Isolation } from "nuikit-core/host";
import "./index.css";

// The theme is the host's job: applied once to this document, every module inherits it.
// (nuikit-core also sends nuikit:ready from this page, and nuikit.lua answers with theme.css.)
onNui("nuikit:theme", (css) => {
  if (typeof css === "string" && css) applyTheme(css);
});

// Query parameters are for browser tests and bench/host only; the game loads the bare page.
const params = new URLSearchParams(location.search);
const host = createHost({
  isolation: (params.get("isolation") as Isolation | null) ?? "shadow",
  shadowMode: params.get("shadow") === "open" ? "open" : "closed",
  trust: params.get("trust") === "any" ? "any" : "parent",
});
if (params.has("debug")) (window as unknown as { __nuikitHost: typeof host }).__nuikitHost = host;
