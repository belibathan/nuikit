// Browser preview (`{{pm}} dev`): mounts the pack's renderers the way nuikit's frame does, with
// the devtools (press `) to open intents. In game this page isn't used: the frame loads
// web/dist/renderers.js (see src/renderers.tsx).
import { createIntentStore, rendererContext, type RendererDefinition } from "nuikit-core/intents";
import { StrictMode, Suspense, lazy, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { defineReactRenderer } from "nuikit-core/intents-react";
import { NotifyRenderer } from "./renderers/notify";
import "./index.css";

const store = createIntentStore();
const renderers: RendererDefinition[] = [defineReactRenderer({ kind: "notify", Component: NotifyRenderer })];

function Mount({ renderer }: { renderer: RendererDefinition }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.className = "pointer-events-none absolute inset-0";
    host.current!.appendChild(el);
    const cleanup = renderer.mount(el, rendererContext(renderer.kind, store, { resource: "preview", hosted: false, portal: document.body, reportError: console.error, ready: () => {} }));
    return () => {
      if (typeof cleanup === "function") cleanup();
      el.remove();
    };
  }, [renderer]);
  return <div ref={host} className="pointer-events-none absolute inset-0" />;
}

const Dev = import.meta.env.DEV ? lazy(() => import("./dev")) : () => null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {renderers.map((r) => (
      <Mount key={r.kind} renderer={r} />
    ))}
    <Suspense>
      <Dev />
    </Suspense>
  </StrictMode>,
);
