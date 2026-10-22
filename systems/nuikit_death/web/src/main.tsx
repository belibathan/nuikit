import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./death.css";

// Browser-only devtools (press `). Not bundled into the build the game loads.
// Not in game either: with `pnpm dev` the game loads this same page (ui_page → the dev server).
const Dev = import.meta.env.DEV && !("GetParentResourceName" in globalThis) ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
