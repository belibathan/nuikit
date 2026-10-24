import { useEffect, useRef, useState } from "react";
import { withKeys } from "@/components/ui/text";
import { flushSync } from "react-dom";
import { Kbd } from "@/components/ui/kbd";
import { Meter } from "@/components/ui/meter";
import { ProgressRing } from "@/components/ui/progress-ring";
import { progressIntent } from "@/lib/intents";
import { post, useOx } from "@/lib/nui";
import { openIntent, type Handle } from "@/lib/route";
import { presenceMotion } from "@/lib/motion";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

const EXIT_MS = 100;

/**
 * The one rule that matters (docs/ox-lib-protocol.md §9.2): post `progressComplete` only once the
 * hide transition has finished. Lua judges success by elapsed time, so posting early fails the run.
 * Like ox_lib, it's posted after every hide, including a cancel.
 *
 * The clock is a timer over `duration`, never the fill animation: with reduced motion
 * (html[data-nk-motion="off"], from the player's prefs via loadServerTheme) kit.css forces every
 * animation to 0s, so an animationend clock would post at once and Lua would fail the run.
 */
function useRun() {
  const [run, setRun] = useState<{ id: number; duration: number; label?: string; position?: string; canCancel?: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const id = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const presence = usePresence(open, EXIT_MS, () => void post("progressComplete"));
  useEffect(() => () => clearTimeout(timer.current), []);
  const start = (duration: number, label?: string, position?: string, canCancel?: boolean) => {
    const ms = Math.max(0, Number(duration) || 0);
    clearTimeout(timer.current);
    // Commit "open" now. The message that starts a run isn't a React event, so React would render
    // it later, on its scheduler; a short run's own timer can fire first, and open → true → false
    // then batch into one render where it never opened: usePresence has nothing to exit and
    // progressComplete is never posted (Lua waits for a cancel). flushSync makes every run, 0 ms
    // included, open for at least one commit before it can close.
    flushSync(() => {
      setRun({ id: ++id.current, duration: ms, label, position, canCancel });
      setOpen(true);
    });
    timer.current = setTimeout(() => setOpen(false), ms);
  };
  const stop = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };
  // Routed (docs/adapters/ox-lib.md §3): the frame times the run and resolves true at `duration`;
  // progressComplete follows ~100 ms later, as after the local hide. Cancelling stays with ox's Lua
  // (progressCancel), after which progressComplete is posted the same way.
  const routed = useRef<Handle | null>(null);
  const complete = () => setTimeout(() => void post("progressComplete"), EXIT_MS);
  const route = (props: ReturnType<typeof progressIntent>, local: () => void) => {
    const handle = openIntent("progress", props, {
      key: "progress",
      onEnd: (a) => {
        if (routed.current?.id === a.id) routed.current = null;
        if (a.result === true || a.reason === "stopped") complete();
      },
      onLocal: local,
    });
    if (handle) routed.current = handle;
    return handle;
  };
  const cancel = (local: () => void) => {
    if (!routed.current) return local();
    routed.current.cancel();
    routed.current = null;
    complete();
  };
  return { run, open, start, stop, presence, routed, route, cancel };
}

/**
 * lib.progressBar: the progress slab (design v2 §4.5, reference screens): the label, the percentage
 * and, when the run can be cancelled, the cancel key chip over a thin line. ox_lib's `progress`
 * carries only `label` and `duration`; `canCancel` is a nuikit extension (ox_lib's Lua keeps it to
 * itself: X cancels through its own key mapping, so the chip only names that key).
 */
