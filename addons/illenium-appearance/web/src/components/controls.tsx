// The four building blocks every section uses: index stepper, float slider, colour swatches, field label.
import { RotateCcw } from "@/components/ui/icons";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Stepper as KitStepper } from "@/components/ui/stepper";
import { NumberRoll, TextRoll } from "@/components/ui/text-roll";
import { cn } from "@/lib/utils";
import type { RGB } from "@/lib/types";

/** Label row: name on the left, value and an optional revert-to-original on the right. */
export function FieldLabel({ label, value, hint, onReset }: { label: ReactNode; value?: ReactNode; hint?: ReactNode; onReset?: () => void }) {
  return (
    <div className="nk-field-label">
      <span className="truncate">{label}</span>
      {hint !== undefined && <span className="truncate text-muted-foreground normal-case tracking-normal">{hint}</span>}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {onReset && (
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" onClick={onReset} aria-label="Revert to original">
            <RotateCcw />
          </Button>
        )}
        {value !== undefined && (typeof value === "string" || typeof value === "number" ? <TextRoll value={String(value)} className="nk-num text-muted-foreground" /> : <span className="nk-num text-muted-foreground">{value}</span>)}
      </span>
    </div>
  );
}

/**
 * Next allowed value from `from` in direction `dir` (±1), skipping blacklisted values and wrapping
 * at the ends. dir 0 normalises a typed value (out of range wraps; a blacklisted one moves up).
 */
export function stepValue(from: number, dir: -1 | 0 | 1, min: number, max: number, blacklist: number[] = []) {
  if (max < min) return min;
  const wrap = (v: number) => (v < min ? max : v > max ? min : v);
  const blocked = new Set(blacklist);
  let v = dir === 0 ? wrap(from) : wrap(from + dir);
  for (let i = 0; i <= max - min && blocked.has(v); i++) v = wrap(v + (dir || 1));
  return v;
}

/** Integer index with prev / next and a typeable value: drawables, textures, styles, parents. The kit's Stepper. */
export function Stepper({
  label,
  hint,
  value,
  original,
  min,
  max,
  blacklist,
  onChange,
  format,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: number;
  original?: number;
  min: number;
  max: number;
  blacklist?: number[];
  onChange: (v: number) => void;
  format?: (v: number) => ReactNode;
}) {
  const disabled = max <= min;
  const count = Math.max(0, max - min + 1);

  // a typed value: out of range wraps, a blacklisted one moves up (stepValue with dir 0)
  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const next = stepValue(n, 0, min, max, blacklist);
    if (next !== value) onChange(next);
  };
  const step = (dir: -1 | 1) => {
    const next = stepValue(value, dir, min, max, blacklist);
    if (next !== value) onChange(next);
  };

  return (
    <div className="nk-field min-w-0">
      <FieldLabel
        label={label}
        hint={hint ?? format?.(value)}
        value={count <= 1 ? (count === 1 ? "Only one" : "None") : <Count value={value} total={max} />}
        onReset={original !== undefined && original !== value ? () => onChange(original) : undefined}
      />
      <KitStepper value={value} onStep={step} onCommit={commit} disabled={disabled} aria-label={typeof label === "string" ? label : undefined} />
    </div>
  );
}

/** "1 / 243": the changing number rolls, the separator and the total stay still (handoff §3.4). */
function Count({ value, total }: { value: number; total: number }) {
  return (
    <span className="nk-num inline-flex items-center text-muted-foreground">
      <NumberRoll value={value} format={String} />
      <span>&nbsp;/&nbsp;{total}</span>
    </span>
  );
}

const round = (v: number, step: number) => {
  const decimals = Math.max(0, (String(step).split(".")[1] ?? "").length);
  return Number(v.toFixed(decimals));
};

/** Float value: mixes, face features, opacities. `ends` labels the two extremes. */
export function RangeSlider({
  label,
  value,
  original,
  min,
  max,
  step = 0.1,
  ends,
  percent,
  onChange,
}: {
  label: ReactNode;
  value: number;
  original?: number;
  min: number;
  max: number;
  step?: number;
  ends?: [ReactNode, ReactNode];
  percent?: boolean;
  onChange: (v: number) => void;
}) {
  const shown = percent ? `${Math.round(((value - min) / (max - min || 1)) * 100)}%` : value.toFixed(1);
  return (
    <div className="min-w-0">
      <FieldLabel
        label={label}
        value={shown}
        onReset={original !== undefined && Math.abs(original - value) > 1e-6 ? () => onChange(original) : undefined}
      />
      <div className="mt-1 flex h-8 items-center">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => {
          const next = round(v ?? min, step);
          if (next !== value) onChange(next);
        }}
      />
      </div>
      {ends && (
        <div className="-mt-1 flex justify-between nk-label">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </div>
      )}
    </div>
  );
}

/** A game colour palette (RGB triples from Lua); the index is what goes on the wire. */
export function Swatches({
  label,
  colors,
  value,
  original,
  onChange,
}: {
  label: ReactNode;
  colors: RGB[];
  value: number;
  original?: number;
  onChange: (index: number) => void;
}) {
  if (!colors.length) return null;
  return (
    <div className="min-w-0">
      <FieldLabel label={label} value={`#${value}`} onReset={original !== undefined && original !== value ? () => onChange(original) : undefined} />
      <div className="mt-1 grid grid-cols-16 gap-1" role="radiogroup">
        {colors.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${typeof label === "string" ? label : "Colour"} ${i}`}
            onClick={() => value !== i && onChange(i)}
            className={cn(
              "aspect-square w-full rounded-(--nk-radius-key) border border-white/10 ring-offset-2 ring-offset-popover transition-transform outline-none hover:scale-110 focus-visible:scale-110",
              value === i && "z-10 border-transparent ring-2 ring-foreground",
            )}
            style={{ backgroundColor: `rgb(${c[0]}, ${c[1]}, ${c[2]})` }}
          />
        ))}
      </div>
    </div>
  );
}

/** A titled block inside an accordion item. */
export function Fields({ children, cols = 1 }: { children: ReactNode; cols?: 1 | 2 }) {
  return <div className={cn("grid gap-x-3 gap-y-4", cols === 2 && "grid-cols-2")}>{children}</div>;
}
