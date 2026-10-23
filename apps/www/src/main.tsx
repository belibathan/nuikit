import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadIdentityFonts } from "./fonts";
import { applySiteTheme } from "./lib/default-theme";
import "./index.css";

// The landing page ships in the first chunk; every other page loads on its own.
const ComponentsPage = lazy(() => import("./pages/components").then((m) => ({ default: m.ComponentsPage })));
const BlocksPage = lazy(() => import("./pages/blocks").then((m) => ({ default: m.BlocksPage })));
const ShotPage = lazy(() => import("./pages/shot").then((m) => ({ default: m.ShotPage })));
const ThemePage = lazy(() => import("./pages/theme").then((m) => ({ default: m.ThemePage })));
const DocPage = lazy(() => import("./pages/doc").then((m) => ({ default: m.DocPage })));
const StartPage = lazy(() => import("./pages/start").then((m) => ({ default: m.StartPage })));
const design = () => import("../../../docs/design.md?raw").then((m) => m.default as string);
const coverage = () => import("../../../docs/coverage.md?raw").then((m) => m.default as string);
const protocol = () => import("../../../docs/protocol.md?raw").then((m) => m.default as string);
const intents = () => import("../../../docs/intents.md?raw").then((m) => m.default as string);
const adopt = () => import("../../../docs/adopt.md?raw").then((m) => m.default as string);

// Extra pages, no router: vercel.json rewrites them to this index.html.
const pages: Record<string, () => ReactNode> = {
  "/start": () => <StartPage />,
  "/components": () => <ComponentsPage />,
  "/blocks": () => <BlocksPage />,
  "/design": () => <DocPage load={design} path="docs/design.md" />,
  "/coverage": () => <DocPage load={coverage} path="docs/coverage.md" />,
  "/protocol": () => <DocPage load={protocol} path="docs/protocol.md" />,
  "/intents": () => <DocPage load={intents} path="docs/intents.md" />,
  "/adopt": () => <DocPage load={adopt} path="docs/adopt.md" />,
  "/theme": () => <ThemePage />,
  // one block state full-viewport, for bench/blocks/shots.mjs (not linked)
  "/blocks/shot": () => <ShotPage />,
};
loadIdentityFonts();
applySiteTheme();
const path = location.pathname.replace(/\/$/, "");
// /components/<item>: one registry item's page
const page = pages[path] ?? (/^\/components\/[a-z-]+$/.test(path) ? pages["/components"] : undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{page ? <Suspense fallback={<div className="min-h-screen bg-background" />}>{page()}</Suspense> : <App />}</StrictMode>,
);
