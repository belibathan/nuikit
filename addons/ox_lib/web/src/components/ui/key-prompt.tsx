// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/key-prompt.tsx, then run pnpm sync.
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
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
 */

const keyPromptVariants = cva(
  "relative inline-flex max-w-80 items-center gap-2.5 overflow-hidden text-left text-sm leading-5 font-medium [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      surface: {
        /** A small floating panel, like the rest of the kit's floating UI. */
        panel: "nk-panel",
        /** The game's dark HUD surface, for prompts that sit on the world (nk-hud). */
        hud: "nk-hud nk-shadow",
      },
      size: {
        sm: "min-h-8 py-1 pr-2.5 pl-1.5",
        default: "min-h-10 py-1.5 pr-3 pl-2",
      },
    },
    defaultVariants: {
      surface: "panel",
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
    /** What's printed on the key(s): "E", or ["Shift", "E"] for a combination. */
    keys: string | readonly string[]
    /** Between keys of a combination. Default "+". */
    separator?: React.ReactNode
    label: React.ReactNode
    /** A second, quieter line: why it's locked, what it costs. */
    description?: React.ReactNode
    icon?: React.ReactNode
    /** Hold for this many ms to confirm (a line fills under the prompt). */
    hold?: number
    /** Hold progress 0–1 from outside (Lua reads the key in game). Overrides the internal hold. */
    progress?: number
    /** The one the key acts on now, among several prompts. */
    active?: boolean
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
  keys,
  separator = "+",
  label,
  description,
  icon,
  hold,
  progress,
  active = false,
  disabled = false,
  listen = false,
  onConfirm,
  ...props
}: KeyPromptProps) {
  const list = typeof keys === "string" ? [keys] : [...keys]
  const line = React.useRef<HTMLSpanElement>(null)
  const internal = useHold(hold, onConfirm, (n) => {
    if (line.current) line.current.style.transform = `scaleX(${n})`
  })
  const controlled = progress !== undefined
  const p = controlled ? holdProgress(progress, 1) : 0
  const holding = controlled ? p > 0 : internal.holding
  const interactive = !!onConfirm && !disabled
  const bind = typeof listen === "string" ? listen : listen ? list[0] : undefined

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
      aria-keyshortcuts={list.join("+")}
      data-slot="key-prompt"
      data-active={active || undefined}
      data-disabled={disabled || undefined}
      data-holding={holding || undefined}
      className={cn(
        keyPromptVariants({ surface, size }),
        active && "outline-2 -outline-offset-1 outline-primary",
        disabled && "opacity-50",
        interactive && "cursor-pointer outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className
      )}
      {...pointer}
      {...props}
    >
      <KbdGroup data-slot="key-prompt-keys" className="shrink-0">
        {list.map((k, i) => (
          <React.Fragment key={`${k}-${i}`}>
            {i > 0 && (
              <span aria-hidden className="text-xs text-muted-foreground">
                {separator}
              </span>
            )}
            <Kbd
              className={cn("h-6 min-w-6 px-1.5 text-xs", active && "bg-primary text-primary-foreground")}
            >
              {k}
            </Kbd>
          </React.Fragment>
        ))}
      </KbdGroup>
      {icon && (
        <span data-slot="key-prompt-icon" className={cn("flex", surface === "hud" ? "opacity-75" : "text-muted-foreground")}>
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span data-slot="key-prompt-label" className="truncate">
          {label}
        </span>
        {description && (
          <span
            data-slot="key-prompt-description"
            className={cn("truncate text-xs leading-4 font-normal", surface === "hud" ? "opacity-75" : "text-muted-foreground")}
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
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
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
  useHold,
  type KeyPromptProps,
  type KeyPromptPosition,
}
