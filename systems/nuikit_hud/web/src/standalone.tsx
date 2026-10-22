// The HUD on its own ui_page (no nuikit host, or the host isn't running).
import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./hud.css";

// Browser-only devtools (press `). Not bundled into the build the game loads.
// VITE_PERF=1 builds them into a production bundle for perf.mjs (never the one the game loads)
// Never in game: with `pnpm dev` the game loads this same page (ui_page → the dev server).
const Dev = (import.meta.env.DEV || import.meta.env.VITE_PERF) && !("GetParentResourceName" in globalThis) ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
