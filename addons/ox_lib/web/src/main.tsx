import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { installLevers } from "./lib/levers";
import App from "./App";
import "./app.css";

// Browser-only fixtures (press `). Not bundled into the build the game loads.
const Dev = import.meta.env.DEV ? lazy(() => import("./dev")) : () => null;

// --ox-density and --ox-motion from the server theme (lib/levers.ts)
installLevers("ox");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
