import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { isBrowser } from "nuikit-core";
import "./pause.css"; // imports index.css first

// the browser preview stands in for GTA's world blur (pause.css: html[data-browser])
if (isBrowser()) document.documentElement.dataset.browser = "";

// Browser-only devtools (press `). Not bundled into the build the game loads.
const Dev = import.meta.env.DEV ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
