import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * KeyHint — "[E] Talk". Optional hold-to-confirm: the keycap fills while held.
 *
 *   <KeyHint keyLabel="E">Talk to dealer</KeyHint>
 *   <KeyHint keyLabel="F" hold={1200} onConfirm={rob}>Rob register</KeyHint>
 */
export interface KeyHintProps extends React.HTMLAttributes<HTMLDivElement> {
  /** What's printed on the keycap. */
  keyLabel: string;
  /** KeyboardEvent.key to listen for when `hold` is set. Defaults to keyLabel. */
  bind?: string;
  /** Hold duration in ms. Omit for a plain hint. */
  hold?: number;
  onConfirm?: () => void;
  variant?: "default" | "ghost";
}

export function KeyHint({ keyLabel, bind, hold, onConfirm, variant = "default", className, children, ...props }: KeyHintProps) {
  const progress = useHold(bind ?? keyLabel, hold, onConfirm);
  const holding = progress > 0;

  return (
    <div
      data-holding={holding || undefined}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg py-1 pr-3 pl-1 text-sm font-medium text-foreground transition-colors",
        variant === "default" && "border bg-card/80 shadow-sm backdrop-blur-sm",
        holding && "border-primary/50",
        className,
      )}
      {...props}
    >
      <kbd
        className={cn(
          "relative grid h-7 min-w-7 place-items-center overflow-hidden rounded-md border border-b-2 bg-muted px-1.5 font-mono text-xs font-semibold text-foreground",
          holding && "border-primary/60",
        )}
      >
        {hold ? <span className="absolute inset-y-0 left-0 bg-primary/35" style={{ width: `${progress * 100}%` }} aria-hidden /> : null}
        <span className="relative">{keyLabel}</span>
      </kbd>
      {children}
    </div>
  );
}

function useHold(key: string, ms: number | undefined, onConfirm?: () => void) {
  const [progress, setProgress] = React.useState(0);
  const confirm = React.useRef(onConfirm);
  confirm.current = onConfirm;

  React.useEffect(() => {
    if (!ms) return;
    let start = 0;
    let raf = 0;
    const match = (e: KeyboardEvent) => e.key.toLowerCase() === key.toLowerCase();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      setProgress(p);
      if (p >= 1) {
        start = 0;
        setProgress(0);
        confirm.current?.();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const down = (e: KeyboardEvent) => {
      if (!match(e) || e.repeat || start) return;
      start = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const up = (e: KeyboardEvent) => {
      if (!match(e)) return;
      start = 0;
      cancelAnimationFrame(raf);
      setProgress(0);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [key, ms]);

  return progress;
}
