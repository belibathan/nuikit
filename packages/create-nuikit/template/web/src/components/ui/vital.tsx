import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Vital — a diamond that fills like liquid. Health, armor, hunger, stamina, fuel…
 * Pure shadcn tokens: the theme decides every color.
 *
 *   <Vital label="Health" value={hp} tone="destructive" icon={<HeartPulse />} />
 */

const tones = {
  primary: { fill: "fill-primary", well: "fill-primary/15 stroke-primary/50", text: "text-primary" },
  destructive: { fill: "fill-destructive", well: "fill-destructive/15 stroke-destructive/50", text: "text-destructive" },
  "chart-1": { fill: "fill-chart-1", well: "fill-chart-1/15 stroke-chart-1/50", text: "text-chart-1" },
  "chart-2": { fill: "fill-chart-2", well: "fill-chart-2/15 stroke-chart-2/50", text: "text-chart-2" },
  "chart-3": { fill: "fill-chart-3", well: "fill-chart-3/15 stroke-chart-3/50", text: "text-chart-3" },
  "chart-4": { fill: "fill-chart-4", well: "fill-chart-4/15 stroke-chart-4/50", text: "text-chart-4" },
  "chart-5": { fill: "fill-chart-5", well: "fill-chart-5/15 stroke-chart-5/50", text: "text-chart-5" },
} as const;

export type VitalTone = keyof typeof tones;

export interface VitalProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value: number;
  /** Icon drawn in the middle (lucide-react works great). */
  icon?: React.ReactNode;
  tone?: VitalTone;
  /** At or below this, the vital pulses. Default 20. Set to -1 to disable. */
  low?: number;
  size?: "sm" | "md" | "lg";
  /** Accessible name, e.g. "Health". */
  label?: string;
}

const sizes = { sm: "size-8 [&_svg.icon]:size-3", md: "size-11 [&_svg.icon]:size-4", lg: "size-14 [&_svg.icon]:size-5" };

// A diamond with softened corners, in a 40×40 box.
const DIAMOND = "M20 2.5 Q21.2 2.5 22.1 3.4 L36.6 17.9 Q38.5 20 36.6 22.1 L22.1 36.6 Q20 38.5 17.9 36.6 L3.4 22.1 Q1.5 20 3.4 17.9 L17.9 3.4 Q18.8 2.5 20 2.5 Z";

export function Vital({ value, icon, tone = "primary", low = 20, size = "md", label, className, ...props }: VitalProps) {
  const v = Math.max(0, Math.min(100, value));
  const t = tones[tone];
  const critical = low >= 0 && v <= low;
  const clip = React.useId().replace(/:/g, "");
  const level = 38.5 - (v / 100) * 36; // liquid surface, in viewBox units

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      data-critical={critical || undefined}
      className={cn("relative grid shrink-0 place-items-center", sizes[size], critical && "animate-pulse", className)}
      {...props}
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full overflow-visible drop-shadow-sm" aria-hidden>
        <defs>
          <clipPath id={clip}>
            <path d={DIAMOND} />
          </clipPath>
        </defs>
        <path d={DIAMOND} className={cn("stroke-[1.5]", t.well)} />
        <g clipPath={`url(#${clip})`}>
          <rect x="0" width="40" height="40" y={level} className={cn("transition-[y] duration-500 ease-out", t.fill)} />
          {/* meniscus: a 1px highlight on the liquid surface */}
          {v > 2 && v < 98 && <rect x="0" width="40" height="0.8" y={level} className="fill-foreground/50 transition-[y] duration-500 ease-out" />}
        </g>
      </svg>
      <span className={cn("relative", v > 55 ? "text-primary-foreground" : t.text)}>
        {React.isValidElement<{ className?: string }>(icon) ? React.cloneElement(icon, { className: cn("icon", icon.props.className) }) : icon}
      </span>
    </div>
  );
}
