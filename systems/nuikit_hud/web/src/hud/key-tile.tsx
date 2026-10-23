// The one HUD tile (Ink, matched to the owner's reference): a light front face, slanted, with the glyph centred
// on it, over a darker back plate offset down-right. Every tile in the HUD renders through this: the vitals,
// voice, radio and other resources' slots, the gear, the compass marks and the heading.
//
//   fill    the chip's level: a layer inside the face, clipped to it, full width, rising bottom-up (scaleY)
//   active  the face fills white and the glyph turns to the dark ink (the mic while talking, N on the compass)
//   open    the back plate slides out from behind the face (translateX only) and the label sits on it
//
// The face is the kit's Tile (components/ui/tile: its face, rim, slant, alert state); the HUD adds what the kit
// Tile doesn't have yet: a level that rises bottom-up, and a plate that slides out by translate (never scaleX,
// which would distort the slant and radius), its room FLIPped in the row (requests in .local/promote.md).
// Sizes come only from `size` (hud.css .hud-key-tile[data-size]); nothing styles a tile per element.
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";
import { flipRow } from "./flip";
import { Tile } from "@/components/ui/tile";

export interface KeyTileProps {
  /** the icon or glyph on the face */
  icon: ReactNode;
  size?: "sm" | "md";
  fill?: number;
  active?: boolean;
  /** past its threshold: the kit's alert state (danger rim, breathing), the level in the danger colour */
  alert?: boolean;
  open?: boolean;
  /** the label on the extended plate */
  children?: ReactNode;
  /** a tile in a row takes the plate's room there, its neighbours sliding aside (FLIP) */
  room?: boolean;
  /** the label's own element, for a value painted straight into the DOM (the heading) */
  labelRef?: Ref<HTMLSpanElement>;
  className?: string;
}

export function KeyTile({ icon, size = "md", fill, active, alert, open = false, children, room = false, labelRef, className }: KeyTileProps) {
  const tile = useRef<HTMLSpanElement | null>(null);
  const text = useRef<HTMLSpanElement | null>(null);
  const first = useRef(true);
  // the label is measured once per open / close or label change, never per frame
  useLayoutEffect(() => {
    const t = tile.current;
    const label = text.current;
    if (!t || !label) return;
    const w = label.offsetWidth;
    t.style.setProperty("--tw", `${w}px`);
    if (!room) return;
    if (first.current) {
      first.current = false;
      if (!open) return;
    }
    const chip = t.parentElement;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    flipRow(chip?.parentElement ?? null, () => chip?.style.setProperty("--tag-w", `${open ? (w + rem).toFixed(1) : 0}px`));
  }, [open, children, room]);
  // a label measured before the display font loaded is re-measured once it has
  useLayoutEffect(() => {
    let live = true;
    void document.fonts?.ready.then(() => {
      const t = tile.current;
      const label = text.current;
      if (!live || !t || !label) return;
      const w = label.offsetWidth;
      t.style.setProperty("--tw", `${w}px`);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (room && t.hasAttribute("data-open")) t.parentElement?.style.setProperty("--tag-w", `${(w + rem).toFixed(1)}px`);
    });
    return () => {
      live = false;
    };
  }, [room]);
  const setText = (el: HTMLSpanElement | null) => {
    text.current = el;
    if (typeof labelRef === "function") labelRef(el);
    else if (labelRef) (labelRef as { current: HTMLSpanElement | null }).current = el;
  };
  return (
    <span
      ref={tile}
      data-slot="hud-key-tile"
      data-size={size}
      data-open={open || undefined}
      data-active={active || undefined}
      data-state={alert ? "alert" : undefined}
      className={className ? `hud-key-tile ${className}` : "hud-key-tile"}
      style={fill === undefined ? undefined : ({ "--f": Math.max(0, Math.min(1, fill)).toFixed(3) } as CSSProperties)}
    >
      <span aria-hidden className="hud-key-track">
        <span className="hud-key-plate" />
      </span>
      <Tile aria-hidden className="hud-key-face" size={size === "sm" ? "sm" : "md"} shape="square" state={alert ? "alert" : undefined}>
        <span className="hud-key-level">
          {fill !== undefined && <span className="hud-key-liquid" />}
          {fill !== undefined && <span className="hud-key-line" />}
          <span className="hud-key-lit" />
        </span>
        <span className="hud-key-icon">{icon}</span>
      </Tile>
      {children !== undefined && (
        <span ref={setText} className="hud-key-label">
          {children}
        </span>
      )}
    </span>
  );
}
