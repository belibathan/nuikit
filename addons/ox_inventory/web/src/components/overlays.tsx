import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ItemImage } from "@/components/item-image";
import { SlotTile } from "@/components/slot-tile";
import { t } from "@/lib/locale";
import { useOx } from "@/lib/nui";
import type { Slot } from "@/lib/types";
import { inv, itemImage, itemLabel } from "@/state/inventory";
import { onPointerMove, pointer, ui } from "@/state/ui";

/** The item under the cursor while dragging. Positioned straight on the node, no re-render per move. */
export function DragPreview() {
  const drag = ui.use((s) => s.drag);
  const shift = inv.use((s) => s.shift);
  const amount = inv.use((s) => s.amount);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!drag) return;
    const place = () => {
      if (ref.current) ref.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-30%, -30%)`;
    };
    place();
    return onPointerMove(place);
  }, [drag]);

  if (!drag) return null;
  const count = drag.item.count ?? 0;
  const moving = shift && count > 1 ? Math.floor(count / 2) : amount === 0 || amount > count ? count : amount;
  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[70]">
      <div className="relative grid size-[5rem] place-items-center rounded-xl border border-primary/60 bg-card/90 inv-elev">
        <ItemImage src={itemImage(drag.item)} className="size-[3.6rem]" />
        {count > 0 && (
          <span className="absolute -top-2 -right-2 rounded-full bg-primary px-1.5 py-0.5 text-[0.68rem] leading-none font-bold text-primary-foreground tabular-nums shadow">
            {moving.toLocaleString("en-US")}x
          </span>
        )}
      </div>
    </div>
  );
}

/** `toggleHotbar`: first five player slots, auto-hides after 3 s (§8). */
export function Hotbar() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const items = inv.use((s) => s.left.items);
  const imagepath = inv.use((s) => s.imagepath);
  const rev = inv.use((s) => s.registry);

  useOx("toggleHotbar", () => {
    clearTimeout(timer.current);
    if (visible) return setVisible(false);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), 3000);
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!visible) return null;
  const slots: Slot[] = Array.from({ length: 5 }, (_, i) => items[i] ?? { slot: i + 1 });
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[4vh] flex justify-center">
      <div className="inv-hotbar-in flex gap-2 rounded-2xl border border-border/80 bg-card/95 p-2 inv-elev">
        {slots.map((s) => (
          <div key={s.slot} className="w-[5.25rem]">
            <SlotTile side="left" item={s} invType="player" display imagepath={imagepath} rev={rev} />
          </div>
        ))}
      </div>
    </div>
  );
}

type Note = { id: number; item: Slot; text: string };
let seq = 0;

/** `itemNotify [item, key, count?]`: 2.5 s each, queued side by side (§8). */
export function ItemNotifications() {
  const [notes, setNotes] = useState<Note[]>([]);
  inv.use((s) => s.imagepath);

  useOx<[Slot, string, number?]>("itemNotify", (data) => {
    if (!Array.isArray(data) || !data[0]) return;
    const [item, key, count] = data;
    const note = { id: ++seq, item, text: count ? `${t(key)} ${count}x` : t(key) };
    setNotes((n) => [...n, note]);
    setTimeout(() => setNotes((n) => n.filter((x) => x.id !== note.id)), 2500);
  });

  if (!notes.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[17vh] flex justify-center gap-2">
      {notes.map((n) => (
        <div key={n.id} className="inv-pop w-[6.5rem] overflow-hidden rounded-xl border border-border/80 bg-card/95 inv-elev">
          <div className="bg-primary px-2 py-1 text-center text-[0.68rem] leading-tight font-semibold text-primary-foreground">{n.text}</div>
          <div className="grid h-[4.5rem] place-items-center p-2">
            <ItemImage src={itemImage(n.item)} className="size-[3.5rem]" />
          </div>
          <div className="truncate px-2 pb-1.5 text-center text-[0.68rem] font-medium">{itemLabel(n.item)}</div>
        </div>
      ))}
    </div>
  );
}
