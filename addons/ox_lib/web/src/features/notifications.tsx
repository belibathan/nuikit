import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
import { useOx } from "@/lib/nui";
import { cn } from "@/lib/utils";

/** lib.notify payload (see docs/ox-lib-protocol.md §3). */
export interface NotifyData {
  id?: string | number;
  title?: string;
  description?: string;
  duration?: number;
  showDuration?: boolean;
  position?: string;
  type?: string;
  icon?: string | [string, string];
  iconColor?: string;
  iconAnimation?: string;
  alignIcon?: "top" | "center";
  style?: CSSProperties;
}

type Position = "top-left" | "top-center" | "top-right" | "center-left" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";

interface Toast extends NotifyData {
  key: string;
  at: number;
  leaving?: boolean;
}

const MAX = 20;
const EXIT_MS = 400;

const TYPES: Record<string, { icon: string; color: string }> = {
  error: { icon: "circle-xmark", color: "var(--destructive)" },
  success: { icon: "circle-check", color: "#12b886" },
  warning: { icon: "circle-exclamation", color: "#fab005" },
  info: { icon: "circle-info", color: "var(--primary)" },
};

function normalizePosition(p?: string): Position {
  if (p === "top") return "top-center";
  if (p === "bottom") return "bottom-center";
  const valid: Position[] = ["top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"];
  return valid.includes(p as Position) ? (p as Position) : "top-right";
}

const ANCHOR: Record<Position, string> = {
  "top-left": "top-4 left-4 items-start",
  "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-4 right-4 items-end",
  "center-left": "top-1/2 left-4 -translate-y-1/2 items-start",
  "center-right": "top-1/2 right-4 -translate-y-1/2 items-end",
  "bottom-left": "bottom-4 left-4 items-start flex-col-reverse",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
  "bottom-right": "bottom-4 right-4 items-end flex-col-reverse",
};

let seq = 0;

export function Notifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = (key: string) => {
    setToasts((all) => all.map((t) => (t.key === key ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.key !== key)), EXIT_MS);
  };

  const schedule = (key: string, ms: number) => {
    clearTimeout(timers.current.get(key));
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        remove(key);
      }, ms),
    );
  };

  useOx<NotifyData>("notify", (data) => {
    if (!data || (!data.title && !data.description)) return; // ox drops empty toasts
    const duration = data.duration || 3000;
    const key = data.id !== undefined && data.id !== null ? `id:${String(data.id)}` : `n:${++seq}`;
    setToasts((all) => {
      const next: Toast = { ...data, key, at: Date.now(), leaving: false };
      const i = all.findIndex((t) => t.key === key);
      // Same id still on screen: update it in place and restart its timer.
      const list = i >= 0 ? all.map((t, j) => (j === i ? next : t)) : [...all, next];
      return list.slice(-MAX);
    });
    schedule(key, duration);
  });

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const groups = new Map<Position, Toast[]>();
  for (const t of toasts) {
    const p = normalizePosition(t.position);
    groups.set(p, [...(groups.get(p) ?? []), t]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        <div key={position} className={cn("pointer-events-none fixed z-50 flex flex-col gap-2", ANCHOR[position])}>
          {(position.startsWith("bottom") ? list : [...list].reverse()).map((t) => (
            <Notification key={t.key} toast={t} position={position} />
          ))}
        </div>
      ))}
    </>
  );
}

function Notification({ toast: t, position }: { toast: Toast; position: Position }) {
  const kind = TYPES[t.type ?? ""] ?? TYPES.info!;
  const color = t.iconColor ?? kind.color;
  const duration = t.duration || 3000;
  const showDuration = t.showDuration !== false;
  // Full class names (Tailwind only generates classes it can read in the source).
  const exit = t.leaving
    ? position.endsWith("right")
      ? "animate-out fade-out-0 duration-400 slide-out-to-right-8"
      : position.endsWith("left")
        ? "animate-out fade-out-0 duration-400 slide-out-to-left-8"
        : position.startsWith("top")
          ? "animate-out fade-out-0 duration-400 slide-out-to-top-4"
          : "animate-out fade-out-0 duration-400 slide-out-to-bottom-4"
    : position.startsWith("bottom")
      ? "animate-in fade-in-0 duration-200 slide-in-from-bottom-4"
      : "animate-in fade-in-0 duration-200 slide-in-from-top-4";

  return (
    <div
      data-state={t.leaving ? "closed" : "open"}
      className={cn("w-75 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg", exit, t.leaving && "fill-mode-forwards")}
      style={t.style}
    >
      <div className={cn("flex gap-3", t.alignIcon === "top" ? "items-start" : "items-center")}>
        <span className="relative grid size-9 shrink-0 place-items-center">
          {showDuration && (
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="16.5" fill="none" strokeWidth="2" className="stroke-border" />
              <circle
                key={t.at}
                cx="18"
                cy="18"
                r="16.5"
                fill="none"
                strokeWidth="2"
                pathLength={100}
                strokeDasharray="100"
                stroke={color}
                style={{ animation: `ox-drain ${duration}ms linear forwards` }}
              />
            </svg>
          )}
          {/* tinted badge: a 15% layer of the icon colour (no color-mix: FiveM's browser lacks it) */}
          <span className="relative grid size-7 place-items-center rounded-full" style={{ color }}>
            <span className="absolute inset-0 rounded-full opacity-15" style={{ background: color }} />
            <Icon icon={t.icon ?? kind.icon} animation={t.iconAnimation} className="relative size-3.5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          {t.title && <div className="text-sm leading-tight font-medium">{t.title}</div>}
          <Markdown className={cn("text-muted-foreground", t.title ? "mt-0.5 text-xs" : "text-sm text-foreground")}>{t.description}</Markdown>
        </div>
      </div>
    </div>
  );
}
