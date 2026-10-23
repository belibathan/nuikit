"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, nkConfirm, nkLevel, nkState, nkVariant, type NkVariantProps } from "@/lib/utils"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

/**
 * KeyPrompt — "[E] Open garage": the key and what it does, near what the player can use. The
 * default look of the `prompt` intent (docs/architecture.md §2). Supersedes `key-hint`.
 *
 *   <KeyPromptStack position="center-right">
 *     <KeyPrompt keys="E" label="Open garage" />
 *     <KeyPrompt keys="G" label="Rob register" hold={1500} progress={robProgress} />
 *     <KeyPrompt keys={["Shift", "E"]} label="Lock vehicle" disabled description="Not your car" />
 *   </KeyPromptStack>
 *
 * In game a prompt shows while the page has no focus, so the key is read in Lua: send the hold
 * as `progress` (0–1). With focus (or in the browser) it can run the hold itself: press and hold
 * with the pointer, or `listen` for the key, and `onConfirm` fires when it fills.
 *
 * By default it is the prompt slab (design v2 §4.5): a key chip and a verb on the HUD plate, the
 * same anatomy as every other slab (`nk-slab`, docs/tokens.md#slabs). `surface="panel"` and
 * `surface="hud"` keep the earlier looks. `keys={[]}` draws no key chip (a script's text with no
 * key); `wrap` lets a long label run onto more lines instead of truncating. A prompt with a
 * `description` is two lines tall: the slab grows to fit (the key stays on the first line).
 */

const keyPromptVariants = cva(
  "relative max-w-80 overflow-hidden text-left [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      surface: {
        /** The prompt slab on the game: key chip + verb, the HUD plate (nk-slab). */
        slab: "nk-slab",
        /** A small floating panel, like the rest of the kit's floating UI. */
        panel: "nk-panel inline-flex items-center gap-2.5 text-sm leading-5 font-medium",
        /** The game's dark HUD surface, for prompts that sit on the world (nk-hud). */
        hud: "nk-hud nk-shadow inline-flex items-center gap-2.5 text-sm leading-5 font-medium",
      },
      size: {
        sm: "",
        default: "",
      },
    },
    compoundVariants: [
      { surface: ["panel", "hud"], size: "sm", className: "min-h-8 py-1 pr-2.5 pl-1.5" },
      { surface: ["panel", "hud"], size: "default", className: "min-h-10 py-1.5 pr-3 pl-2" },
      // the slab's own height and padding (--nk-slab-*); sm is a step tighter
      { surface: "slab", size: "sm", className: "[--nk-slab-height:calc(2rem*var(--nk-density,0.875))]" },
    ],
    defaultVariants: {
      surface: "slab",
      size: "default",
    },
  }
)

/** Hold progress (0–1) after `elapsed` ms of a `duration` ms hold. */
function holdProgress(elapsed: number, duration: number) {
  if (!(duration > 0)) return elapsed > 0 ? 1 : 0
  return Math.max(0, Math.min(1, elapsed / duration))
}

/**
 * Split a script's prompt text into its keys and label: "[E] - Open garage", "**[E]** Pick up",
 * "[Shift] + [E] Lock". Text without a leading key comes back as the label alone.
 */
function parseKeyText(text: string): { keys: string[]; label: string } {
  const keys: string[] = []
  let rest = text
  const one = /^\s*(?:\*\*|__)?\[([^\]\n]{1,12})\](?:\*\*|__)?\s*(?:\+\s*)?/
  for (let m = one.exec(rest); m; m = one.exec(rest)) {
    keys.push(m[1]!.trim())
    rest = rest.slice(m[0].length)
  }
  const label = rest.replace(/^\s*[-–—:]\s*/, "").trim()
  return label ? { keys, label } : { keys: [], label: text.trim() }
}

/**
 * Run a hold: start/stop it. Each frame calls `onFrame(progress)` (draw it straight onto an
 * element, no re-render); React state only changes when the hold starts and stops.
 */
function useHold(duration: number | undefined, onComplete?: () => void, onFrame?: (progress: number) => void) {
  const [holding, setHolding] = React.useState(false)
  const done = React.useRef(onComplete)
  const draw = React.useRef(onFrame)
  const frame = React.useRef(0)
  const started = React.useRef(0)
  React.useEffect(() => {
    done.current = onComplete
    draw.current = onFrame
  })

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current)
    started.current = 0
    draw.current?.(0)
    setHolding(false)
  }, [])

  const start = React.useCallback(() => {
    if (started.current) return
    if (!duration) {
      done.current?.()
      return
    }
    started.current = performance.now()
    setHolding(true)
    const tick = () => {
      const p = holdProgress(performance.now() - started.current, duration)
      draw.current?.(p)
      if (p >= 1) {
        started.current = 0
        draw.current?.(0)
        setHolding(false)
        done.current?.()
        return
      }
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [duration])

  React.useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return { holding, start, stop }
}

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)
}

type KeyPromptProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof keyPromptVariants> & {
    /** What's printed on the key(s): "E", or ["Shift", "E"] for a combination. Empty: no key chip. */
    keys?: string | readonly string[]
    /** Between keys of a combination. Default "+". */
    separator?: React.ReactNode
    label: React.ReactNode
    /** A second, quieter line: why it's locked, what it costs. */
    description?: React.ReactNode
    /** Let the label (and description) wrap onto more lines instead of truncating to one. */
    wrap?: boolean
    icon?: React.ReactNode
    /** Hold for this many ms to confirm (a line fills under the prompt). */
    hold?: number
    /** Hold progress 0–1 from outside (Lua reads the key in game). Overrides the internal hold. */
    progress?: number
    /** The one the key acts on now, among several prompts. */
    active?: boolean
    /**
     * Where the player is on the interaction ladder (wave 3): dormant (the thing is near: the key chip
     * alone, quiet), aware (in reach: the prompt, not yet the target), focus (the key acts on it; what
     * `active` says). Hold and confirm follow from the hold. Without it: today's prompt (focus when active), no ladder.
     */
    stage?: "dormant" | "aware" | "focus"
    disabled?: boolean
    /**
     * Listen for the key while mounted (only when the page has keyboard focus): a press, or a hold
     * when `hold` is set. true uses the first of `keys`; a string is a KeyboardEvent.key.
     */
    listen?: boolean | string
    /** A press, or a hold that filled. Makes the prompt a button for the pointer too. */
    onConfirm?: () => void
  }

