import React, { useEffect, useRef, useState, type CSSProperties } from "react";
import { useClearOf } from "nuikit-core/react";
import { Notice, NoticeStack, noticePosition, type NoticePosition, type NoticeStatus } from "@/components/ui/notice";
import { Icon } from "@/lib/icon";
import { Markdown } from "@/lib/markdown";
import { notifyIntent } from "@/lib/intents";
import { tokenMs, tokenRaw, useLever } from "@/lib/levers";
import { useOx } from "@/lib/nui";
import { openIntent } from "@/lib/route";
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
  /**
   * nuikit extension (design v2 §4.5): an item added or removed, drawn as the item slab (tile, name,
   * delta) instead of a panel. ox_lib's Lua never sends it; a nuikit-aware script can.
   */
  item?: { name: string; count: number; image?: string; icon?: string | [string, string] };
}

interface Toast extends NotifyData {
  key: string;
  at: number;
  leaving?: boolean;
  /** how many times the same toast arrived while it was on screen (shown as ×N) */
  count: number;
}

/** ox_lib keeps at most 20 toasts on screen, across all positions (the oldest go first). */
const MAX = 20;
const EXIT_MS = 400;
/** ox_lib's default: a falsy duration means 3000 ms. */
const DEFAULT_MS = 3000;

/** The behaviour token for a notice's severity (foundation 2: `--nk-behavior-notify-{info,success,warning,danger}`). */
const SEVERITY: Record<NoticeStatus, string> = { info: "info", success: "success", warning: "warning", error: "danger" };

/**
 * How long a toast stays: the script's own duration first (ox_lib's protocol), then the ox_lib lever
 * --ox-notify-ms (ox's 3 s unless the server sets it). `--ox-notify-ms: severity` hands it to the
 * behaviour tokens instead (--nk-behavior-notify-{info,success,warning,danger}, 5 s each in the stock kit).
 */
const durationOf = (data: NotifyData) => {
  if (data.duration) return data.duration;
  if (tokenRaw("ox-notify-ms") === "severity") return tokenMs(`nk-behavior-notify-${SEVERITY[status(data.type)]}`, DEFAULT_MS);
  return tokenMs("ox-notify-ms", DEFAULT_MS);
};

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

/** Where a ×N bump re-enters from: half ox's distance, from the same side as the first entrance. */
const BUMP: Record<NoticePosition, [string, string]> = {
  "top-left": ["0rem", "-0.75rem"],
  "top-center": ["0rem", "-0.75rem"],
  "top-right": ["0rem", "-0.75rem"],
  "center-left": ["-0.75rem", "0rem"],
  "center-right": ["0.75rem", "0rem"],
  "bottom-left": ["0rem", "0.75rem"],
  "bottom-center": ["0rem", "0.75rem"],
  "bottom-right": ["0rem", "0.75rem"],
};

let seq = 0;

/** Two toasts without an id are the same when everything a player reads is the same. */
const sameToast = (a: NotifyData, b: NotifyData) =>
  a.title === b.title && a.description === b.description && status(a.type) === status(b.type) && noticePosition(a.position) === noticePosition(b.position) && !a.item && !b.item;

/** The dedupe count beside a title (reference screens: `×2` on the title's right). */
function Counted({ children, count }: { children: React.ReactNode; count: number }) {
  if (count < 2) return <>{children}</>;
  return (
    <span className="flex items-center gap-2">
      <span className="min-w-0 flex-1">{children}</span>
      {/* keyed on the count: each repeat rises in */}
      <span key={count} data-slot="notice-count" className="nk-num nk-rise shrink-0 text-(length:--nk-text-label) text-muted-foreground" aria-label={`${count} times`}>
        {`×${count}`}
      </span>
    </span>
  );
}

/**
 * ox_lib's notifications (lib.notify), drawn with the kit's Notice and NoticeStack, the
 * components behind the `notify` intent. ox_lib's own rules stay here: 3 s default, an id
 * updates in place and restarts its time, 20 on screen at most, no pause on hover (the game
 * keeps the cursor), and nothing is ever posted back to Lua. Protocol: docs/ox-lib-protocol.md §3.
 * nuikit adds two things on top (reference screens, design v2 §5D): a toast that arrives again while
 * it is still on screen (same title, description, type and position, no id) restarts the first one
 * and counts `×N` beside its title instead of stacking; and an `item` payload draws the item slab.
 */
