import * as React from "react"
import { Surface, useFollow } from "nuikit-core/react"
import { CheckIcon, HeartPulseIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Countdown, formatCountdown } from "@/components/ui/countdown"
import { Chip } from "@/components/ui/chip"
import { KeyPrompt } from "@/components/ui/key-prompt"
import { useFormatMoney } from "@/components/ui/money"

import type { DeathScreenData } from "./nui"

/**
 * DeathScreen — last stand and death, over the game: a countdown, a bar, and the keys your Lua
 * listens for (respawn, call EMS). Presentation only: your medical script owns the rules and sends
 * a DeathScreenData snapshot; this draws it. Built from the kit: Countdown, KeyPrompt, Chip (material="hud"),
 * Money. Text on the game (nk-on-game): light in every theme, with the world shadow.
 *
 *   <DeathScreenSurface />                      // wired: nk.surface('death', …) in Lua opens it
 *   <DeathScreen data={{ phase: "dead", seconds: 42, total: 60 }} />   // a still, for previews
 *
 * The surface takes no input (input "none"): the keys are read in Lua, so the player can still
 * look around and the chat still opens.
 */
function DeathScreenSurface() {
  return (
    <Surface name="death" layer="system" input="none" hides={["hud"]}>
      {(data) => (data ? <DeathScreen data={data} /> : null)}
    </Surface>
  )
}

/** 125 → "02:05". @deprecated The clock is the kit's Countdown now; use formatCountdown. */
const deathClock = (seconds: number) => formatCountdown(seconds)

function DeathScreen({
  data,
  hold,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: DeathScreenData
  /** How far the respawn key is held (0–1), for a still. Live, it follows "death:hold". */
  hold?: number
}) {
  const down = data.phase === "down"
  const timed = typeof data.seconds === "number"
  const seconds = data.seconds ?? 0
  const label = down ? "Until you bleed out" : seconds > 0 ? "Until you can respawn" : "You can respawn"

  return (
    <div
      data-slot="death-screen"
      data-phase={data.phase}
      className={cn("nk-on-game absolute inset-0 overflow-hidden text-foreground", className)}
      {...props}
    >
      {/* the game behind, darkened; red bleeding in from the edges, stronger while down. Steady: nothing
          animates on its own (docs/design.md motion rule 8); the last 30 s are the Countdown's warnAt. */}
      <div className={cn("nk-enter absolute inset-0", down ? "bg-scrim/40" : "bg-scrim/60")} aria-hidden />
      <div
        className={cn("absolute inset-0", down ? "opacity-70" : "opacity-30")}
        style={{ background: "radial-gradient(ellipse 72% 68% at 50% 45%, transparent 38%, var(--destructive) 100%)" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(ellipse 72% 72% at 50% 45%, transparent 30%, var(--scrim) 100%)" }}
        aria-hidden
      />

      {/* above centre: the bottom of the screen stays clear for the game's own prompts */}
      <div className="nk-enter absolute inset-x-0 top-[20%] flex flex-col items-center px-12 text-center">
        <h1 className="nk-display">{data.title ?? (down ? "You are down" : "You are unconscious")}</h1>
        {data.subtitle && <p className="mt-2 nk-body max-w-xl text-muted-foreground">{data.subtitle}</p>}

        {timed ? (
          <Countdown
            className="mt-12"
            size="hero"
            seconds={seconds}
            total={data.total}
            line={!!data.total && (down || seconds > 0)}
            label={label}
            warnAt={down ? 30 : undefined}
          />
        ) : (
          <div className="nk-label mt-12">Waiting for help</div>
        )}

        <DeathScreenKeys data={data} hold={hold} />
      </div>
    </div>
  )
}

/** What the player can do: call EMS, respawn (hold), or wait for another player. */
function DeathScreenKeys({ data, hold }: { data: DeathScreenData; hold?: number }) {
  const { respawn, ems, helpable } = data
  if (!respawn && !ems && !helpable) return null
  return (
    <div className="mt-12 flex items-start gap-3">
      {helpable && !ems && (
        <Chip material="hud" icon={<HeartPulseIcon />} className="[&_[data-slot=hud-chip-icon]]:text-destructive [&_[data-slot=hud-chip-icon]]:opacity-100">
          Another player can revive you
        </Chip>
      )}

      {ems &&
        (ems.state === "requested" ? (
          <Chip material="hud" icon={<CheckIcon />}>EMS have been notified</Chip>
        ) : (
          <KeyPrompt
            surface="hud"
            size="sm"
            keys={ems.key}
            label="Call EMS"
            description={ems.state === "cooldown" ? `in ${ems.seconds ?? 0}s` : undefined}
            disabled={ems.state === "cooldown"}
          />
        ))}

      {respawn &&
        (respawn.available ? (
          <RespawnPrompt keyName={respawn.key} cost={respawn.cost} hold={hold} />
        ) : (
          <KeyPrompt
            surface="hud"
            size="sm"
            keys={respawn.key}
            label="Respawn"
            description={respawn.wait ? `in ${respawn.wait}s` : "after the timer"}
            disabled
          />
        ))}
    </div>
  )
}

/**
 * "Hold E to respawn": the kit's KeyPrompt, whose hold line follows the respawn key, 0–1. A live
 * value (docs/protocol.md §5.7): Lua streams "death:hold" and the line follows it at the page's
 * frame rate, painted straight to the DOM without a React render (the prompt's own `progress`
 * stays at its first value, so React leaves the painting alone).
 */
function RespawnPrompt({ keyName, cost, hold = 0 }: { keyName: string; cost?: number; hold?: number }) {
  const fmt = useFormatMoney()
  const ref = React.useRef<HTMLDivElement>(null)
  useFollow(
    "death:hold",
    (v) => {
      const line = ref.current?.querySelector<HTMLElement>("[data-slot=key-prompt-hold]")
      if (line) line.style.transform = `scaleX(${Math.max(0, Math.min(1, v))})`
    },
    { start: hold }
  )
  return (
    <KeyPrompt
      ref={ref}
      surface="hud"
      size="sm"
      keys={keyName}
      label="Hold to respawn"
      description={cost ? fmt(cost) : undefined}
      hold={0}
      progress={hold}
    />
  )
}

export { DeathScreen, DeathScreenSurface, deathClock }
