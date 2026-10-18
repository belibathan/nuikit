import { useState } from "react";
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

  const sectors = Math.max(3, slots.length);
  const size = 350;
  const c = size / 2;
  const R = 175;
  const r0 = 34;

  return (
    <div
      data-state={presence.state}
      className="fixed inset-0 z-30 grid place-items-center data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      onContextMenu={(e) => {
        e.preventDefault();
        if (page > 1 || menu.sub) center();
      }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size * 1.1} height={size * 1.1} className="overflow-visible">
        <circle cx={c} cy={c} r={R} className="fill-popover/90 stroke-border" strokeWidth={1} />
        {slots.map((item, i) => {
          const a0 = (i / sectors) * Math.PI * 2 - Math.PI / 2 - Math.PI / sectors;
          const a1 = ((i + 1) / sectors) * Math.PI * 2 - Math.PI / 2 - Math.PI / sectors;
          const mid = (a0 + a1) / 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const p = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`;
          const d = `M ${p(r0 + 6, a0)} L ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r0 + 6, a1)} A ${r0 + 6} ${r0 + 6} 0 ${large} 0 ${p(r0 + 6, a0)} Z`;
          const lx = c + (R * 0.62) * Math.cos(mid);
          const ly = c + (R * 0.62) * Math.sin(mid);
          const active = hover === i;
          const abs = page === 1 ? i : STRIDE * (page - 1) + i;
          const lines = wrap(item.label);
          const fs = item.label.length > 20 ? 10 : item.label.length > 15 ? 12 : 13;
          return (
            <g
              key={`${page}:${i}`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onClick={() => (item.more ? void turnPage(1) : void post("radialClick", abs))}
            >
              <path d={d} className={cn("stroke-border transition-colors", active ? "fill-primary" : "fill-transparent")} strokeWidth={1} />
              <g className={cn("transition-colors", active ? "text-primary-foreground" : "text-foreground")}>
                {isImage(item.icon) ? (
                  <image
                    href={item.icon as string}
                    x={lx - clamp(item.iconWidth) / 2}
                    y={ly - clamp(item.iconHeight) / 2 - 12}
                    width={clamp(item.iconWidth)}
                    height={clamp(item.iconHeight)}
                  />
                ) : (
                  <foreignObject x={lx - 16} y={ly - 30} width={32} height={32}>
                    <div className="grid size-8 place-items-center">
                      <Icon icon={item.icon} className="size-7" />
                    </div>
                  </foreignObject>
                )}
                <text x={lx} y={ly + 16} textAnchor="middle" fontSize={fs} fill="currentColor" className="font-medium">
                  {lines.map((line, j) => (
                    <tspan key={j} x={lx} dy={j === 0 ? 0 : fs + 2}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            </g>
          );
        })}
        <g className="cursor-pointer" onClick={center}>
          <circle cx={c} cy={c} r={r0} className="fill-primary stroke-popover transition-opacity hover:opacity-90" strokeWidth={4} />
          <foreignObject x={c - 12} y={c - 12} width={24} height={24}>
            <div className="grid size-6 place-items-center text-primary-foreground">
              <Icon icon={page === 1 && !menu.sub ? "xmark" : "arrow-rotate-left"} className="size-5" />
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
