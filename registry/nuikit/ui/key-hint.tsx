"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"

/**
 * KeyHint — "[E] Talk". A shadcn Kbd and a label, with optional hold-to-confirm
 * (a shadcn Progress fills while the key is held).
 *
 *   <KeyHint keys="E">Talk to dealer</KeyHint>
 *   <KeyHint keys="F" hold={1200} onConfirm={rob}>Rob register</KeyHint>
 */
const keyHintVariants = cva(
  "inline-flex items-center gap-2 text-sm text-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "rounded-md border bg-background/80 px-2 py-1 shadow-xs",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

function KeyHint({
  className,
  variant,
  keys,
  bind,
  hold,
  onConfirm,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof keyHintVariants> & {
    /** What's printed on the key. */
    keys: string
    /** KeyboardEvent.key to listen for when `hold` is set. Defaults to `keys`. */
    bind?: string
    /** Hold duration in ms. Omit for a plain hint. */
    hold?: number
    onConfirm?: () => void
  }) {
  const progress = useHold(bind ?? keys, hold, onConfirm)

  return (
    <div
      data-slot="key-hint"
      data-holding={progress > 0 || undefined}
      className={cn(keyHintVariants({ variant }), className)}
      {...props}
    >
      <Kbd>{keys}</Kbd>
      <span>{children}</span>
      {hold ? <Progress value={progress * 100} className="h-1 w-12" /> : null}
    </div>
  )
}

function useHold(key: string, ms: number | undefined, onConfirm?: () => void) {
  const [progress, setProgress] = React.useState(0)
  const confirm = React.useRef(onConfirm)
  confirm.current = onConfirm

  React.useEffect(() => {
    if (!ms) return
    let start = 0
    let raf = 0
    const match = (e: KeyboardEvent) => e.key.toLowerCase() === key.toLowerCase()
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms)
      setProgress(p)
      if (p >= 1) {
        start = 0
        setProgress(0)
        confirm.current?.()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const down = (e: KeyboardEvent) => {
      if (!match(e) || e.repeat || start) return
      start = performance.now()
      raf = requestAnimationFrame(tick)
    }
    const up = (e: KeyboardEvent) => {
      if (!match(e)) return
      start = 0
      cancelAnimationFrame(raf)
      setProgress(0)
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [key, ms])

  return progress
}

export { KeyHint, keyHintVariants }
