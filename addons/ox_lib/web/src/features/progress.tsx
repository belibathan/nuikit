import { useEffect, useRef, useState } from "react";
import { post, useOx } from "@/lib/nui";
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
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex h-[20%] items-center justify-center">
      <div
        data-state={presence.state}
        className="w-[350px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <div className="relative h-[45px] overflow-hidden rounded-md border bg-card/90 shadow-lg">
          {/* the label twice: card colours over the track, primary-foreground over the fill (no blend modes) */}
          {run.label && <Label text={run.label} className="text-card-foreground" />}
          <div
            key={run.id}
            className="absolute inset-y-0 left-0 overflow-hidden bg-primary"
            style={{ width: "0%", animation: `ox-fill ${run.duration}ms linear forwards` }}
            onAnimationEnd={() => setOpen(false)}
          >
            {run.label && <Label text={run.label} className="w-[348px] text-primary-foreground" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("absolute inset-y-0 left-0 grid w-full place-items-center px-3", className)}>
      <span className="max-w-full truncate text-base font-medium">{text}</span>
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
  const r = 41.5; // size 90, stroke 7
  const C = 2 * Math.PI * r;
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 z-20 flex justify-center", run.position === "bottom" ? "bottom-0 h-[20%] items-center" : "inset-y-0 items-center")}>
      <div
        data-state={presence.state}
        className="flex flex-col items-center gap-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
      >
        <div className="relative size-[90px]">
          <svg viewBox="0 0 90 90" className="-rotate-90">
            <circle cx="45" cy="45" r={r} fill="none" strokeWidth="7" className="stroke-card/80" />
            <circle
              key={run.id}
              cx="45"
              cy="45"
              r={r}
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={C}
              style={{ strokeDashoffset: C, animation: `ox-ring ${run.duration}ms linear forwards`, ["--ox-c" as string]: C }}
              onAnimationEnd={() => setOpen(false)}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center font-mono text-sm font-medium text-foreground tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">{pct}%</div>
        </div>
        {run.label && <div className="rounded-md bg-card/80 px-2.5 py-1 text-sm font-medium">{run.label}</div>}
      </div>
    </div>
  );
}
