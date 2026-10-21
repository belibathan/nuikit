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
      <div className="inv-drag relative grid size-[5.5rem] place-items-center">
        <ItemImage src={itemImage(drag.item)} className="size-12" />
        {count > 1 && (
          <span className="inv-drag-count nk-num absolute -top-2 -right-2 grid h-6 min-w-6 place-items-center px-1.5 text-sm leading-none font-semibold">
            {moving.toLocaleString("en-US")}
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
    <div className="nk-edge pointer-events-none fixed inset-x-0 bottom-[var(--nk-edge)] flex justify-center">
      <div className="nk-enter flex gap-2">
        {slots.map((s) => (
          <div key={s.slot} className="w-[4.5rem]">
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
    // Above the hotbar's row (edge + 4.5rem tile + 0.75rem), newest at the bottom.
    <div className="nk-edge pointer-events-none fixed inset-x-0 bottom-[calc(var(--nk-edge)+5.25rem)] flex flex-col items-center gap-2">
      {notes.map((n) => (
        <div key={n.id} className="nk-chip nk-enter max-w-80 pl-1.5">
          <ItemImage src={itemImage(n.item)} className="size-5 shrink-0" />
          <span className="nk-num shrink-0 text-hud-foreground/70">{n.text}</span>
          <span className="truncate">{itemLabel(n.item)}</span>
        </div>
      ))}
    </div>
  );
}