/** One position's stack; with the ox-clear-zones lever it moves clear of other UIs' screen zones. */
function Stack({ position, clearZones, children }: { position: NoticePosition; clearZones: boolean; children: React.ReactNode }) {
  const clear = useClearOf(position);
  return (
    <NoticeStack position={position} className="ox-notify-stack" style={clearZones ? clear : undefined}>
      {children}
    </NoticeStack>
  );
}

export function Notifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // what is on screen now, for the dedupe check (a state updater may run later, on React's scheduler)
  const current = useRef<Toast[]>([]);
  current.current = toasts;

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

  const showLocal = (data: NotifyData) => {
    const duration = durationOf(data);
    const own = data.id !== undefined && data.id !== null;
    // The same toast again, still on screen: count it on the first one and restart its time.
    const dup = own ? undefined : current.current.find((t) => !t.leaving && t.key.startsWith("n:") && sameToast(t, data));
    const key = dup ? dup.key : own ? `id:${String(data.id)}` : `n:${++seq}`;
    setToasts((all) => {
      if (dup) return all.map((t) => (t.key === key ? { ...t, ...data, at: Date.now(), count: t.count + 1 } : t));
      const next: Toast = { ...data, key, at: Date.now(), leaving: false, count: 1 };
      const i = all.findIndex((t) => t.key === key);
      // Same id still on screen: update it in place and restart its timer.
      const list = i >= 0 ? all.map((t, j) => (j === i ? next : t)) : [...all, next];
      return list.slice(-MAX);
    });
    schedule(key, duration);
  };

  // Routed: the nuikit frame draws it (docs/adapters/ox-lib.md); an ox `id` replaces in place there too.
  useOx<NotifyData>("notify", (data) => {
    const props = notifyIntent(data as Record<string, unknown>);
    if (!props) return; // ox drops empty toasts
    openIntent("notify", props, { key: props.id ?? `n${++seq}`, onLocal: () => showLocal(data) });
  });

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // levers (README): where a toast without a position goes (ox's default top-right), and whether the
  // stacks move clear of other UIs' screen zones instead of the fixed --ox-notify-top-right
  const fallback = useLever("ox-notify-position", "top-right");
  const clearZones = useLever("ox-clear-zones", "0") === "1";

  // One stack per position, newest first (NoticeStack puts the newest nearest the edge).
  const groups = new Map<NoticePosition, Toast[]>();
  for (const t of toasts) {
    const p = noticePosition(t.position || fallback);
    groups.set(p, [t, ...(groups.get(p) ?? [])]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        // top-right clears the HUD block (map, location, cash: app.css --ox-notify-top-right)
        <Stack key={position} position={position} clearZones={clearZones}>
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
              title={t.title ? <Counted count={t.count}>{t.title}</Counted> : undefined}
              description={t.description ? <Counted count={t.title ? 1 : t.count}><Markdown>{t.description}</Markdown></Counted> : undefined}
              item={t.item ? { name: t.item.name, count: t.item.count, image: t.item.image, icon: t.item.icon ? <Icon icon={t.item.icon} className="size-4" /> : undefined } : undefined}
              duration={durationOf(t)}
              showDuration={t.showDuration !== false}
              pauseOnHover={false}
              iconAlign={t.alignIcon === "top" ? "start" : t.alignIcon === "center" ? "center" : undefined}
              data-state={t.leaving ? "closed" : "open"}
              animate={false}
              // a ×N bump re-enters in place (app.css .nk-bump): shorter and nearer than the first
              // entrance, in the same slot, and its time line restarts
              className={cn(
                t.leaving
                  ? cn("animate-out fade-out-0 duration-(--nk-time-fill) fill-mode-forwards", EXIT[position])
                  : t.count < 2
                    ? cn("animate-in fade-in-0 duration-(--nk-time-base) ease-(--nk-ease-expand)", ENTER[position])
                    : "nk-bump",
              )}
              style={t.count < 2 ? t.style : ({ "--ox-bump-x": BUMP[position][0], "--ox-bump-y": BUMP[position][1], ...t.style } as CSSProperties)}
            />
          ))}
        </Stack>
      ))}
    </>
  );
}
