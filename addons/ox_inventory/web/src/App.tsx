import { useEffect, useState } from "react";
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

/** Mounted while open and for one exit after it closes (the motion ladder's exit time). */
function useExit(open: boolean) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) return setMounted(true);
    const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nk-time")) || 140;
    const id = setTimeout(() => setMounted(false), ms * 1.5);
    return () => clearTimeout(id);
  }, [open]);
  return { mounted: open || mounted, closing: !open && mounted };
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

  useEffect(() => {
    send("uiLoaded", {});
    void loadServerTheme();
  }, []);

  // The bar outlives `visible` by its exit, so it leaves with the sheets (Radix keeps those mounted itself).
  const bar = useExit(visible);

  return (
    <>
      {/* Two full-height edge sheets (the pause menu's backdrop): the player's on the left, the other
          inventory on the right, sliding in from their edges. The middle stays the player's. */}
      <InventoryPanel side="left" open={visible} />
      <InventoryPanel side="right" open={visible && hasRight} />
      {bar.mounted && (
        // above the sheets (z-40), letting the pointer through to them: the tooltip and the dragged item draw on top
        <div className="pointer-events-none fixed inset-0 z-50" onContextMenu={(e) => e.preventDefault()} data-closing={bar.closing || undefined}>
          <div className="nk-anchor-b pointer-events-auto">
            <Controls closing={bar.closing} />
          </div>
          {visible && (
            <>
              <ItemTooltip />
              <ItemMenu />
              <DragPreview />
            </>
          )}
        </div>
      )}
      <Hotbar />
      <ItemNotifications />
    </>
  );
}
