import { useState } from "react";
import { Icon, isImage } from "@/lib/icon";
import { useLocale } from "@/lib/locale";
import { post, useOx } from "@/lib/nui";
import { presenceMotion } from "@/lib/motion";
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

const PER_PAGE = 6;
const STRIDE = 5; // page p starts at 5·(p−1): slot 6 becomes "More" when more items follow

/** ox_lib's radial menu (lib.addRadialItem / lib.registerRadial). Mouse only. Protocol: §6. */
export function RadialMenu() {
  const locale = useLocale();
  const [menu, setMenu] = useState<RadialData | null>(null);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const presence = usePresence(open, 100);

  useOx<RadialData | false>("openRadialMenu", (data) => {
    if (!data) return setOpen(false);
    let start = 1;
    if (data.option) {
      const i = data.items.findIndex((it) => it.menu === data.option);
      if (i >= 0) start = Math.floor(i / STRIDE) + 1; // ox uses /6 here; /5 lands on the page that holds it
    }
    setMenu(data);
    setPage(start);
    setHover(null);
    setOpen(true);
  });
  useOx<RadialItem[]>("refreshItems", (items) => setMenu((m) => (m ? { ...m, items } : m)));

  if (!presence.mounted || !menu) return null;

  const all = menu.items ?? [];
  const offset = page === 1 ? 0 : STRIDE * (page - 1);
  let slots: Array<RadialItem & { more?: boolean }> = all.length <= PER_PAGE ? all : all.slice(offset, offset + PER_PAGE);
  if (all.length > PER_PAGE && all.length > STRIDE * page + 1) {
    slots = [...slots.slice(0, STRIDE), { label: locale.more, icon: "ellipsis-h", more: true }];
  }

  const turnPage = async (delta: number) => {
    setOpen(false);
    const ok = await post<boolean>("radialTransition");
    if (ok) {
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

  // One SVG unit = 1px at 1080p: the wheel is 24rem and scales with the resolution like the rest.
  const sectors = Math.max(3, slots.length);
  const size = 384;
  const c = size / 2;
  const R = c - 1;
  const r0 = 36; // centre button
  const ri = r0 + 8; // sectors start after an 8px gap

  return (
    <div
      data-state={presence.state}
      className={cn("fixed inset-0 z-30 grid place-items-center", presenceMotion)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (page > 1 || menu.sub) center();
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-96 overflow-visible drop-shadow-[0_24px_48px_rgb(0_0_0/0.5)]">
        <circle cx={c} cy={c} r={R} className="fill-popover stroke-border" strokeWidth={1} />
        {slots.map((item, i) => {
          const a0 = (i / sectors) * Math.PI * 2 - Math.PI / 2 - Math.PI / sectors;
          const a1 = ((i + 1) / sectors) * Math.PI * 2 - Math.PI / 2 - Math.PI / sectors;
          const mid = (a0 + a1) / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const p = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
          const d = `M ${p(ri, a0)} L ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 ${large} 0 ${p(ri, a0)} Z`;
          const lx = c + ((R + ri) / 2) * Math.cos(mid);
          const ly = c + ((R + ri) / 2) * Math.sin(mid);
          const active = hover === i;
          const abs = page === 1 ? i : STRIDE * (page - 1) + i;
          const lines = wrap(item.label);
          const fs = item.label.length > 12 ? 12 : 14;
          const lh = fs + 4;
          const top = ly - (20 + 8 + lines.length * lh) / 2; // icon 20 + gap 8 + text block, centred on the ring
          return (
            <g
              key={`${page}:${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => (item.more ? void turnPage(1) : void post("radialClick", abs))}
            >
              <path d={d} className={cn("transition-colors duration-100", active ? "fill-accent" : "fill-transparent")} />
              <g className={cn("transition-colors duration-100", active ? "text-accent-foreground" : "text-popover-foreground")}>
                {isImage(item.icon) ? (
                  <image
                    href={item.icon as string}
                    x={lx - clamp(item.iconWidth) / 2}
                    y={top + 10 - clamp(item.iconHeight) / 2}
                    width={clamp(item.iconWidth)}
                    height={clamp(item.iconHeight)}
                  />
                ) : (
                  <foreignObject x={lx - 10} y={top} width={20} height={20}>
                    {/* px inside the SVG: its units already scale with the wheel */}
                    <div className={cn("grid h-full w-full place-items-center", !active && "text-muted-foreground")}>
                      <Icon icon={item.icon} style={{ width: 20, height: 20 }} />
                    </div>
                  </foreignObject>
                )}
                <text x={lx} y={top + 28 + fs - 1} textAnchor="middle" fontSize={fs} fill="currentColor" fontWeight={500}>
                  {lines.map((line, j) => (
                    <tspan key={j} x={lx} dy={j === 0 ? 0 : lh}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
        {/* hairline dividers, over the hover fill */}
        <g className="pointer-events-none stroke-border" strokeWidth={1}>
          {Array.from({ length: sectors }, (_, i) => {
            const a = (i / sectors) * Math.PI * 2 - Math.PI / 2 - Math.PI / sectors;
            return <line key={i} x1={c + ri * Math.cos(a)} y1={c + ri * Math.sin(a)} x2={c + R * Math.cos(a)} y2={c + R * Math.sin(a)} />;
          })}
        </g>
        <g className="group cursor-pointer" onClick={center}>
          <circle cx={c} cy={c} r={r0} className="fill-secondary stroke-border transition-colors group-hover:fill-accent" strokeWidth={1} />
          <foreignObject x={c - 8} y={c - 8} width={16} height={16}>
            <div className="grid h-full w-full place-items-center text-secondary-foreground">
              <Icon icon={page === 1 && !menu.sub ? "xmark" : "arrow-rotate-left"} style={{ width: 16, height: 16 }} />
            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  );
}

const clamp = (n?: number) => Math.max(0, Math.min(100, n ?? 50));

/** ~15 characters per line, on word boundaries. */
function wrap(label: string): string[] {
  const words = String(label ?? "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && (line + " " + w).length > 15) {
      lines.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines;
}
