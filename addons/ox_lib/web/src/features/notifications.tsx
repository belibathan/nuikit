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

// The icon is the state, so it carries the colour: the theme's status tokens (docs/tokens.md).
const TYPES: Record<string, { icon: string; color?: string }> = {
  error: { icon: "circle-xmark", color: "var(--destructive)" },
  success: { icon: "circle-check", color: "var(--success)" },
  warning: { icon: "circle-exclamation", color: "var(--warning)" },
  info: { icon: "circle-info", color: "var(--info)" },
};

function normalizePosition(p?: string): Position {
  if (p === "top") return "top-center";
  if (p === "bottom") return "bottom-center";
  const valid: Position[] = ["top-left", "top-center", "top-right", "center-left", "center-right", "bottom-left", "bottom-center", "bottom-right"];
  return valid.includes(p as Position) ? (p as Position) : "top-right";
}

// --nk-edge (1.5rem) from the screen edge.
const ANCHOR: Record<Position, string> = {
  "top-left": "top-6 left-6 items-start",
  "top-center": "top-6 left-1/2 -translate-x-1/2 items-center",
  "top-right": "top-6 right-6 items-end",
  "center-left": "top-1/2 left-6 -translate-y-1/2 items-start",
  "center-right": "top-1/2 right-6 -translate-y-1/2 items-end",
  "bottom-left": "bottom-6 left-6 items-start flex-col-reverse",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2 items-center flex-col-reverse",
  "bottom-right": "bottom-6 right-6 items-end flex-col-reverse",
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
      ? "animate-out fade-out-0 duration-400 slide-out-to-right-4"
      : position.endsWith("left")
        ? "animate-out fade-out-0 duration-400 slide-out-to-left-4"
        : position.startsWith("top")
          ? "animate-out fade-out-0 duration-400 slide-out-to-top-2"
          : "animate-out fade-out-0 duration-400 slide-out-to-bottom-2"
    : position.startsWith("bottom")
      ? "animate-in fade-in-0 duration-200 slide-in-from-bottom-2"
      : "animate-in fade-in-0 duration-200 slide-in-from-top-2";

  return (
    <div
      data-state={t.leaving ? "closed" : "open"}
      className={cn("nk-panel relative w-80 overflow-hidden", exit, t.leaving && "fill-mode-forwards")}
      style={t.style}
    >
      <div className={cn("flex gap-3 px-4 py-3", (t.alignIcon ?? (t.title && t.description ? "top" : "center")) === "top" ? "items-start" : "items-center")}>
        <span className={cn("grid h-5 shrink-0 place-items-center", !color && "text-muted-foreground")} style={color ? { color } : undefined}>
          <Icon icon={t.icon ?? kind.icon} animation={t.iconAnimation} className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {t.title && <div className="text-sm leading-5 font-medium">{t.title}</div>}
          <Markdown className={t.title ? "nk-label mt-0.5 font-normal" : "text-sm leading-5"}>{t.description}</Markdown>
        </div>
      </div>
      {showDuration && (
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5">
          <div key={t.at} className="h-full w-full bg-muted-foreground opacity-40" style={{ transformOrigin: "left", animation: `ox-shrink ${duration}ms linear forwards` }} />
        </div>
      )}
    </div>
  );
}
