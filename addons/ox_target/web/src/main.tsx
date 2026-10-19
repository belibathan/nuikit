import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";

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
