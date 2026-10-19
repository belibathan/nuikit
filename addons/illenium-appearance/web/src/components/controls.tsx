// The four building blocks every section uses: index stepper, float slider, colour swatches, field label.
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { RGB } from "@/lib/types";

/** Label row: name on the left, value and an optional revert-to-original on the right. */
export function FieldLabel({ label, value, hint, onReset }: { label: ReactNode; value?: ReactNode; hint?: ReactNode; onReset?: () => void }) {
  return (
    <div className="flex h-6 items-center gap-2 text-xs">
      <span className="truncate font-medium text-foreground/90">{label}</span>
      {hint !== undefined && <span className="truncate text-muted-foreground">{hint}</span>}
      <span className="ml-auto flex items-center gap-1">
        {onReset && (
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" onClick={onReset} aria-label="Revert to original">
            <RotateCcw />
          </Button>
        )}
        {value !== undefined && <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{value}</span>}
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

/** Integer index with prev / next and a typeable value: drawables, textures, styles, parents. */
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
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const disabled = max <= min;
  const count = Math.max(0, max - min + 1);

  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return setText(String(value));
    const next = stepValue(n, 0, min, max, blacklist);
    setText(String(next));
    if (next !== value) onChange(next);
  };
  const step = (dir: -1 | 1) => {
    const next = stepValue(value, dir, min, max, blacklist);
    if (next !== value) onChange(next);
  };

  return (
    <div className="min-w-0">
      <FieldLabel
        label={label}
        hint={hint ?? format?.(value)}
        value={count <= 1 ? (count === 1 ? "only one" : "none") : `${value} / ${max}`}
        onReset={original !== undefined && original !== value ? () => onChange(original) : undefined}
      />
      <ButtonGroup className="mt-1 w-full">
        <Button variant="outline" size="icon-sm" disabled={disabled} onClick={() => step(-1)} aria-label="Previous">
          <ChevronLeft />
        </Button>
        <Input
          inputMode="numeric"
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value.replace(/[^\d-]/g, ""))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
            else if (e.key === "ArrowUp") (e.preventDefault(), step(1));
            else if (e.key === "ArrowDown") (e.preventDefault(), step(-1));
          }}
          className="h-8 min-w-0 rounded-none text-center font-mono text-sm tabular-nums"
          aria-label={typeof label === "string" ? label : undefined}
        />
        <Button variant="outline" size="icon-sm" disabled={disabled} onClick={() => step(1)} aria-label="Next">
          <ChevronRight />
        </Button>
      </ButtonGroup>
    </div>
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
      <Slider
        className="mt-2 mb-1"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => {
          const next = round(v ?? min, step);
          if (next !== value) onChange(next);
        }}
      />
      {ends && (
        <div className="flex justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
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
      <div className="mt-1.5 grid grid-cols-16 gap-1" role="radiogroup">
        {colors.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${typeof label === "string" ? label : "Colour"} ${i}`}
            onClick={() => value !== i && onChange(i)}
            className={cn(
              "aspect-square w-full rounded-[4px] border border-white/10 ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
              value === i && "z-10 scale-110 border-transparent ring-2 ring-foreground",
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
  return <div className={cn("grid gap-x-3 gap-y-3", cols === 2 && "grid-cols-2")}>{children}</div>;
}
