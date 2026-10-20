import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ComponentsPage } from "./pages/components";
import { DocPage } from "./pages/doc";
import { ThemePage } from "./pages/theme";
import design from "../../../docs/design.md?raw";
import coverage from "../../../docs/coverage.md?raw";
import "./index.css";

// Extra pages, no router: vercel.json rewrites them to this index.html.
const pages: Record<string, () => ReactNode> = {
  "/components": () => <ComponentsPage />,
  "/design": () => <DocPage source={design} path="docs/design.md" />,
  "/coverage": () => <DocPage source={coverage} path="docs/coverage.md" />,
  "/theme": () => <ThemePage />,
};
const page = pages[location.pathname.replace(/\/$/, "")];

createRoot(document.getElementById("root")!).render(<StrictMode>{page ? page() : <App />}</StrictMode>);
