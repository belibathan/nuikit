import { flipFrom } from "nuikit-core/motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ItemImage } from "@/components/item-image";
import { SlotTile } from "@/components/slot-tile";
import { t } from "@/lib/locale";
import { useOx } from "@/lib/nui";
import type { Slot } from "@/lib/types";
import { inv, itemImage, itemLabel } from "@/state/inventory";
import { onPointerMove, pointer, ui } from "@/state/ui";
import { SlotCount } from "@/components/slot-tile";

/** The item under the cursor while dragging. Positioned straight on the node, no re-render per move. */
export function DragPreview() {
  const drag = ui.use((s) => s.drag);
  const shift = inv.use((s) => s.shift);
  const amount = inv.use((s) => s.amount);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!drag) return;
    const place = () => {
      // centred on the cursor: it covers the slot it would land in, so the target's ring frames it instead of
      // reading as a second tile beside it
      if (ref.current) ref.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
    };
    place();
    return onPointerMove(place);
  }, [drag]);

  if (!drag) return null;
  const count = drag.item.count ?? 0;
  const moving = shift && count > 1 ? Math.floor(count / 2) : amount === 0 || amount > count ? count : amount;
  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[70]">
      <div className="inv-drag relative grid size-(--inv-slot-size) place-items-center">
        <ItemImage src={itemImage(drag.item)} name={drag.item.name} className="size-12" />
        <SlotCount count={count > 1 ? moving : 0} className="inv-drag-count absolute -top-2 -right-2" />
      </div>
    </div>
  );
}

/** How long an ended notice or the hotbar stays drawn for its exit (app.css inv-out, ≤ 200ms). */
const EXIT_MS = 220;

/** `toggleHotbar`: first five player slots, auto-hides after 3 s (§8). It rises in and sinks back out. */
export function Hotbar() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wasVisible = useRef(false);
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
  useEffect(() => {
    if (visible) setLeaving(false);
    else if (wasVisible.current) {
      setLeaving(true);
      const t = setTimeout(() => setLeaving(false), EXIT_MS);
      wasVisible.current = false;
      return () => clearTimeout(t);
    }
    wasVisible.current = visible;
  }, [visible]);

  if (!visible && !leaving) return null;
  const slots: Slot[] = Array.from({ length: 5 }, (_, i) => items[i] ?? { slot: i + 1 });
  return (
    <div className="nk-edge pointer-events-none fixed inset-x-0 bottom-[var(--nk-screen-edge)] flex justify-center">
      <div className="inv-hotbar flex gap-2" data-leaving={!visible || undefined}>
        {slots.map((s) => (
          <div key={s.slot} className="w-[4.5rem]">
            <SlotTile side="left" item={s} invType="player" display imagepath={imagepath} rev={rev} />
          </div>
        ))}
      </div>
    </div>
  );
}

type Note = { id: number; item: Slot; text: string; leaving?: boolean };
let seq = 0;

/** `itemNotify [item, key, count?]`: 2.5 s each, queued side by side (§8). */
export function ItemNotifications() {
  const [notes, setNotes] = useState<Note[]>([]);
  inv.use((s) => s.imagepath);
  // when one leaves (or arrives), the others glide to their new places (the notices' flip)
  const stack = useRef<HTMLDivElement>(null);
  const places = useRef(new WeakMap<Element, [number, number]>());
  useLayoutEffect(() => {
    if (stack.current) flipFrom(stack.current.children as HTMLCollectionOf<HTMLElement>, places.current, "move");
  });

  useOx<[Slot, string, number?]>("itemNotify", (data) => {
    if (!Array.isArray(data) || !data[0]) return;
    const [item, key, count] = data;
    const note = { id: ++seq, item, text: count ? `${t(key)} ${count}x` : t(key) };
    setNotes((n) => [...n, note]);
    // at 2.5 s it slides back out toward the edge, then goes
    setTimeout(() => setNotes((n) => n.map((x) => (x.id === note.id ? { ...x, leaving: true } : x))), 2500);
    setTimeout(() => setNotes((n) => n.filter((x) => x.id !== note.id)), 2500 + EXIT_MS);
  });

  if (!notes.length) return null;
  return (
    // Above the hotbar's row (edge + 4.5rem tile + 0.75rem), newest at the bottom.
    <div ref={stack} className="nk-edge pointer-events-none fixed inset-x-0 bottom-[calc(var(--nk-screen-edge)+5.25rem)] flex flex-col items-center gap-2">
      {notes.map((n) => (
        // the flip moves the wrapper, the enter and exit move the chip: the two transforms never fight
        <div key={n.id} className="inv-note" data-leaving={n.leaving || undefined}>
          <div className="nk-chip max-w-80 pl-1.5">
            <ItemImage src={itemImage(n.item)} name={n.item.name} className="size-5 shrink-0" />
            <span className="nk-num shrink-0 text-hud-foreground/70">{n.text}</span>
            <span className="truncate">{itemLabel(n.item)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
