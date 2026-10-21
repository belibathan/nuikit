// The frame: mounts one renderer per intent kind (the defaults from ./renderers, in the host's
// module format) and wires Escape from nuikit's surfaces to the renderer of that kind.
//
// Lua (client/intents.lua) opens a surface per kind that needs focus; Escape on it comes back as
// `nuikit:back` with the surface's name, and the top intent of that kind decides what it means.
import { fetchNui, isBrowser } from "nuikit-core";
import { INTENT_KINDS, rendererContext, type IntentKind, type IntentStore, type RendererDefinition } from "nuikit-core/intents";
import { defineSurface, onSurfaceBack, type SurfaceOptions } from "nuikit-core";
import { useEffect, useRef } from "react";
import { renderers } from "./renderers";

/** The surfaces client/intents.lua declares (mirrored for the browser's local manager). */
export const INTENT_SURFACES: Record<string, { kind: IntentKind } & SurfaceOptions> = {
  "intent:menu": { kind: "menu", layer: "panel", input: "full", escape: "back" },
  "intent:menu:cursor": { kind: "menu", layer: "panel", input: "cursor", escape: "back" },
  "intent:menu:keyboard": { kind: "menu", layer: "panel", input: "keyboard", keepInput: true, escape: "back" },
  "intent:input": { kind: "input", layer: "modal", input: "full", escape: "back" },
  "intent:confirm": { kind: "confirm", layer: "modal", input: "full", escape: "back" },
  "intent:target": { kind: "target", layer: "panel", input: "full", keepInput: true, escape: "back" },
  "intent:radial": { kind: "radial", layer: "panel", input: "full", keepInput: true, escape: "back" },
  "intent:challenge": { kind: "challenge", layer: "panel", input: "keyboard", escape: "ignore" },
};

/** Bottom → top: what draws over what when several kinds are open. */
const ORDER: IntentKind[] = ["prompt", "notify", "progress", "target", "menu", "radial", "challenge", "input", "confirm"];

export function Frame({ store }: { store: IntentStore }) {
  useEffect(() => {
    for (const [name, { kind: _kind, ...opts }] of Object.entries(INTENT_SURFACES)) defineSurface(name, opts);
    const offs = Object.entries(INTENT_SURFACES).map(([name, { kind }]) => onSurfaceBack(name, () => store.back(kind)));
    // The page (re)loaded: ask Lua for the open intents (nuikit:ready only resends surfaces and theme).
    if (!isBrowser()) void fetchNui("nuikit:intent:sync" as never).catch(() => {});
    return () => offs.forEach((off) => off());
  }, [store]);

  return (
    <div data-nk-frame className="pointer-events-none absolute inset-0 overflow-hidden">
      {ORDER.filter((k) => INTENT_KINDS.includes(k)).map((kind) => (
        <RendererMount key={kind} kind={kind} store={store} renderer={renderers[kind]} />
      ))}
    </div>
  );
}

/** Mounts a renderer module into its own element with the frame's context. */
function RendererMount({ kind, store, renderer }: { kind: IntentKind; store: IntentStore; renderer: RendererDefinition }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    // A fresh element per mount: React's StrictMode mounts twice, and a root must not be created
    // twice on one container.
    const el = document.createElement("div");
    el.className = "pointer-events-none absolute inset-0";
    host.current.appendChild(el);
    const cleanup = renderer.mount(
      el,
      rendererContext(kind, store, {
        resource: "nuikit",
        hosted: false,
        portal: document.body,
        reportError: (e) => console.error(`[nuikit] renderer ${kind}:`, e),
        // Renderers get their intents from the store, not from queued host messages: nothing waits on ready.
        ready: () => {},
      }),
    );
    return () => {
      if (typeof cleanup === "function") cleanup();
      el.remove();
    };
  }, [kind, store, renderer]);
  return <div ref={host} data-renderer={kind} className="pointer-events-none absolute inset-0" />;
}
