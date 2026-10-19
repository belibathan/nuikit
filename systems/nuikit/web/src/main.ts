// The nuikit host page (docs/host.md). client/host.lua tells it which modules to load; each one
// mounts in its own shadow root with the server theme, and talks only to its own resource.
import { resourceName } from "nuikit-core";
import { createHost, type Isolation } from "nuikit-core/host";
import "./index.css";

// The theme and the player's prefs are the host's job: nuikit-core applies them to this document
// (live, from GlobalState via nuikit.lua) and every module inherits them. Modules skip their own.
// nuikit-core is side-effect free for bundlers, so a bare import would be dropped: use a binding.
document.documentElement.dataset.nkHost = resourceName();

// Query parameters are for browser tests and bench/host only; the game loads the bare page.
const params = new URLSearchParams(location.search);
const host = createHost({
  isolation: (params.get("isolation") as Isolation | null) ?? "shadow",
  shadowMode: params.get("shadow") === "open" ? "open" : "closed",
  trust: params.get("trust") === "any" ? "any" : "parent",
});
if (params.has("debug")) (window as unknown as { __nuikitHost: typeof host }).__nuikitHost = host;
