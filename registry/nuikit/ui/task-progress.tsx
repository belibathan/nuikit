"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { Progress } from "@/components/ui/progress"

/**
 * TaskProgress — "Picking lock… 3s". A shadcn Card with a Progress that runs for
 * `duration` ms, then calls onComplete.
 *
 *   <TaskProgress label="Repairing engine" duration={5000} onComplete={done} cancelKey="X" onCancel={cancel} />
 */
function TaskProgress({
  className,
  label,
  duration,
  onComplete,
  cancelKey,
  onCancel,
  ...props
}: React.ComponentProps<typeof Card> & {
  label: string
  /** ms */
  duration: number
  onComplete?: () => void
  /** Show a cancel hint and listen for this key. */
  cancelKey?: string
  onCancel?: () => void
}) {
  const [elapsed, setElapsed] = React.useState(0)
  const done = React.useRef({ onComplete, onCancel })
  done.current = { onComplete, onCancel }

  React.useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const e = Math.min(duration, performance.now() - start)
      setElapsed(e)
      if (e >= duration) return done.current.onComplete?.()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const onKey = (ev: KeyboardEvent) => {
      if (cancelKey && ev.key.toLowerCase() === cancelKey.toLowerCase()) {
        cancelAnimationFrame(raf)
        done.current.onCancel?.()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", onKey)
    }
  }, [duration, cancelKey])

  return (
    <Card data-slot="task-progress" className={cn("w-80 gap-3 py-4", className)} {...props}>
      <CardHeader className="flex items-baseline justify-between px-4">
        <CardTitle className="text-sm">{label}</CardTitle>
        <CardDescription className="tabular-nums">{Math.ceil((duration - elapsed) / 1000)}s</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <Progress value={(elapsed / duration) * 100} />
      </CardContent>
      {cancelKey && (
        <CardFooter className="gap-1.5 px-4 text-xs text-muted-foreground">
          <Kbd>{cancelKey}</Kbd> to cancel
        </CardFooter>
      )}
    </Card>
  )
}

export { TaskProgress }
