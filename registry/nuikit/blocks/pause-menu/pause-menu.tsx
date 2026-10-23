import * as React from "react"
import { fetchNui, Surface, usePlayer, useSurface, type NuiPlayer } from "nuikit-core/react"
import {
  ActivityIcon,
  KeyboardIcon,
  LandmarkIcon,
  LogOutIcon,
  MapIcon,
  PlayIcon,
  SettingsIcon,
  TimerIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Confirm } from "@/components/ui/confirm"
import { MenuRow, MenuRowList } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { Money } from "@/components/ui/money"
import { Panel, PanelBody } from "@/components/ui/panel"
import { PlayerCard, initials } from "@/components/ui/player-card"
import { Separator } from "@/components/ui/separator"
import { Stat } from "@/components/ui/stat"

import type { PauseMenuAction, PauseMenuData } from "./nui"

/**
 * PauseMenu — Esc opens this in place of GTA's pause menu: the server and the actions on a rail at
 * the left, the player and the server on cards at the right, the game blurred behind. Map, Settings
 * and Key bindings hand over to the game's own pages; Disconnect asks first. Built from the kit:
 * MenuRow, PlayerCard, Panel, Stat, Money, Meter, Confirm, with stock shadcn Separator.
 *
 *   <PauseMenuSurface />                                  // wired: nk.surface('pause', …) in Lua opens it
 *   <PauseMenu data={data} player={player} />             // a still, for previews
 *
 * Escape goes through nuikit (escape = 'back'), so it never fights another UI for Esc: it closes
 * the Disconnect confirm when that's open, else the menu.
 */
function PauseMenuSurface() {
  // Subscribed here, not inside the menu: the bridge only sends the player when it changes, so a
  // listener that mounts with the menu would miss it.
  const player = usePlayer()
  const pause = useSurface("pause")
  const back = React.useRef<() => void>(() => pause.close())
  return (
    <Surface name="pause" layer="modal" input="full" exclusive escape="back" onBack={() => back.current()} hides={["hud"]} blockedBy={["dead"]}>
      {(data) => (
        <PauseMenu
          data={data}
          player={player}
          onBack={(fn) => (back.current = fn)}
          onClose={() => pause.close()}
          onAction={(action) => void fetchNui("pause:action", { action }).catch(() => {})}
        />
      )}
    </Surface>
  )
}

const ACTIONS: Record<Exclude<PauseMenuAction, "disconnect">, { label: string; icon: LucideIcon; kbd?: string }> = {
  resume: { label: "Resume", icon: PlayIcon, kbd: "Esc" },
  map: { label: "Map", icon: MapIcon, kbd: "P" },
  settings: { label: "Settings", icon: SettingsIcon },
  keybinds: { label: "Key bindings", icon: KeyboardIcon },
}

