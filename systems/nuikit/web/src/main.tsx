// The nuikit resource's frame (docs/intents.md §4, docs/host.md): one page that draws every intent
// any script asks for, and hosts other resources' UI modules in the same document.
import { resourceName } from "nuikit-core";
import { createHost, type Isolation } from "nuikit-core/host";
import { createIntentStore } from "nuikit-core/intents";
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { Frame } from "./frame";
import "./index.css";
import "./frame.css";

// The theme and the player's prefs are this page's job: nuikit-core applies them to the document
// (live, from GlobalState via nuikit.lua) and the renderers and every hosted module inherit them.
document.documentElement.dataset.nkHost = resourceName();

// Query parameters are for browser tests and bench/host only; the game loads the bare page.
const params = new URLSearchParams(location.search);
const host = createHost({
  isolation: (params.get("isolation") as Isolation | null) ?? "shadow",
  shadowMode: params.get("shadow") === "open" ? "open" : "closed",
  trust: params.get("trust") === "any" ? "any" : "parent",
});
if (params.has("debug")) (window as unknown as { __nuikitHost: typeof host }).__nuikitHost = host;

const store = createIntentStore();

// Browser-only devtools and fixtures (press `). Not bundled into the build the game loads.
const Dev = import.meta.env.DEV ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Frame store={store} />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