export function ProgressBar() {
  const { run, open, start, stop, presence, route, cancel } = useRun();
  useOx<{ label?: string; duration: number; canCancel?: boolean }>("progress", (d) => route(progressIntent(d, "bar"), () => start(d.duration, d.label, undefined, d.canCancel)));
  useOx("progressCancel", () => cancel(stop));
  // The percentage, written straight to its text node (as the circle's counter is): a React render
  // per tick would cost more than the line's own compositor animation.
  const pct = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open || !run) return;
    const at = Date.now();
    const show = (p: number) => {
      const text = pct.current?.firstChild;
      if (text) text.nodeValue = `${p}%`;
    };
    show(0);
    const t = setInterval(() => show(Math.min(100, Math.floor(((Date.now() - at) / Math.max(1, run.duration)) * 100))), Math.max(16, run.duration / 100));
    return () => clearInterval(t);
  }, [open, run]);

  if (!presence.mounted || !run) return null;
  // The kit's Meter in its timed mode: it fills over `duration` as one compositor animation (at
  // every motion level). That is only the picture; useRun's timer decides when the run ends, and
  // Meter's onComplete is not used.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex h-[20%] items-center justify-center">
      <div
        data-slot="progress-slab"
        data-state={presence.state}
        // the baseline: the HUD plate, the label voice, the percentage in the numeric voice, a key tile, a solid fill
        className={cn("nk-slab-stack gap-(--nk-space-3) rounded-(--nk-slab-radius) bg-(--nk-slab-bg) p-(--nk-space-4) text-(--nk-slab-fg) shadow-[inset_0_0_0_var(--nk-line-width)_var(--nk-slab-border)]", presenceMotion)}
      >
        <div className="nk-slab-stack-row">
          <span data-slot="progress-label" className="truncate">{withKeys(run.label)}</span>
          <span ref={pct} data-slot="progress-percent" className="nk-num" aria-hidden>
            0%
          </span>
          {run.canCancel && (
            <Kbd aria-label="Press X to cancel">X</Kbd>
          )}
        </div>
        <Meter key={run.id} size="sm" track="game" duration={run.duration} aria-label={run.label || "Progress"} />
      </div>
    </div>
  );
}

/** lib.progressCircle */
export function ProgressCircle() {
  const { run, open, start, stop, presence, routed, route, cancel } = useRun();
  // ox's counter, written straight to the text node: it ticks every duration/100 ms, and a React
  // render per tick would cost more than the ring itself (one compositor animation).
  const pct = useRef(0);
  const counter = useRef<HTMLSpanElement>(null);
  const show = (p: number) => {
    pct.current = p;
    // the text node React made, so a later render finds its own node (and the same text); the % is its own span
    const text = counter.current?.firstChild;
    if (text) text.nodeValue = `${p}`;
  };

  useOx<{ duration: number; position?: "middle" | "bottom"; label?: string }>("circleProgress", (d) => {
    if (open || (routed.current && !routed.current.closed)) return; // ox ignores a new circle while one is showing
    route(progressIntent(d, "ring"), () => {
      pct.current = 0;
      start(d.duration, d.label, d.position);
    });
  });
  useOx("progressCancel", () =>
    cancel(() => {
      show(99);
      stop();
    }),
  );

  useEffect(() => {
    if (!open || !run) return;
    const step = Math.max(1, run.duration / 100);
    const t = setInterval(() => show(pct.current < 100 ? pct.current + 1 : pct.current), step);
    return () => clearInterval(t);
  }, [open, run]);

  if (!presence.mounted || !run) return null;
  // The kit's ProgressRing on the world (size lg, ox's ring is 90px). Its own `duration` run is
  // only the picture (two compositor rotations); useRun's timer decides when the run ends, and its onComplete
  // is not used. The centre is ox's counter: +1 every duration/100 ms, 99 on a cancel (§9.1).
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 z-20 flex justify-center", run.position === "bottom" ? "bottom-0 h-[20%] items-center" : "inset-y-0 items-center")}>
      <ProgressRing
        key={run.id}
        size="lg"
        duration={run.duration}
        label={run.label}
        aria-label={run.label || "Progress"}
        center={
          <span>
            <span ref={counter}>{`${pct.current}`}</span>
            <span data-slot="progress-ring-unit">%</span>
          </span>
        }
        data-state={presence.state}
        className={presenceMotion}
      />
    </div>
  );
}
