import { useEffect, useRef, useState } from "react";
import { Meter } from "@/components/ui/meter";
import { Panel } from "@/components/ui/panel";
import { post, useOx } from "@/lib/nui";
import { presenceMotion } from "@/lib/motion";
import { usePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";

const EXIT_MS = 100;

/**
 * The one rule that matters (docs/ox-lib-protocol.md §9.2): post `progressComplete` only once the
 * hide transition has finished. Lua judges success by elapsed time, so posting early fails the run.
 * Like ox_lib, it's posted after every hide, including a cancel.
 */
function useRun() {
  const [run, setRun] = useState<{ id: number; duration: number; label?: string; position?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const id = useRef(0);
  const presence = usePresence(open, EXIT_MS, () => void post("progressComplete"));
  const start = (duration: number, label?: string, position?: string) => {
    setRun({ id: ++id.current, duration: Math.max(0, Number(duration) || 0), label, position });
    setOpen(true);
  };
  return { run, open, setOpen, start, presence };
}

/** lib.progressBar */
export function ProgressBar() {
  const { run, setOpen, start, presence } = useRun();
  useOx<{ label?: string; duration: number }>("progress", (d) => start(d.duration, d.label));
  useOx("progressCancel", () => setOpen(false));

  if (!presence.mounted || !run) return null;
  // The kit's Meter, filled by a CSS animation over `duration` rather than by `value`: the fill's
  // own animationend is the completion clock (§9.2), with no per-frame renders.
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex h-[20%] items-center justify-center">
      <Panel animate={false} data-state={presence.state} className={cn("gap-2 px-4 py-3", presenceMotion)}>
        {/* The label is the surface's only text, so it reads as body text, not as Meter's 12px label row. */}
        {run.label && <span className="truncate text-sm leading-5 font-medium">{run.label}</span>}
        <Meter
          key={run.id}
          value={0}
          aria-label={run.label || "Progress"}
          className="[&_[data-slot=progress-indicator]]:animate-[ox-fill_var(--ox-duration)_linear_forwards]"
          style={{ ["--ox-duration" as string]: `${run.duration}ms` }}
          onAnimationEnd={(e) => e.animationName === "ox-fill" && setOpen(false)}
        />
      </Panel>
    </div>
  );
}

/** lib.progressCircle */
export function ProgressCircle() {
  const { run, open, setOpen, start, presence } = useRun();
  const [pct, setPct] = useState(0);

  useOx<{ duration: number; position?: "middle" | "bottom"; label?: string }>("circleProgress", (d) => {
    if (open) return; // ox ignores a new circle while one is showing
    setPct(0);
    start(d.duration, d.label, d.position);
  });
  useOx("progressCancel", () => {
    setPct(99);
    setOpen(false);
  });

  useEffect(() => {
    if (!open || !run) return;
    const step = Math.max(1, run.duration / 100);
    const t = setInterval(() => setPct((p) => (p < 100 ? p + 1 : p)), step);
    return () => clearInterval(t);
  }, [open, run]);

  if (!presence.mounted || !run) return null;
  const r = 34; // 80 box, 4 stroke, 2 inset
  const C = 2 * Math.PI * r;
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 z-20 flex justify-center", run.position === "bottom" ? "bottom-0 h-[20%] items-center" : "inset-y-0 items-center")}>
      <div data-state={presence.state} className={cn("flex flex-col items-center gap-3", presenceMotion)}>
        <div className="relative size-20">
          <svg viewBox="0 0 80 80" className="size-full -rotate-90 drop-shadow-[0_8px_24px_rgb(0_0_0/0.45)]">
            <circle cx="40" cy="40" r={r + 4} className="fill-popover stroke-border" strokeWidth="1" />
            <circle cx="40" cy="40" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
            <circle
              key={run.id}
              cx="40"
              cy="40"
              r={r}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={C}
              style={{ strokeDashoffset: C, animation: `ox-ring ${run.duration}ms linear forwards`, ["--ox-c" as string]: C }}
              onAnimationEnd={() => setOpen(false)}
            />
          </svg>
          <div className="nk-num absolute inset-0 grid place-items-center text-sm font-semibold text-popover-foreground">{pct}%</div>
        </div>
        {run.label && <div className="nk-chip">{run.label}</div>}
      </div>
    </div>
  );
}
