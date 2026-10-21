import { isBrowser } from "nuikit-core";
import { useEffect } from "react";
import { Controls } from "@/components/controls";
import { InventoryPanel } from "@/components/inventory-panel";
import { ItemMenu } from "@/components/item-menu";
import { ItemTooltip } from "@/components/item-tooltip";
import { DragPreview, Hotbar, ItemNotifications } from "@/components/overlays";
import { setLocale } from "@/lib/locale";
import { copyText, send, useOx } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { addExtraMeta, applyInit, applyRefresh, applySetup, inv, sideInventory } from "@/state/inventory";
import { cancelDrag, closeTooltip, ui } from "@/state/ui";

function closeLocal() {
  cancelDrag();
  closeTooltip();
  ui.set({ menu: null, help: false, hover: null });
  inv.set({ visible: false });
}

/** Keyboard (§11): Escape keyup → exit, Shift = split mode, Ctrl+C copies a hovered serial. */
function useKeyboard() {
  useEffect(() => {
    let overlayAtKeydown = false;
    const down = (e: KeyboardEvent) => {
      if (e.key === "Shift" && !inv.get().shift) inv.set({ shift: true });
      if (e.code === "Escape") overlayAtKeydown = !!(ui.get().menu || ui.get().help);
      if (e.ctrlKey && e.code === "KeyC") {
        const h = ui.get().hover;
        const serial = h && sideInventory(h.side).items[h.slot - 1]?.metadata?.serial;
        if (serial && !(document.activeElement instanceof HTMLInputElement)) copyText(String(serial));
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "Shift") inv.set({ shift: false });
      if (e.code !== "Escape") return;
      if (overlayAtKeydown) return void (overlayAtKeydown = false); // Escape closed the menu/dialog only
      closeLocal();
      send("exit");
    };
    const blur = () => inv.get().shift && inv.set({ shift: false });
    window.addEventListener("keydown", down, true); // capture: runs before Radix closes its layer
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}

/**
 * The open area between the sheets, for nuikit_pause's inventory focus camera: posted to
 * nuikit_pause's own NUI callback (not ox_inventory's, so ox_inventory's protocol is unchanged) as
 * 0–1 screen fractions, the shape of pause:preview:frame. Measured from the sheets' layout boxes (a
 * transform doesn't move offsetLeft), on open, when the right sheet comes or goes, and on resize.
 * Nothing happens without nuikit_pause or in the browser.
 */
function useCameraFrame(visible: boolean, hasRight: boolean) {
  useEffect(() => {
    if (!visible || isBrowser()) return;
    const report = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      let left = 0;
      let right = W;
      for (const el of document.querySelectorAll<HTMLElement>("[data-slot=edge-sheet]")) {
        if (el.dataset.state !== "open") continue;
        if (el.offsetLeft < W / 2) left = Math.max(left, el.offsetLeft + el.offsetWidth);
        else right = Math.min(right, el.offsetLeft);
      }
      const gap = 1.5 * rem;
      const top = 3 * rem;
      const bottom = 6 * rem; // the bar along the bottom
      const frame = { x: (left + gap) / W, y: top / H, w: Math.max(0, right - left - 2 * gap) / W, h: Math.max(0, H - top - bottom) / H };
      void fetch("https://nuikit_pause/inventory:frame", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(frame),
      }).catch(() => {});
    };
    const id = requestAnimationFrame(report);
    window.addEventListener("resize", report);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", report);
    };
  }, [visible, hasRight]);
}

export default function App() {
  const visible = inv.use((s) => s.visible);
  const hasRight = inv.use((s) => s.right.slots > 0);

  useOx("init", (data) => {
    setLocale(data?.locale);
    applyInit(data ?? {});
  });
  useOx("setupInventory", (data) => applySetup(data));
  useOx("refreshSlots", (data) => {
    const touched = applyRefresh(data ?? {});
    const d = ui.get().drag;
    if (d && touched.some((t) => t.side === d.from.side && t.slot === d.from.slot)) cancelDrag();
  });
  useOx("closeInventory", closeLocal);
  useOx<boolean>("setInventoryVisible", (v) => (v ? inv.set({ visible: true }) : closeLocal()));
  useOx("displayMetadata", (data) => addExtraMeta(data));
  useKeyboard();
  useCameraFrame(visible, hasRight);

  useEffect(() => {
    send("uiLoaded", {});
    void loadServerTheme();
  }, []);


  return (
    <>
      {/* Two full-height edge sheets (the pause menu's backdrop): the player's on the left, the other
          inventory on the right, sliding in from their edges. The middle stays the player's. */}
      <InventoryPanel side="left" open={visible} />
      <InventoryPanel side="right" open={visible && hasRight} />
      {/* the action tray: a non-modal drawer risen from the bottom edge, between the sheets */}
      <Controls open={visible} />
      {visible && (
        // above the sheets and the tray, letting the pointer through: the tooltip and the dragged item draw on top
        <div className="pointer-events-none fixed inset-0 z-[60]" onContextMenu={(e) => e.preventDefault()}>
          <ItemTooltip />
          <ItemMenu />
          <DragPreview />
        </div>
      )}
      <Hotbar />
      <ItemNotifications />
    </>
  );
}
