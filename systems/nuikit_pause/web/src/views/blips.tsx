// The blips: every marker GTA's own map shows, drawn on the 3D map (client/map3d.lua reads them; see
// Map3D.collectBlips). Like the pins, their positions arrive every frame the camera moves and are
// written straight onto the elements. Markers that would overlap merge into one with a count; when
// the camera is far out, short-range blips (the ones GTA keeps to the minimap's surroundings) shrink
// to dots, so the map stays readable.
import { onNui } from "nuikit-core";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { MapBlip } from "../nui";
import { blipColour, blipLook, type BlipKind, type BlipLook } from "@/lib/blips";
import { cn } from "@/lib/utils";

/** Camera distance (m) beyond which short-range blips become dots. */
export const FAR = 1600;
/** Markers closer than this (px at 1080p, scaled with the screen) merge. */
const CELL_1080 = 30;

export interface BlipChoice {
  blip: MapBlip;
  look: BlipLook;
  /** how many markers it stood for (a merged one) */
  count: number;
}

export const Blips = memo(function Blips({
  blips,
  hidden,
  selectedId,
  onChoose,
}: {
  blips: MapBlip[];
  hidden: ReadonlySet<BlipKind>;
  selectedId?: number;
  onChoose: (c: BlipChoice) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLButtonElement | null)[]>([]);
  const counts = useRef<number[]>([]);
  const looks = useMemo(() => blips.map(blipLook), [blips]);
  const [hover, setHover] = useState<number | null>(null);
  const [far, setFar] = useState(false);
  // the frame handler reads these without re-subscribing
  const state = useRef({ blips, looks, hidden, far });
  state.current = { blips, looks, hidden, far };
  const last = useRef<number[] | null>(null);

  useEffect(() => {
    const paint = (b: number[]) => {
      const el = root.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const { blips, looks, hidden, far } = state.current;
      const cell = (CELL_1080 * h) / 1080;
      // leaders first: long-range blips, then short-range; a merged marker is led by the first in
      const order = blips.map((_, i) => i).sort((a, c) => Number(blips[a]!.sr) - Number(blips[c]!.sr));
      const lead = new Map<string, number>();
      const n = new Array<number>(blips.length).fill(0);
      const shownAt = new Array<number>(blips.length).fill(-1);
      for (const i of order) {
        const x = b[i * 2] ?? -1;
        const y = b[i * 2 + 1] ?? -1;
        if (x < 0 || hidden.has(looks[i]!.kind)) continue;
        // far out, a short-range dot is small: give it a smaller cell so dots don't swallow icons
        const size = far && blips[i]!.sr ? cell * 0.6 : cell;
        const key = `${Math.floor((x * w) / size)},${Math.floor((y * h) / size)},${size === cell ? 1 : 0}`;
        const first = lead.get(key);
        if (first === undefined) {
          lead.set(key, i);
          shownAt[i] = i;
          n[i] = 1;
        } else n[first]! += 1;
      }
      for (let i = 0; i < blips.length; i++) {
        const node = els.current[i];
        if (!node) continue;
        if (shownAt[i] < 0) {
          if (node.style.visibility !== "hidden") node.style.visibility = "hidden";
          continue;
        }
        node.style.visibility = "visible";
        node.style.transform = `translate3d(${(b[i * 2]! * w).toFixed(1)}px, ${(b[i * 2 + 1]! * h).toFixed(1)}px, 0)`;
        if (counts.current[i] !== n[i]) {
          counts.current[i] = n[i]!;
          const badge = node.querySelector<HTMLElement>("[data-slot=blip-count]");
          if (badge) {
            badge.textContent = n[i]! > 1 ? String(n[i]) : "";
            badge.hidden = n[i]! <= 1;
          }
          node.dataset.count = String(n[i]);
        }
      }
    };
    const off = onNui("pause:map:pins", (p) => {
      const b = Array.isArray(p.b) ? p.b : [];
      last.current = b;
      const isFar = (p.d ?? 0) > FAR;
      if (isFar !== state.current.far) setFar(isFar);
      paint(b);
    });
    // a filter change repaints from the last positions
    if (last.current) paint(last.current);
    return off;
  }, [blips, looks, hidden, far]);

  return (
    <div ref={root} data-far={far || undefined} className="pointer-events-none absolute inset-0">
      {blips.map((b, i) => {
        const look = looks[i]!;
        const Icon = look.icon;
        const selected = b.id === selectedId;
        const open = selected || hover === b.id;
        const accent = blipColour(b.c);
        return (
          <button
            key={b.id}
            ref={(el) => void (els.current[i] = el)}
            type="button"
            data-slot="map-blip"
            data-kind={look.kind}
            data-short={b.sr || undefined}
            data-selected={selected || undefined}
            data-open={open || undefined}
            data-flash={b.flash || undefined}
            className="pause-pin-anchor pause-blip-hit pointer-events-auto outline-none"
            style={{ visibility: "hidden", zIndex: open ? 3 : b.sr ? 1 : 2 }}
            onClick={() => onChoose({ blip: b, look, count: Number(els.current[i]?.dataset.count ?? 1) })}
            onPointerEnter={() => setHover(b.id)}
            onPointerLeave={() => setHover((h) => (h === b.id ? null : h))}
            onFocus={() => setHover(b.id)}
            onBlur={() => setHover(null)}
            aria-label={look.label}
          >
            <span className="pause-pin-center">
              <span className={cn("pause-blip", accent && "pause-blip-accent")} style={accent ? ({ "--blip": accent } as CSSProperties) : undefined}>
                <Icon className="pause-blip-icon" aria-hidden />
                <span data-slot="blip-count" className="pause-blip-count nk-num" hidden />
              </span>
              <span className="pause-blip-label" aria-hidden={!open}>
                <span className="truncate">{look.label}</span>
                <span className="pause-blip-kind">{look.kindLabel}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
});
