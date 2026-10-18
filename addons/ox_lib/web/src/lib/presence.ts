import { useEffect, useRef, useState } from "react";

/**
 * Keep something mounted through its exit animation. `state` drives tw-animate's
 * data-[state=open]:animate-in / data-[state=closed]:animate-out classes.
 * `onExited` runs once the exit has finished (ox_lib times callbacks off it).
 */
export function usePresence(open: boolean, exitMs = 100, onExited?: () => void) {
  const [mounted, setMounted] = useState(open);
  const exited = useRef(onExited);
  exited.current = onExited;
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const t = setTimeout(() => {
      setMounted(false);
      exited.current?.();
    }, exitMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exitMs]);
  return { mounted: mounted || open, state: open ? ("open" as const) : ("closed" as const) };
}
