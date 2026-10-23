import * as React from "react"
import { applyTheme } from "nuikit-core"
import { CheckIcon, Volume2Icon, VolumeXIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Meter } from "@/components/ui/meter"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Stat } from "@/components/ui/stat"

import { useHandover, type LoadingHandover, type LoadingLink, type LoadingTip } from "./handover"
import { LOAD_PHASES, useLoadProgress, type LoadState } from "./progress"

/**
 * LoadingScreen — what players look at while the game loads: the server's name, tips, links, the
 * real load progress (the game's own load events, phase by phase), backgrounds and music. Opaque,
 * themed by the server's nuikit theme, which arrives with the connection handover because a loading
 * screen starts before any resource. Built from the kit: Meter, Stat, plus stock shadcn Spinner,
 * Separator and Button.
 *
 *   <LoadingScreenPage />                                 // wired: the handover and the game's load events
 *   <LoadingScreen handover={h} load={load} />            // a still, for previews
 */
function LoadingScreenPage() {
  const handover = useHandover()
  const load = useLoadProgress()
  // The server theme arrives with the handover (the compiled theme, or theme.css as it is).
  React.useEffect(() => {
    if (handover.theme) applyTheme(handover.theme)
  }, [handover.theme])
  return <LoadingScreen handover={handover} load={load} />
}

function LoadingScreen({
  handover: h,
  load,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { handover: LoadingHandover; load: LoadState }) {
  return (
    <div data-slot="loading-screen" className={cn("relative h-full w-full overflow-hidden bg-background text-foreground", className)} {...props}>
      <LoadingBackdrop images={h.backgrounds ?? []} interval={h.backgroundInterval} />

      <header className="absolute top-12 left-12 flex items-center gap-4">
        {h.logo && <img src={h.logo} alt="" className="size-12 rounded-(--nk-r-control) object-contain" />}
        <div className="flex flex-col gap-1">
          {/* the server name: the screen's display moment (the identity's display face) */}
          <h1 className="nk-display [--nk-display-size:var(--nk-text-section)]">{h.serverName || "Welcome"}</h1>
          {h.tagline && <p className="nk-label">{h.tagline}</p>}
        </div>
      </header>

      <div className="absolute top-12 right-12">
        <LoadingMusic tracks={h.music ?? []} volume={h.musicVolume} />
      </div>

      <main className="absolute inset-x-12 bottom-12 flex flex-col gap-12">
        <div className="flex items-end justify-between gap-12">
          <LoadingTips tips={h.tips ?? []} interval={h.tipInterval} />
          <LoadingLinks links={h.links ?? []} />
        </div>
        <LoadingStatus load={load} player={h.playerName} />
      </main>
    </div>
  )
}

/** Configured images, cross-faded; the theme's own light without them. A scrim keeps text legible. */
function LoadingBackdrop({ images, interval = 9000 }: { images: string[]; interval?: number }) {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (images.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % images.length), Math.max(3000, interval))
    return () => clearInterval(t)
  }, [images.length, interval])

  return (
    <div className="absolute inset-0" aria-hidden>
      {images.length === 0 && (
        <>
          <div className="absolute inset-0 bg-radial-[60%_70%_at_85%_10%] from-primary/20 to-transparent to-70%" />
          <div className="absolute inset-0 bg-radial-[50%_60%_at_10%_100%] from-chart-2/20 to-transparent to-70%" />
        </>
      )}
      {images.map((src, n) => (
        <div
          key={src + n}
          // a slow image cross-fade (opacity only); zero under the theme's motion off
          className={cn("absolute inset-0 bg-cover bg-center transition-opacity [transition-duration:calc(1600ms*var(--nk-motion,1))]", n === i ? "opacity-100" : "opacity-0")}
          style={{ backgroundImage: `url("${src}")` }}
        />
      ))}
      {/* dark at the bottom (status) and the top (name), whatever the image */}
      <div className="absolute inset-0 bg-linear-to-t from-background/95 via-background/40 via-40% to-background/50" />
    </div>
  )
}

