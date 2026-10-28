"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { tokenMs } from "nuikit-core/motion"

import { cn } from "@/lib/utils"
import { NumberRoll, TextRoll } from "@/components/ui/text-roll"

/**
 * Stepper — one segmented control for a value picked by stepping (docs/design.md; handoff §4 "steppers
 * and pickers as one component"): a prev keycap, the value field and a next keycap, joined in one rim at one
 * control height. The keycaps are Tiles (kit.css draws `data-slot="glyph"`; upright inside the rim, the theme's
 * skew is for free-standing keys), the value rolls on change (NumberRoll per digit for numbers, TextRoll for
 * text: a static separator never moves), and a keycap held down repeats after `--nk-stepper-delay` every
 * `--nk-stepper-rate`. Appearance drawables and textures, settings pickers, an input dialog's number.
 *
 *   <Stepper value={drawable} onValueChange={setDrawable} min={0} max={243} aria-label="Drawable" />
 *   <Stepper defaultValue={1} min={1} max={5} wrap />
 *   <Stepper value={v} onStep={(dir) => setV(stepValue(v, dir))} onCommit={(text) => commit(text)} />
 *   <Stepper value="Medium" onStep={cycle} size="sm" />
 *
 * Controlled with `value` + `onValueChange`, or uncontrolled from `defaultValue`. Without `onStep` the stepper
 * computes the next value itself (`step`, `min`, `max`, `wrap`); with it, the parent decides (a blacklist, a
 * list of names). `onCommit` makes the value field typeable (click or Enter): the text goes to the parent on
 * Enter or blur, Escape cancels. Left / Right / Up / Down on the control step; the field announces the value.
 *
 * Role: one value picked by stepping: prev, the value, next, as one joined control.
 * Anatomy: stepper (the rim, --nk-height-control) > stepper-key (a Glyph button, prev) > stepper-value (the roll, or the
 *   input while typing) > stepper-key (next).
 * Props: value, defaultValue, onValueChange, onStep, onCommit, min, max, step, wrap, format, size, disabled.
 * Rules: one height for the three parts (--nk-height-control; `size` picks --nk-height-chip or --nk-height-field); the keycaps
 *   are Tiles and never restyled; the value rolls (per digit) and static text stays still; hold repeats
 *   (--nk-stepper-delay, --nk-stepper-rate); no focus ring (focus and hover are one lit state); rem, never px.
 */

const stepperVariants = cva(
  "group/stepper inline-flex w-full min-w-0 items-stretch overflow-hidden rounded-(--nk-radius-control) border border-(--nk-plate-hair,var(--border)) text-(length:--nk-text-label) select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  {
    variants: {
      size: {
        sm: "h-(--nk-height-chip)",
        default: "h-(--nk-height-control)",
        lg: "h-(--nk-height-field)",
      },
    },
    defaultVariants: { size: "default" },
  }
)

type StepperValue = number | string

type StepperProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> &
  VariantProps<typeof stepperVariants> & {
    value?: StepperValue
    defaultValue?: StepperValue
    onValueChange?: (value: StepperValue) => void
    /** The parent computes the step (a blacklist, names): called instead of the built-in arithmetic. */
    onStep?: (direction: -1 | 1) => void
    /** Makes the value typeable: the text typed, on Enter or blur. */
    onCommit?: (text: string) => void
    min?: number
    max?: number
    /** The built-in step, default 1. */
    step?: number
    /** Past an end, start again at the other. Default: stop. */
    wrap?: boolean
    /** How the value is written (a number only). Default: the number as is. */
    format?: (value: number) => string
    disabled?: boolean
    /** The keycaps' legends; default chevrons. */
    prevIcon?: React.ReactNode
    nextIcon?: React.ReactNode
  }

const asIs = (n: number) => String(n)

