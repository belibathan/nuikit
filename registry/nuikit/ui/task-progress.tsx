"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

/**
 * TaskProgress — "Picking lock… 3s". Runs for `duration` ms, then calls onComplete.
 * Built on the stock shadcn Progress, so it follows your theme.
 *
 *   <TaskProgress label="Repairing engine" duration={5000} onComplete={done} cancelKey="X" onCancel={cancel} />
 */
export interface TaskProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  /** ms */
  duration: number;
  onComplete?: () => void;
  /** Show a cancel hint and listen for this key. */
  cancelKey?: string;
  onCancel?: () => void;
}

export function TaskProgress({ label, duration, onComplete, cancelKey, onCancel, className, ...props }: TaskProgressProps) {
  const [elapsed, setElapsed] = React.useState(0);
  const done = React.useRef({ onComplete, onCancel });
  done.current = { onComplete, onCancel };

  React.useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const e = Math.min(duration, performance.now() - start);
      setElapsed(e);
      if (e >= duration) return done.current.onComplete?.();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (ev: KeyboardEvent) => {
      if (cancelKey && ev.key.toLowerCase() === cancelKey.toLowerCase()) {
        cancelAnimationFrame(raf);
        done.current.onCancel?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [duration, cancelKey]);

  const left = Math.ceil((duration - elapsed) / 1000);

  return (
    <div className={cn("w-80 rounded-xl border bg-card/85 p-3 text-card-foreground shadow-lg backdrop-blur-sm", className)} {...props}>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{left}s</span>
      </div>
      <Progress value={(elapsed / duration) * 100} className="h-1.5" />
      {cancelKey && (
        <p className="mt-2 text-xs text-muted-foreground">
          <kbd className="rounded border bg-muted px-1 font-mono">{cancelKey}</kbd> to cancel
        </p>
      )}
    </div>
  );
}
