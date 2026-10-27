/**
 * nuikit-core/boot: the ui_page of a resource that also ships a host module (docs/host.md).
 *
 * FiveM always creates the resource's NUI frame when it has a ui_page. While the nuikit host
 * renders the resource's module, that frame stays an empty page: this file is all it loads.
 * When the host isn't running (or stops), it loads the full app instead.
 *
 *   // src/main.tsx
 *   import { standalone } from "nuikit-core/boot";
 *   standalone(() => import("./standalone"));
 *
 * No imports on purpose: anything imported here is paid for by every hosted resource.
 */

interface BootWindow {
  GetParentResourceName?: () => string;
  invokeNative?: unknown;
}

/** Load `app` unless the nuikit host is rendering this resource's module. */
export function standalone(app: () => Promise<unknown>, options: { timeout?: number } = {}): void {
  const w = window as unknown as BootWindow;
  const inGame = typeof w.GetParentResourceName === "function" || !!w.invokeNative;
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    void app();
  };
  if (!inGame) return load();

  window.addEventListener("message", (e: MessageEvent) => {
    if (e.source != null && e.source !== window.parent && e.source !== window) return; // SendNUIMessage comes from the root page (protocol §5.1)
    const action = (e.data as { action?: unknown } | null)?.action;
    // The host stopped: render here instead.
    if (action === "nuikit:host:fallback") load();
    // The host started after this page loaded the app: drop it (the host renders it now).
    if (action === "nuikit:host:adopted" && loaded) location.reload();
  });

  // nuikit.lua answers nuikit:host:mode; an older nuikit.lua (or none) never does: load anyway.
  const timer = setTimeout(load, options.timeout ?? 1500);
  fetch(`https://${w.GetParentResourceName!()}/nuikit:host:mode`, { method: "POST", body: "{}" })
    .then((r) => r.json())
    .then((mode: { hosted?: boolean }) => {
      clearTimeout(timer);
      if (!mode?.hosted) load();
      else if (loaded) location.reload(); // answered after the timeout: the host has it
    })
    .catch(() => {
      clearTimeout(timer);
      load();
    });
}