function Stepper({
  className,
  size,
  value: valueProp,
  defaultValue,
  onValueChange,
  onStep,
  onCommit,
  min,
  max,
  step = 1,
  wrap = false,
  format = asIs,
  disabled = false,
  prevIcon,
  nextIcon,
  onKeyDown,
  ...props
}: StepperProps) {
  const [inner, setInner] = React.useState<StepperValue>(defaultValue ?? 0)
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const latest = React.useRef({ value, onStep, onValueChange, min, max, step, wrap, disabled })
  latest.current = { value, onStep, onValueChange, min, max, step, wrap, disabled }

  const move = React.useCallback((dir: -1 | 1) => {
    const l = latest.current
    if (l.disabled) return
    if (l.onStep) return l.onStep(dir)
    if (typeof l.value !== "number") return
    let next = l.value + dir * l.step
    const lo = l.min ?? -Infinity
    const hi = l.max ?? Infinity
    if (next > hi) next = l.wrap && Number.isFinite(lo) ? lo : hi
    if (next < lo) next = l.wrap && Number.isFinite(hi) ? hi : lo
    if (next === l.value) return
    if (!controlled) setInner(next)
    l.onValueChange?.(next)
  }, [controlled])

  // the edges: at an end without wrap (and without a parent stepping), the keycap is disabled
  const atLo = !onStep && !wrap && typeof value === "number" && min !== undefined && value <= min
  const atHi = !onStep && !wrap && typeof value === "number" && max !== undefined && value >= max

  // typing
  const [text, setText] = React.useState<string | null>(null)
  const input = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (text !== null) input.current?.select()
  }, [text])
  const commit = (t: string) => {
    setText(null)
    if (t.trim() !== "" && t !== String(value)) onCommit?.(t)
  }

  const keys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented || text !== null) return
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") (e.preventDefault(), move(-1))
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") (e.preventDefault(), move(1))
    else if (e.key === "Enter" && onCommit && !disabled) (e.preventDefault(), setText(String(value)))
  }

  const shown = typeof value === "number" ? (
    <NumberRoll value={value} format={format} className="justify-center" />
  ) : (
    <TextRoll value={String(value)} align="center" />
  )

  return (
    <div
      data-slot="stepper"
      data-disabled={disabled || undefined}
      role="group"
      className={cn(stepperVariants({ size }), className)}
      onKeyDown={keys}
      {...props}
    >
      <StepperKey side="prev" disabled={disabled || atLo} onStep={move}>
        {prevIcon ?? <ChevronLeftIcon />}
      </StepperKey>
      {text !== null ? (
        <input
          ref={input}
          data-slot="stepper-value"
          data-editing=""
          inputMode={typeof value === "number" ? "numeric" : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.preventDefault(), commit(e.currentTarget.value))
            else if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), setText(null))
          }}
          className="nk-num min-w-0 flex-1 bg-transparent text-center outline-none"
          aria-label={props["aria-label"]}
        />
      ) : (
        <span
          data-slot="stepper-value"
          role={onCommit ? "button" : undefined}
          tabIndex={disabled ? -1 : 0}
          aria-live="polite"
          onClick={() => onCommit && !disabled && setText(String(value))}
          className="nk-num flex min-w-0 flex-1 items-center justify-center px-(--nk-space-2) outline-none focus-visible:text-foreground"
        >
          {shown}
        </span>
      )}
      <StepperKey side="next" disabled={disabled || atHi} onStep={move}>
        {nextIcon ?? <ChevronRightIcon />}
      </StepperKey>
    </div>
  )
}

/** Hold timing: a first repeat after `--nk-stepper-delay` (350ms), then one every `--nk-stepper-rate` (70ms). */
const holdDelay = () => tokenMs("--nk-stepper-delay", 350)
const holdRate = () => tokenMs("--nk-stepper-rate", 70)

/** A keycap of the control: a Glyph button, upright, at the control's height; held, it repeats. */
function StepperKey({ side, disabled, onStep, children }: { side: "prev" | "next"; disabled: boolean; onStep: (dir: -1 | 1) => void; children: React.ReactNode }) {
  const dir = side === "prev" ? -1 : 1
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [held, setHeld] = React.useState(false)
  const stop = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setHeld(false)
  }, [])
  React.useEffect(() => stop, [stop])
  const start = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || e.button !== 0) return
    e.preventDefault() // the field keeps its focus; a held key doesn't select text
    onStep(dir)
    setHeld(true)
    const tick = () => {
      onStep(dir)
      timer.current = setTimeout(tick, holdRate())
    }
    timer.current = setTimeout(tick, holdDelay())
  }
  return (
    <button
      type="button"
      tabIndex={-1}
      data-slot="glyph"
      data-shape="square"
      data-size="lg"
      data-part={`stepper-${side}`}
      data-state={held ? "hold" : undefined}
      disabled={disabled}
      aria-label={side === "prev" ? "Previous" : "Next"}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={(e) => e.preventDefault()}
      className={cn(
        // one height with the rim; the tile's corners are the rim's (overflow clips), upright inside it
        "h-full w-auto aspect-square shrink-0 rounded-none [--nk-control-face-skew:0deg] [--nk-control-plate-x:0rem] [--nk-control-plate-y:0rem] text-muted-foreground",
        "hover:text-foreground hover:[--nk-control-now-face:var(--nk-fill-tint)] disabled:pointer-events-none disabled:opacity-40",
        side === "prev" ? "border-r border-(--nk-plate-hair,var(--border))" : "border-l border-(--nk-plate-hair,var(--border))"
      )}
    >
      {children}
    </button>
  )
}

export { Stepper, stepperVariants, type StepperProps, type StepperValue }
