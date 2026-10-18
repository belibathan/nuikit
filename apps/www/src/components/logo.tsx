import { cn } from "@/lib/utils";

/** The nuikit mark: an n arch, cut by two bands at 31°, on bevelled feet. 100-unit grid. */
export const MARK_PATH =
  "M10 90 V30 A20 20 0 0 1 30 10 H71.67 L35 32 V80 Z M35 48 V40 L85 10 H90 V15 Z M65 38 L90 23 V90 L65 80 Z";

export function Mark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="10 10 80 80" fill="currentColor" aria-hidden className={cn("size-5", className)} {...props}>
      <path d={MARK_PATH} />
    </svg>
  );
}

/** Mark + wordmark lockup. Sized by font-size: the mark matches the cap height of "nuikit". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.28em] font-semibold tracking-[-0.04em]", className)}>
      <Mark className="size-[0.92em]" />
      <span className="leading-none">nuikit</span>
    </span>
  );
}