function LoadingTips({ tips, interval = 8000 }: { tips: LoadingTip[]; interval?: number }) {
  const [i, setI] = React.useState(0)
  React.useEffect(() => {
    if (tips.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % tips.length), Math.max(3000, interval))
    return () => clearInterval(t)
  }, [tips.length, interval])
  if (tips.length === 0) return <div />

  const tip = tips[i % tips.length]!
  const { title, text } = typeof tip === "string" ? { title: undefined, text: tip } : tip
  return (
    <section className="flex w-96 flex-col gap-3" aria-label="Tip">
      <div key={i} className="nk-enter flex min-h-16 flex-col justify-end gap-1">
        {title && <h2 className="nk-title">{title}</h2>}
        <p className="text-(length:--nk-text-label) leading-relaxed text-muted-foreground">{text}</p>
      </div>
      {tips.length > 1 && (
        <div className="flex items-center gap-1" aria-hidden>
          {/* the current tip's dot is long and solid; the change is instant (no width animation, motion rule 4) */}
          {tips.map((_, n) => (
            <span
              key={n}
              className={cn("h-0.5 bg-foreground", n === i % tips.length ? "w-6" : "w-3 opacity-25")}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function LoadingLinks({ links }: { links: LoadingLink[] }) {
  if (links.length === 0) return null
  return (
    <dl className="flex items-center gap-6 text-(length:--nk-text-label)">
      {links.map((l, n) => (
        <div key={l.label + n} className="flex items-center gap-6">
          {n > 0 && <Separator orientation="vertical" className="h-8!" />}
          <div className="flex flex-col gap-(--nk-space-1) text-right">
            <dt className="nk-label">{l.label}</dt>
            {l.url && <dd className="[font-weight:var(--nk-type-label-weight,500)]">{l.url}</dd>}
          </div>
        </div>
      ))}
    </dl>
  )
}

function LoadingStatus({ load, player }: { load: LoadState; player?: string }) {
  const pct = Math.round(load.fraction * 100)
  const ready = load.phase === "ready"
  const detail = ready ? undefined : load.phase === "finishing" ? load.log : load.detail
  return (
    <section className="flex flex-col gap-3" aria-live="off">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          {player && <p className="nk-label">Welcome, {player}</p>}
          <p className="nk-title flex items-center gap-2">
            {ready ? <CheckIcon className="size-4" /> : <Spinner className="size-4 text-muted-foreground" />}
            {ready ? "Ready. Hang tight…" : LOAD_PHASES[load.phase]}
          </p>
        </div>
        {/* the number is the point: display size in the identity's numeric face */}
        <Stat size="display" align="end" label="Loaded" value={pct} meta="%" />
      </div>
      <Meter aria-label="Loading" value={pct} tone="foreground" size="sm" />
      <div className="nk-label flex h-4 items-center justify-between gap-6 font-normal">
        <span className="truncate">{detail}</span>
        {load.count > 0 && (
          <span className="nk-num shrink-0">
            {load.idx} / {load.count}
          </span>
        )}
      </div>
    </section>
  )
}

/** Background music with a mute toggle, remembered on this PC. */
function LoadingMusic({ tracks, volume = 0.15 }: { tracks: string[]; volume?: number }) {
  const audio = React.useRef<HTMLAudioElement>(null)
  const [track, setTrack] = React.useState(0)
  const [muted, setMuted] = React.useState(() => {
    try {
      return localStorage.getItem("nuikit:loading:muted") === "1"
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    const a = audio.current
    if (!a) return
    a.volume = Math.max(0, Math.min(1, volume))
    a.muted = muted
    if (!muted) a.play().catch(() => {})
    try {
      localStorage.setItem("nuikit:loading:muted", muted ? "1" : "0")
    } catch {
      /* storage unavailable */
    }
  }, [muted, volume, track, tracks.length])

  if (tracks.length === 0) return null
  return (
    <>
      <audio
        ref={audio}
        src={tracks[track % tracks.length]}
        autoPlay
        loop={tracks.length === 1}
        onEnded={() => setTrack((t) => (t + 1) % tracks.length)}
      />
      <Button
        variant="outline"
        size="icon"
        className="size-9 rounded-(--nk-r-control) bg-background/40"
        aria-label={muted ? "Unmute music" : "Mute music"}
        onClick={() => setMuted((m) => !m)}
      >
        {muted ? <VolumeXIcon /> : <Volume2Icon />}
      </Button>
    </>
  )
}

export { LoadingScreen, LoadingScreenPage }
