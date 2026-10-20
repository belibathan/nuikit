import * as React from "react"
import { Surface, useFollow } from "nuikit-core/react"
import { CheckIcon, HeartPulseIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { HudChip } from "@/components/ui/hud-chip"
import { Kbd } from "@/components/ui/kbd"
import { Meter } from "@/components/ui/meter"

import type { DeathScreenData } from "./nui"

/**
 * DeathScreen — last stand and death, over the game: a countdown, a bar, and the keys your Lua
 * listens for (respawn, call EMS). Presentation only: your medical script owns the rules and sends
 * a DeathScreenData snapshot; this draws it. Built from the kit: Meter, HudChip, Kbd.
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

/** 125 → "02:05". */
function deathClock(seconds: number) {
  const t = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`
}

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
      className={cn("absolute inset-0 overflow-hidden text-foreground", className)}
      {...props}
    >
      {/* the game behind, darkened; red bleeding in from the edges (pulsing while down) */}
      <div className={cn("nk-enter absolute inset-0", down ? "bg-scrim/40" : "bg-scrim/60")} aria-hidden />
      <div
        className={cn("absolute inset-0", down ? "animate-pulse opacity-70" : "opacity-30")}
        style={{ background: "radial-gradient(ellipse 72% 68% at 50% 45%, transparent 38%, var(--destructive) 100%)" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(ellipse 72% 72% at 50% 45%, transparent 30%, var(--scrim) 100%)" }}
        aria-hidden
      />

      {/* above centre: the bottom of the screen stays clear for the game's own prompts */}
      <div className="nk-enter nk-shadow absolute inset-x-0 top-[20%] flex flex-col items-center px-12 text-center">
        <h1 className="nk-display">{data.title ?? (down ? "You are down" : "You are unconscious")}</h1>
        {data.subtitle && <p className="mt-2 max-w-xl text-base text-foreground/75">{data.subtitle}</p>}

        {timed ? (
          <div className="mt-12 flex flex-col items-center">
            <div
              role="timer"
              aria-live="off"
              className={cn(
                "nk-num text-[8rem] leading-none font-semibold",
                down && seconds <= 30 && "text-destructive",
                !down && seconds <= 0 && "text-foreground/40"
              )}
            >
              {deathClock(seconds)}
            </div>
            <div className="mt-4 text-sm font-medium text-foreground/75">{label}</div>
            {data.total && (down || seconds > 0) ? (
              <Meter
                aria-label={label}
                value={seconds}
                max={data.total}
                tone={down ? "destructive" : "foreground"}
                track="game"
                size="sm"
                className="mt-6 w-80"
              />
            ) : null}
          </div>
        ) : (
          <div className="mt-12 text-sm font-medium text-foreground/75">Waiting for help</div>
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
        <HudChip icon={<HeartPulseIcon />} className="[&_[data-slot=hud-chip-icon]]:text-destructive [&_[data-slot=hud-chip-icon]]:opacity-100">
          Another player can revive you
        </HudChip>
      )}

      {ems &&
        (ems.state === "requested" ? (
          <HudChip icon={<CheckIcon />}>EMS have been notified</HudChip>
        ) : (
          <KeyChip keyName={ems.key} muted={ems.state === "cooldown"} meta={ems.state === "cooldown" ? `in ${ems.seconds ?? 0}s` : undefined}>
            Call EMS
          </KeyChip>
        ))}

      {respawn &&
        (respawn.available ? (
          <div className="flex flex-col gap-1.5">
            <KeyChip keyName={respawn.key} meta={respawn.cost ? money.format(respawn.cost) : undefined}>
              Hold to respawn
            </KeyChip>
            <HoldMeter hold={hold} />
          </div>
        ) : (
          <KeyChip keyName={respawn.key} muted meta={respawn.wait ? `in ${respawn.wait}s` : "after the timer"}>
            Respawn
          </KeyChip>
        ))}
    </div>
  )
}

/** A HudChip led by the key (shadcn Kbd) that triggers it, with quiet meta after the label. Muted while the key isn't accepted. */
function KeyChip({ keyName, muted, meta, children }: { keyName: string; muted?: boolean; meta?: string; children: React.ReactNode }) {
  return (
    <HudChip
      icon={<Kbd className="h-4 min-w-4 bg-hud-foreground/20 text-hud-foreground">{keyName}</Kbd>}
      className={cn("pl-1.5", muted && "opacity-60")}
    >
      {children}
      {meta && <span className="ml-1.5 opacity-70">{meta}</span>}
    </HudChip>
  )
}

/**
 * The respawn key's hold, 0–1. A live value (docs/protocol.md §5.7): Lua streams "death:hold" and
 * the bar follows it at the page's frame rate, painted straight to the DOM without a React render.
 */
function HoldMeter({ hold = 0 }: { hold?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  useFollow(
    "death:hold",
    (v) => {
      const bar = ref.current?.querySelector<HTMLElement>("[data-slot=progress-indicator]")
      if (!bar) return
      bar.style.transition = "none"
      bar.style.transform = `translateX(-${100 - Math.max(0, Math.min(1, v)) * 100}%)`
    },
    { start: hold }
  )
  return <Meter ref={ref} aria-label="Respawn" value={hold * 100} tone="foreground" track="game" size="sm" />
}

export { DeathScreen, DeathScreenSurface, deathClock }
