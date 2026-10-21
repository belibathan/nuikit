import { onTheme } from "nuikit-core";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Kbd } from "@/components/ui/kbd";
import { Icon, isImage } from "@/lib/icon";
import { useLocale } from "@/lib/locale";
import { post, useOx } from "@/lib/nui";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

interface RadialItem {
  label: string;
  icon: string | [string, string];
  menu?: string;
  iconWidth?: number;
  iconHeight?: number;
}

interface RadialData {
  items: RadialItem[];
  sub?: boolean;
  option?: string;
}

type Slot = RadialItem & { more?: boolean };
/** What the pointer is over: a slot index, the centre hub, or nothing. */
type Hit = number | "hub" | null;

const PER_PAGE = 6;
const STRIDE = 5; // page p starts at 5·(p−1): slot 6 becomes "More" when more items follow

/*
 * The wheel, in SVG units. One unit is 1px at 1080p: the SVG is 27rem wide and the viewBox 432, so it
 * scales with the resolution like the rest of the kit (and so does everything inside a foreignObject,
 * which is why the type in app.css's .ox-radial-* classes is in px, not rem).
 */
const SIZE = 432;
const C = SIZE / 2;
const R = 206; // outer edge of the ring (room for the hairline and the selected glow)
const RI = 86; // inner edge of the ring
const HUB = 68; // the centre hub
const GAP = 6; // constant-width gap between segments
const REACH = R + 48; // the pointer still picks a segment a little outside the ring

/** The theme's shape language, read from its tokens (never from the identity's name). */
interface Shape {
  /** Corner size in units, 0 for sharp. */
  corner: number;
  /** "cut": chamfer the leading-outer and trailing-inner corners (nk-clip's two corners); "round": round all four. */
  kind: "cut" | "round";
}

/** A token length (0.75rem, 6px) in SVG units (1rem = 16 units). */
function units(value: string): number {
  const m = /^\s*(-?[\d.]+)\s*(rem|px)?\s*$/.exec(value);
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2] === "rem" ? n * 16 : n;
}

function readShape(): Shape {
  const css = getComputedStyle(document.documentElement);
  const cut = units(css.getPropertyValue("--nk-cut"));
  // chips and tiles take half the panel chamfer (nk-clip-sm); a segment is about chip-sized
  if (cut > 0) return { kind: "cut", corner: cut / 2 + 4 };
  // controls are radius − 2px (docs/design.md); keep it inside the ring's thickness
  const radius = units(css.getPropertyValue("--radius"));
  return { kind: "round", corner: Math.max(0, Math.min(16, radius - 2)) };
}

function useShape(): Shape {
  const [shape, setShape] = useState<Shape>(() => readShape());
  useEffect(() => onTheme(() => setShape(readShape())), []);
  return shape;
}

const pt = (r: number, a: number) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
/** Angle offset that keeps a constant GAP/2 between the segment's edge and the spoke at radius r. */
const off = (r: number) => Math.asin(Math.min(1, GAP / 2 / r));

/**
 * One annular segment between angles a0 and a1 (clockwise), with a constant-width gap to its
 * neighbours and its corners cut or rounded by the theme's shape.
 */