function KeyPrompt({
  className,
  surface,
  size,
  keys = [],
  separator = "+",
  label,
  description,
  wrap = false,
  icon,
  hold,
  progress,
  active = false,
  stage,
  disabled = false,
  listen = false,
  onConfirm,
  style,
  density,
  shape,
  motion,
  ...props
}: NkVariantProps & KeyPromptProps) {
  const list = (typeof keys === "string" ? [keys] : [...keys]).filter((k) => k !== "")
  const slab = (surface ?? "slab") === "slab"
  const root = React.useRef<HTMLDivElement>(null)
  const line = React.useRef<HTMLSpanElement>(null)
  const confirm = () => {
    nkConfirm(root.current)
    onConfirm?.()
  }
  const internal = useHold(hold, onConfirm && confirm, (n) => {
    if (line.current) line.current.style.transform = `scaleX(${n})`
    root.current?.style.setProperty("--level", n.toFixed(3))
  })
  const controlled = progress !== undefined
  const p = controlled ? holdProgress(progress, 1) : 0
  // a hold Lua drives pops when it fills
  const full = controlled && p >= 1
  React.useEffect(() => {
    if (full) nkConfirm(root.current)
  }, [full])
  const holding = controlled ? p > 0 : internal.holding
  // no stage: today's prompt (focus only when active), no ladder drawn
  const rung = stage ?? (active ? "focus" : undefined)
  const interactive = !!onConfirm && !disabled
  const bind = typeof listen === "string" ? listen : listen ? list[0] : undefined
  // more than one line of text: the slab grows downwards, the key stays on the first line
  const tall = wrap || !!description

  React.useEffect(() => {
    if (!bind || !interactive) return
    const match = (e: KeyboardEvent) => e.key.toLowerCase() === bind.toLowerCase()
    const down = (e: KeyboardEvent) => {
      if (!match(e) || e.repeat || e.defaultPrevented || isTyping(e)) return
      internal.start()
    }
    const up = (e: KeyboardEvent) => match(e) && internal.stop()
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [bind, interactive, internal.start, internal.stop]) // eslint-disable-line react-hooks/exhaustive-deps

  const pointer = interactive
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.button === 0) internal.start()
        },
        onPointerUp: internal.stop,
        onPointerLeave: internal.stop,
        onKeyDown: (e: React.KeyboardEvent) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault()
            internal.start()
          }
        },
        onKeyUp: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") internal.stop()
        },
      }
    : {}

  return (
    <div
      role={interactive ? "button" : "group"}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-keyshortcuts={list.length ? list.join("+") : undefined}
      ref={root}
      {...nkVariant({ density, shape, motion })}
      data-slot="key-prompt"
      data-state={nkState({ disabled, hold: holding, focus: rung === "focus" })}
      data-ladder={stage || holding ? (holding ? "hold" : rung) : undefined}
      style={{ ...nkLevel(p), ...style }}
      data-surface-variant={surface ?? "slab"}
      data-active={rung === "focus" || undefined}
      data-disabled={disabled || undefined}
      data-holding={holding || undefined}
      data-wrap={wrap || undefined}
      className={cn(
        keyPromptVariants({ surface, size }),
        tall && "items-start [&>[data-slot=key-prompt-keys]]:mt-[calc((1.25rem-var(--nk-slab-key-size))/2)]",
        tall && slab && "py-[calc((var(--nk-slab-height)-1.25rem)/2)]",
        wrap && "whitespace-normal",
        rung === "focus" && "outline-2 -outline-offset-1 outline-(--nk-row-indicator-color)",
        disabled && "opacity-50",
        interactive && "cursor-pointer outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...pointer}
      {...props}
    >
      {list.length > 0 &&
        (slab ? (
          <span data-slot="key-prompt-keys" className="flex shrink-0 items-center gap-1">
            {list.map((k, i) => (
              <React.Fragment key={`${k}-${i}`}>
                {i > 0 && (
                  <span aria-hidden className="text-(length:--nk-slab-key-font-size) opacity-60">
                    {separator}
                  </span>
                )}
                <kbd
                  data-slot="key-prompt-key"
                  className={cn("nk-slab-key", active && "bg-(--nk-chip-active-bg) text-(--nk-chip-active-fg)")}
                >
                  {k}
                </kbd>
              </React.Fragment>
            ))}
          </span>
        ) : (
          <KbdGroup data-slot="key-prompt-keys" className="shrink-0">
            {list.map((k, i) => (
              <React.Fragment key={`${k}-${i}`}>
                {i > 0 && (
                  <span aria-hidden className="text-xs text-muted-foreground">
                    {separator}
                  </span>
                )}
                <Kbd className={cn("h-6 min-w-6 px-1.5 text-xs", active && "bg-(--nk-chip-active-bg) text-(--nk-chip-active-fg)")}>
                  {k}
                </Kbd>
              </React.Fragment>
            ))}
          </KbdGroup>
        ))}
      {icon && (
        <span
          data-slot="key-prompt-icon"
          className={cn("flex", tall && "h-5 items-center", surface === "panel" ? "text-muted-foreground" : "opacity-75")}
        >
          {icon}
        </span>
      )}
      <span data-slot="key-prompt-text" className="flex min-w-0 flex-col">
        <span data-slot="key-prompt-label" className={wrap ? "text-pretty break-words" : "truncate"}>
          {label}
        </span>
        {description && (
          <span
            data-slot="key-prompt-description"
            className={cn(
              wrap ? "text-pretty break-words" : "truncate",
              slab ? "nk-label [color:inherit]! opacity-75" : "text-xs leading-4 font-normal",
              surface === "panel" ? "text-muted-foreground" : !slab && "opacity-75"
            )}
          >
            {description}
          </span>
        )}
      </span>
      {hold !== undefined && (
        <span
          ref={line}
          aria-hidden
          data-slot="key-prompt-hold"
          className={cn(
            "absolute inset-x-0 bottom-0 origin-left",
            slab ? "h-(--nk-slab-line-height) bg-[rgb(var(--nk-slab-tone-rgb))]" : "h-0.5 bg-(--nk-row-indicator-color)"
          )}
          // Controlled: from props. Internal: the hold draws on this element each frame; the
          // constant here never changes, so React leaves that drawing alone.
          style={{ transform: `scaleX(${p})` }}
        />
      )}
    </div>
  )
}

type KeyPromptPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

/** Literal class names, so Tailwind finds them. */
const STACK: Record<KeyPromptPosition, string> = {
  "top-left": "nk-anchor-tl items-start",
  "top-center": "nk-anchor-t items-center",
  "top-right": "nk-anchor-tr items-end",
  "center-left": "nk-anchor-l items-start",
  "center-right": "nk-anchor-r items-end",
  "bottom-left": "nk-anchor-bl items-start",
  "bottom-center": "nk-anchor-b items-center",
  "bottom-right": "nk-anchor-br items-end",
}

/** Other libraries' position words (ox `right-center`, qb `right`) to one of the eight. */
function keyPromptPosition(value?: string | null): KeyPromptPosition {
  const v = (value ?? "").toLowerCase()
  const alias: Record<string, KeyPromptPosition> = {
    "right-center": "center-right",
    "left-center": "center-left",
    right: "center-right",
    left: "center-left",
    top: "top-center",
    bottom: "bottom-center",
  }
  return alias[v] ?? (v in STACK ? (v as KeyPromptPosition) : "center-right")
}

/** A column of prompts pinned `--nk-edge` from an edge of the full-screen root. */
function KeyPromptStack({
  className,
  position = "center-right",
  ...props
}: React.ComponentProps<"div"> & { position?: KeyPromptPosition }) {
  return (
    <div
      data-slot="key-prompt-stack"
      data-position={position}
      className={cn("nk-enter z-10 flex flex-col gap-2", STACK[position] ?? STACK["center-right"], className)}
      {...props}
    />
  )
}

export {
  KeyPrompt,
  KeyPromptStack,
  keyPromptVariants,
  keyPromptPosition,
  holdProgress,
  parseKeyText,
  type KeyPromptProps,
  type KeyPromptPosition,
}