/** 45 min, 3 h 12 min, 2 d 4 h */
function pauseDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—"
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${Math.max(1, m)} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ${m % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

/** "Alex Mercer" → "AM". The kit's player-card `initials`, kept under its old name. */
const pauseInitials = initials

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function PauseMenu({
  data,
  player,
  onAction,
  onBack,
  onClose,
  autoFocus = true,
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: PauseMenuData
  player: NuiPlayer
  onAction?: (action: PauseMenuAction) => void
  /** Gives the surface what Escape should do now (close the confirm, else the menu). */
  onBack?: (fn: () => void) => void
  onClose?: () => void
  /** Start with the Disconnect confirm open (stills). */
  confirming?: boolean
  /** Focus Resume when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const actions = list(data?.actions)
  const server = data?.server ?? {}
  const nav = React.useRef<HTMLElement>(null)
  const [confirming, setConfirming] = React.useState(!!confirmingProp)

  // Escape: the confirm first, then the menu.
  React.useEffect(() => {
    onBack?.(() => (confirming ? setConfirming(false) : onClose?.()))
  }, [confirming, onBack, onClose])

  // Up / Down (or W / S) move between the rows, like GTA's menu; Enter presses one.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    const dir = k === "arrowdown" || k === "s" ? 1 : k === "arrowup" || k === "w" ? -1 : 0
    if (!dir) return
    const rows = [...(nav.current?.querySelectorAll<HTMLElement>("[data-slot=menu-row]") ?? [])]
    if (!rows.length) return
    e.preventDefault()
    const i = rows.indexOf(document.activeElement as HTMLElement)
    rows[(i + dir + rows.length) % rows.length]?.focus()
  }

  return (
    <div data-slot="pause-menu" className={cn("absolute inset-0 overflow-hidden text-foreground", className)} {...props}>
      {/* the game, blurred; the rail's side solid in the theme's background; a vignette so the cards float */}
      <div className="nk-enter absolute -inset-8 bg-scrim/40" aria-hidden />
      <div className="absolute inset-0 bg-linear-to-r from-background from-25% to-transparent to-60% opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-radial-[120%_90%_at_70%_50%] from-transparent from-45% to-scrim/55" aria-hidden />

      <div className="nk-enter relative flex h-full">
        <aside className="flex h-full w-80 shrink-0 flex-col p-12">
          <header className="flex items-center gap-3">
            {server.logo ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-(--nk-r-control) bg-primary text-(length:--nk-text-label) [font-weight:var(--nk-weight-strong,600)] text-primary-foreground">
                {server.logo}
              </div>
            ) : null}
            <div className="min-w-0">
              {/* the pause title: one of the screen's display moments (the identity's display face) */}
              <h1 className="nk-display truncate [--nk-display-size:var(--nk-text-section)]">{server.name || "Paused"}</h1>
              {server.tagline ? <p className="nk-label truncate">{server.tagline}</p> : null}
            </div>
          </header>

          <nav ref={nav} className="mt-12 flex flex-col" aria-label="Pause menu" onKeyDown={onKeyDown}>
            {/* one SelectionTile slides from row to row with the focus (docs/design/baseline.md, Selection) */}
            <MenuRowList>
              {actions.map((a, i) => {
                if (a === "disconnect") return null
                const item = ACTIONS[a]
                if (!item) return null
                return (
                  <MenuRow key={a} autoFocus={autoFocus && i === 0} icon={<item.icon />} kbd={item.kbd} onClick={() => onAction?.(a)}>
                    {item.label}
                  </MenuRow>
                )
              })}
            </MenuRowList>
            {actions.includes("disconnect") && (
              <>
                <Separator className="my-3" />
                <MenuRow tone="destructive" icon={<LogOutIcon />} onClick={() => setConfirming(true)}>
                  Disconnect
                </MenuRow>
              </>
            )}
          </nav>

          <dl className="mt-auto flex flex-col gap-2">
            {list(data?.links).map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4">
                <dt className="nk-caption">{l.label}</dt>
                <dd className="truncate text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight,500)]">{l.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <main className="ml-auto flex w-[26rem] shrink-0 flex-col items-end justify-center gap-4 px-12">
          <PausePlayerCard player={player} data={data} />
          <PauseServerCard data={data} />
        </main>
      </div>

      {confirming && (
        <Confirm
          tone="destructive"
          size="sm"
          title="Leave the server?"
          description="Your character is saved. You can reconnect from the server list at any time."
          cancelLabel="Stay"
          confirmLabel="Disconnect"
          initialFocus="cancel"
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false)
            onAction?.("disconnect")
          }}
        />
      )}
    </div>
  )
}

function PausePlayerCard({ player, data }: { player: NuiPlayer; data: PauseMenuData }) {
  const name = (player.loaded && player.name) || data?.playerName || "Player"
  const job = player.loaded ? player.job : undefined
  const role = job ? [job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ") : player.loaded ? "Civilian" : "No character loaded"
  const showMoney = player.loaded && (player.cash !== undefined || player.bank !== undefined)
  const { players, maxPlayers: max } = data ?? {}

  // The kit's PlayerCard: avatar or initials, name, job and grade, the duty dot and words, and the
  // money as stats. The server's numbers (players online, your server ID) go under them.
  return (
    <PlayerCard
      name={name}
      job={job ? (job.label ?? job.name) : role}
      grade={job?.gradeLabel}
      onDuty={job?.onDuty}
      stats={
        showMoney
          ? [
              { label: "Cash", icon: <WalletIcon />, value: player.cash !== undefined ? <Money amount={player.cash} /> : "—" },
              { label: "Bank", icon: <LandmarkIcon />, value: player.bank !== undefined ? <Money amount={player.bank} /> : "—" },
            ]
          : []
      }
      actions={
        <div className="flex w-full flex-col gap-3">
          {players !== undefined && max ? (
            <Meter icon={<UsersIcon />} label="Players online" value={players} max={max} valueText={`${players} / ${max}`} size="sm" />
          ) : (
            <Stat size="sm" icon={<UsersIcon />} label="Players online" value={players ?? "—"} />
          )}
          <div className="flex items-center justify-between">
            <span className="nk-caption">Server ID</span>
            <span className="nk-num text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight,500)]">{data?.serverId ?? "—"}</span>
          </div>
        </div>
      }
    />
  )
}

/** Ping and uptime, once the server has answered. */
function PauseServerCard({ data }: { data: PauseMenuData }) {
  if (data?.ping === undefined && data?.uptime === undefined) return null
  return (
    <Panel>
      <PanelBody variant="form" className="grid grid-cols-2">
        <Stat size="sm" icon={<ActivityIcon />} label="Ping" value={data.ping !== undefined ? `${data.ping} ms` : "—"} />
        <Stat size="sm" icon={<TimerIcon />} label="Online for" value={pauseDuration(data.uptime)} />
      </PanelBody>
    </Panel>
  )
}

export { PauseMenu, PauseMenuSurface, pauseDuration, pauseInitials }