function segmentPath(a0: number, a1: number, shape: Shape): string {
  const k = Math.min(shape.corner, (R - RI) / 3);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  // corner flags: [outer-start, outer-end, inner-end, inner-start]
  const on = shape.kind === "cut" ? [true, false, true, false] : [true, true, true, true];
  const ko = (i: number) => (k > 0 && on[i] ? k : 0);
  const join = (corner: string, to: string, i: number) => (ko(i) ? (shape.kind === "cut" ? `L ${to}` : `Q ${corner} ${to}`) : "");

  const os = a0 + off(R);
  const oe = a1 - off(R);
  const is = a0 + off(RI);
  const ie = a1 - off(RI);
  return [
    `M ${pt(RI + ko(3), a0 + off(RI + ko(3)))}`,
    `L ${pt(R - ko(0), a0 + off(R - ko(0)))}`,
    join(pt(R, os), pt(R, os + ko(0) / R), 0),
    `A ${R} ${R} 0 ${large} 1 ${pt(R, oe - ko(1) / R)}`,
    join(pt(R, oe), pt(R - ko(1), a1 - off(R - ko(1))), 1),
    `L ${pt(RI + ko(2), a1 - off(RI + ko(2)))}`,
    join(pt(RI, ie), pt(RI, ie - ko(2) / RI), 2),
    `A ${RI} ${RI} 0 ${large} 0 ${pt(RI, is + ko(3) / RI)}`,
    join(pt(RI, is), pt(RI + ko(3), a0 + off(RI + ko(3))), 3),
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
}

/** ox_lib's radial menu (lib.addRadialItem / lib.registerRadial). Mouse only. Protocol: §6. */
export function RadialMenu() {
  const locale = useLocale();
  const shape = useShape();
  const [menu, setMenu] = useState<RadialData | null>(null);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<Hit>(null);
  // Which way the wheel arrives: deeper (a submenu, the next page) or back out (a parent, the previous page).
  const [dir, setDir] = useState<"in" | "out">("in");
  const svg = useRef<SVGSVGElement>(null);
  const presence = usePresence(open, 100);

  useOx<RadialData | false>("openRadialMenu", (data) => {
    if (!data) return setOpen(false);
    let start = 1;
    if (data.option) {
      const i = data.items.findIndex((it) => it.menu === data.option);
      if (i >= 0) start = Math.floor(i / STRIDE) + 1; // ox uses /6 here; /5 lands on the page that holds it
    }
    setDir(data.option ? "out" : "in");
    setMenu(data);
    setPage(start);
    setHover(null);
    setOpen(true);
  });
  useOx<RadialItem[]>("refreshItems", (items) => setMenu((m) => (m ? { ...m, items } : m)));

  if (!presence.mounted || !menu) return null;

  const all = menu.items ?? [];
  const offset = page === 1 ? 0 : STRIDE * (page - 1);
  let slots: Slot[] = all.length <= PER_PAGE ? all : all.slice(offset, offset + PER_PAGE);
  if (all.length > PER_PAGE && all.length > STRIDE * page + 1) {
    slots = [...slots.slice(0, STRIDE), { label: locale.more, icon: "ellipsis-h", more: true }];
  }
  const pages = all.length <= PER_PAGE ? 1 : Math.ceil((all.length - 1) / STRIDE);
  const canBack = page > 1 || !!menu.sub;

  const turnPage = async (delta: number) => {
    setOpen(false);
    const ok = await post<boolean>("radialTransition");
    if (ok) {
      setDir(delta > 0 ? "in" : "out");
      setPage((p) => p + delta);
      setHover(null);
      setOpen(true);
    }
  };

  const center = () => {
    if (page > 1) return void turnPage(-1);
    if (menu.sub) return void post("radialBack");
    setOpen(false);
    void post("radialClose");
  };

  const choose = (i: number) => {
    const item = slots[i];
    if (!item) return;
    if (item.more) return void turnPage(1);
    void post("radialClick", page === 1 ? i : STRIDE * (page - 1) + i);
  };

  const sectors = Math.max(3, slots.length);
  const step = (Math.PI * 2) / sectors;
  const start = (i: number) => i * step - Math.PI / 2 - step / 2; // slot 0 is centred at 12 o'clock

  // Hit-testing by angle and distance from the centre, not by the shapes: no dead zone in the gaps
  // between segments or around the labels, and what's lit is exactly what a click picks.
  const hitAt = (e: ReactPointerEvent | React.MouseEvent): Hit => {
    const box = svg.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    const k = SIZE / box.width;
    const dx = (e.clientX - (box.left + box.width / 2)) * k;
    const dy = (e.clientY - (box.top + box.height / 2)) * k;
    const d = Math.hypot(dx, dy);
    if (d <= HUB + GAP) return "hub";
    if (d > REACH) return null;
    let a = Math.atan2(dy, dx) + Math.PI / 2 + step / 2;
    a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const i = Math.floor(a / step);
    return i < slots.length ? i : null;
  };

  const lit = typeof hover === "number" ? slots[hover] : undefined;
  const hubCaption = lit ? (lit.more ? "Next page" : lit.menu ? "Opens menu" : undefined) : canBack ? "Back" : "Close";

  return (
    <div
      data-state={presence.state}
      data-hub={hover === "hub" || undefined}
      className="ox-radial fixed inset-0 z-30 grid place-items-center data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100 data-[state=closed]:fill-mode-forwards"
      onPointerMove={(e) => setHover(hitAt(e))}
      onPointerLeave={() => setHover(null)}
      onClick={(e) => {
        const hit = hitAt(e);
        if (hit === "hub") center();
        else if (typeof hit === "number") choose(hit);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (page > 1 || menu.sub) center();
      }}
    >
      <div key={`${page}:${presence.state === "open"}`} data-dir={dir} className="ox-radial-wheel relative">
        <svg ref={svg} viewBox={`0 0 ${SIZE} ${SIZE}`} className={cn("ox-radial-svg block size-[27rem] overflow-visible", hover !== null && "cursor-pointer")}>
          {Array.from({ length: sectors }, (_, i) => {
            const item = slots[i];
            const a0 = start(i);
            const a1 = a0 + step;
            const mid = a0 + step / 2;
            const active = hover === i;
            const lx = C + ((R + RI) / 2) * Math.cos(mid);
            const ly = C + ((R + RI) / 2) * Math.sin(mid);
            // the label box: as wide as the segment allows at its middle radius, at most 124 units
            const w = Math.min(124, 2 * ((R + RI) / 2) * Math.sin(step / 2) - 16);
            const h = R - RI - 20;
            const label = item?.label ?? "";
            return (
              <g key={i} data-slot="radial-segment" data-active={active || undefined} data-empty={!item || undefined}>
                <path d={segmentPath(a0, a1, shape)} className="ox-radial-seg" />
                {item && (
                  <foreignObject x={lx - w / 2} y={ly - h / 2} width={w} height={h} className="pointer-events-none">
                    <div className="ox-radial-item">
                      {isImage(item.icon) ? (
                        <img
                          src={item.icon as string}
                          alt=""
                          style={{ width: Math.min(48, clamp(item.iconWidth)), height: Math.min(48, clamp(item.iconHeight)) }}
                          className="object-contain"
                        />
                      ) : (
                        <Icon icon={item.icon} className="ox-radial-icon" />
                      )}
                      <span className="ox-radial-label" data-long={label.length > 22 ? "2" : label.length > 15 ? "1" : undefined}>
                        {label}
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* the hub: the lit item's name, or what a click here does (close, back) */}
          <g data-slot="radial-hub" data-active={hover === "hub" || undefined}>
            <circle cx={C} cy={C} r={HUB} className="ox-radial-hub" />
            <foreignObject x={C - HUB + 10} y={C - HUB + 10} width={(HUB - 10) * 2} height={(HUB - 10) * 2} className="pointer-events-none">
              <div className="ox-radial-hub-content">
                {lit ? (
                  <span className="ox-radial-hub-title">{lit.label}</span>
                ) : (
                  <Icon icon={canBack ? "arrow-left" : "xmark"} className="ox-radial-hub-icon" />
                )}
                {hubCaption && <span className="ox-radial-hub-caption">{hubCaption}</span>}
                {!lit && pages > 1 && <span className="ox-radial-hub-page nk-num">{`${page} / ${pages}`}</span>}
              </div>
            </foreignObject>
          </g>
        </svg>

        {/* key hints along the bottom, the pause menu's chips */}
        <div data-slot="radial-hints" className="absolute top-full left-1/2 mt-6 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
          <span className="nk-chip">
            <Kbd>LMB</Kbd>
            Select
          </span>
          {canBack && (
            <span className="nk-chip">
              <Kbd>RMB</Kbd>
              Back
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const clamp = (n?: number) => Math.max(0, Math.min(100, n ?? 50));
