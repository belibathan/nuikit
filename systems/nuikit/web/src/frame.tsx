// The frame: mounts one renderer per intent kind (the defaults from ./renderers, in the host's
// module format, or a renderer pack's: ./packs) and wires Escape from nuikit's surfaces to the
// renderer of that kind.
//
// Lua (client/intents.lua) opens a surface per kind that needs focus; Escape on it comes back as
// `nuikit:back` with the surface's name, and the top intent of that kind decides what it means.
import { fetchNui, isBrowser } from "nuikit-core";
import { INTENT_KINDS, rendererContext, type IntentKind, type IntentStore, type RendererDefinition } from "nuikit-core/intents";
import { defineSurface, onSurfaceBack, type SurfaceOptions } from "nuikit-core";
import { useEffect, useReducer, useRef } from "react";
import type { PackRenderer, RendererPacks } from "./packs";
import { renderers } from "./renderers";
import { Screen } from "@/components/ui/screen";

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

/**
 * Bottom → top: what draws over what when several kinds are open. Each kind's mount gets this as
 * its z-index, so a pack's renderer (in its own shadow root under <body>) stacks like the defaults.
 */
const ORDER: IntentKind[] = ["prompt", "notify", "progress", "target", "menu", "radial", "challenge", "input", "confirm"];
export const zIndexOf = (kind: IntentKind) => ORDER.indexOf(kind) + 1;

export function Frame({ store, packs }: { store: IntentStore; packs?: RendererPacks }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    for (const [name, { kind: _kind, ...opts }] of Object.entries(INTENT_SURFACES)) defineSurface(name, opts);
    const offs = Object.entries(INTENT_SURFACES).map(([name, { kind }]) => onSurfaceBack(name, () => store.back(kind)));
    // The page (re)loaded: ask Lua for the open intents (nuikit:ready only resends surfaces and theme).
    if (!isBrowser()) void fetchNui("nuikit:intent:sync" as never).catch(() => {});
    return () => offs.forEach((off) => off());
  }, [store]);
  useEffect(() => packs?.subscribe(bump), [packs]);

  return (
    // the layout root (docs/design.md): every renderer places itself in a zone of this screen
    <Screen data-nk-frame>
      {ORDER.filter((k) => INTENT_KINDS.includes(k)).map((kind) => {
        const pack = packs?.get(kind);
        // A new key per pack (and per pack restart) remounts the kind on a swap.
        const key = pack ? `${kind}:${pack.resource}:${pack.gen}` : kind;
        return <RendererMount key={key} kind={kind} store={store} renderer={pack?.def ?? renderers[kind]} pack={pack} />;
      })}
    </Screen>
  );
}

/** Mounts a renderer module into its own element with the frame's context. */
function RendererMount({ kind, store, renderer, pack }: { kind: IntentKind; store: IntentStore; renderer: RendererDefinition; pack?: PackRenderer }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    // A fresh element per mount: React's StrictMode mounts twice, and a root must not be created
    // twice on one container. A pack's element lives in the pack's shadow root, with its CSS.
    let el: HTMLElement;
    if (pack) {
      el = pack.mountEl();
      el.style.zIndex = String(zIndexOf(kind));
    } else {
      el = document.createElement("div");
      el.className = "pointer-events-none absolute inset-0";
      host.current.appendChild(el);
    }
    const cleanup = renderer.mount(
      el,
      rendererContext(kind, store, {
        resource: pack?.resource ?? "nuikit",
        hosted: false,
        portal: pack?.portal ?? document.body,
        reportError: (e) => console.error(`[nuikit] renderer ${kind}${pack ? ` (${pack.resource})` : ""}:`, e),
        // Renderers get their intents from the store, not from queued host messages: nothing waits on ready.
        ready: () => {},
      }),
    );
    return () => {
      if (typeof cleanup === "function") cleanup();
      el.remove();
    };
  }, [kind, store, renderer, pack]);
  return <div ref={host} data-renderer={kind} data-pack={pack?.resource} className="pointer-events-none absolute inset-0" style={{ zIndex: zIndexOf(kind) }} />;
}
