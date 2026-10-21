import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Notice, NoticeStack, noticePosition, type NoticePosition, type NoticeStatus } from "@/components/ui/notice";
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

interface Toast extends NotifyData {
  key: string;
  at: number;
  leaving?: boolean;
}

/** ox_lib keeps at most 20 toasts on screen, across all positions (the oldest go first). */
const MAX = 20;
const EXIT_MS = 400;
/** ox_lib's default: a falsy duration means 3000 ms. */
const DEFAULT_MS = 3000;

/** ox_lib's rule: success, error and warning pick their look; anything else (inform, info, warn…) is info. */
const status = (type?: string): NoticeStatus => (type === "success" || type === "error" || type === "warning" ? type : "info");

/** ox_lib's default icon per type, used when a script styles the icon without naming one. */
const DEFAULT_ICON: Record<NoticeStatus, string> = { error: "circle-xmark", success: "circle-check", warning: "circle-exclamation", info: "circle-info" };

/** ox_lib's exit: sideways for side positions, up or down for the centre ones (0.4 s). */
const EXIT: Record<NoticePosition, string> = {
  "top-left": "slide-out-to-left-4",
  "center-left": "slide-out-to-left-4",
  "bottom-left": "slide-out-to-left-4",
  "top-right": "slide-out-to-right-4",
  "center-right": "slide-out-to-right-4",
  "bottom-right": "slide-out-to-right-4",
  "top-center": "slide-out-to-top-2",
  "bottom-center": "slide-out-to-bottom-2",
};

/** ox_lib's enter: a 0.2 s slide of about 30px plus a fade, from above for top positions, from below for bottom ones. */
const ENTER: Record<NoticePosition, string> = {
  "top-left": "slide-in-from-top-8",
  "top-center": "slide-in-from-top-8",
  "top-right": "slide-in-from-top-8",
  "center-left": "slide-in-from-left-8",
  "center-right": "slide-in-from-right-8",
  "bottom-left": "slide-in-from-bottom-8",
  "bottom-center": "slide-in-from-bottom-8",
  "bottom-right": "slide-in-from-bottom-8",
};

let seq = 0;

/**
 * ox_lib's notifications (lib.notify), drawn with the kit's Notice and NoticeStack, the
 * components behind the `notify` intent. ox_lib's own rules stay here: 3 s default, an id
 * updates in place and restarts its time, 20 on screen at most, no pause on hover (the game
 * keeps the cursor), and nothing is ever posted back to Lua. Protocol: docs/ox-lib-protocol.md §3.
 */
export function Notifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = (key: string) => {
    setToasts((all) => all.map((t) => (t.key === key ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((all) => all.filter((t) => t.key !== key || !t.leaving)), EXIT_MS);
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
    const duration = data.duration || DEFAULT_MS;
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

  // One stack per position, newest first (NoticeStack puts the newest nearest the edge).
  const groups = new Map<NoticePosition, Toast[]>();
  for (const t of toasts) {
    const p = noticePosition(t.position);
    groups.set(p, [t, ...(groups.get(p) ?? [])]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        // top-right clears the HUD block (map, location, cash: app.css --ox-notify-top-right)
        <NoticeStack key={position} position={position} className="ox-notify-stack">
          {list.map((t) => (
            // Keyed on `at` too: an update in place restarts the time line, as ox_lib does.
            <Notice
              key={`${t.key}:${t.at}`}
              status={status(t.type)}
              // A script's icon is a Font Awesome name. Its iconColor beats the status colour, also on
              // the default icon (ox_lib's own default for the type then, so the colour has a shape).
              icon={
                t.icon || t.iconColor || t.iconAnimation ? (
                  <Icon icon={t.icon ?? DEFAULT_ICON[status(t.type)]} animation={t.iconAnimation} color={t.iconColor} className="size-4" />
                ) : undefined
              }
              title={t.title}
              description={t.description ? <Markdown>{t.description}</Markdown> : undefined}
              duration={t.duration || DEFAULT_MS}
              showDuration={t.showDuration !== false}
              pauseOnHover={false}
              iconAlign={t.alignIcon === "top" ? "start" : t.alignIcon === "center" ? "center" : undefined}
              data-state={t.leaving ? "closed" : "open"}
              animate={false}
              className={cn(
                t.leaving ? cn("animate-out fade-out-0 duration-400 fill-mode-forwards", EXIT[position]) : cn("animate-in fade-in-0 duration-200 ease-out", ENTER[position]),
              )}
              style={t.style}
            />
          ))}
        </NoticeStack>
      ))}
    </>
  );
}
