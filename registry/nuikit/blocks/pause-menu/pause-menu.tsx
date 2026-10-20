import * as React from "react"
import { fetchNui, Surface, usePlayer, type NuiPlayer } from "nuikit-core/react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MenuRow } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Separator } from "@/components/ui/separator"
import { Stat } from "@/components/ui/stat"

import type { PauseMenuAction, PauseMenuData } from "./nui"

/**
 * PauseMenu — Esc opens this in place of GTA's pause menu: the server and the actions on a rail at
 * the left, the player and the server on cards at the right, the game blurred behind. Map, Settings
 * and Key bindings hand over to the game's own pages; Disconnect asks first. Built from the kit:
 * MenuRow, Panel, Stat, Meter, with stock shadcn Avatar, Separator and AlertDialog.
 *
 *   <PauseMenuSurface />                                  // wired: nk.surface('pause', …) in Lua opens it
 *   <PauseMenu data={data} player={player} />             // a still, for previews
 *
 * Escape closes it through nuikit (the surface's default), so it never fights another UI for Esc.
 */
function PauseMenuSurface() {
  // Subscribed here, not inside the menu: the bridge only sends the player when it changes, so a
  // listener that mounts with the menu would miss it.
  const player = usePlayer()
  return (
    <Surface name="pause" layer="modal" input="full" exclusive hides={["hud"]} blockedBy={["dead"]}>
      {(data) => <PauseMenu data={data} player={player} onAction={(action) => void fetchNui("pause:action", { action }).catch(() => {})} />}
    </Surface>
  )
}

const ACTIONS: Record<Exclude<PauseMenuAction, "disconnect">, { label: string; icon: LucideIcon; kbd?: string }> = {
  resume: { label: "Resume", icon: PlayIcon, kbd: "Esc" },
  map: { label: "Map", icon: MapIcon, kbd: "P" },
  settings: { label: "Settings", icon: SettingsIcon },
  keybinds: { label: "Key bindings", icon: KeyboardIcon },
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

/** 45 min, 3 h 12 min, 2 d 4 h */
function pauseDuration(seconds: number | undefined) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "—"
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${Math.max(1, m)} min`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h} h ${m % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

/** "Alex Mercer" → "AM" */
function pauseInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase()
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function PauseMenu({
  data,
  player,
  onAction,
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: PauseMenuData
  player: NuiPlayer
  onAction?: (action: PauseMenuAction) => void
  /** Focus Resume when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const actions = list(data?.actions)
  const server = data?.server ?? {}
  const nav = React.useRef<HTMLElement>(null)

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
      <div className="nk-enter absolute -inset-8 bg-scrim/40 backdrop-blur-lg" aria-hidden />
      <div className="absolute inset-0 bg-linear-to-r from-background from-25% to-transparent to-60% opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-radial-[120%_90%_at_70%_50%] from-transparent from-45% to-scrim/55" aria-hidden />

      <div className="nk-enter relative flex h-full">
        <aside className="flex h-full w-80 shrink-0 flex-col p-12">
          <header className="flex items-center gap-3">
            {server.logo ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {server.logo}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-xl leading-7 font-semibold tracking-tight">{server.name || "Paused"}</h1>
              {server.tagline ? <p className="truncate text-sm text-muted-foreground">{server.tagline}</p> : null}
            </div>
          </header>

          <nav ref={nav} className="mt-12 flex flex-col gap-0.5" aria-label="Pause menu" onKeyDown={onKeyDown}>
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
            {actions.includes("disconnect") && (
              <>
                <Separator className="my-3" />
                <PauseDisconnect onConfirm={() => onAction?.("disconnect")} />
              </>
            )}
          </nav>

          <dl className="mt-auto flex flex-col gap-2 text-sm">
            {list(data?.links).map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{l.label}</dt>
                <dd className="truncate font-medium">{l.value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <main className="ml-auto flex w-[26rem] shrink-0 flex-col items-end justify-center gap-4 px-12">
          <PausePlayerCard player={player} data={data} />
          <PauseServerCard data={data} />
        </main>
      </div>
    </div>
  )
}

/** Disconnect, behind a confirm: the one destructive action. */
function PauseDisconnect({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <MenuRow tone="destructive" icon={<LogOutIcon />}>
          Disconnect
        </MenuRow>
      </AlertDialogTrigger>
      <AlertDialogContent className="nk-panel nk-enter gap-4 p-6 data-[size=default]:sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="nk-title">Leave the server?</AlertDialogTitle>
          <AlertDialogDescription>Your character is saved. You can reconnect from the server list at any time.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PausePlayerCard({ player, data }: { player: NuiPlayer; data: PauseMenuData }) {
  const name = (player.loaded && player.name) || data?.playerName || "Player"
  const job = player.loaded ? player.job : undefined
  const role = job ? [job.label ?? job.name, job.gradeLabel].filter(Boolean).join(", ") : player.loaded ? "Civilian" : "No character loaded"
  const showMoney = player.loaded && (player.cash !== undefined || player.bank !== undefined)
  const { players, maxPlayers: max } = data ?? {}

  return (
    <Panel>
      <PanelHeader
        icon={
          <Avatar className="size-10">
            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">{pauseInitials(name)}</AvatarFallback>
          </Avatar>
        }
        title={name}
        description={
          <span className="flex items-center gap-1.5">
            <span className="truncate">{role}</span>
            {job?.onDuty !== undefined && (
              <span
                className={cn("size-1.5 shrink-0 rounded-full", job.onDuty ? "bg-primary" : "bg-muted-foreground/50")}
                aria-label={job.onDuty ? "On duty" : "Off duty"}
              />
            )}
          </span>
        }
      />
      {showMoney && (
        <PanelBody variant="form" className="grid grid-cols-2">
          <Stat icon={<WalletIcon />} label="Cash" value={player.cash !== undefined ? money.format(player.cash) : "—"} />
          <Stat icon={<LandmarkIcon />} label="Bank" value={player.bank !== undefined ? money.format(player.bank) : "—"} />
        </PanelBody>
      )}
      <PanelFooter className="flex-col items-stretch gap-3">
        {players !== undefined && max ? (
          <Meter icon={<UsersIcon />} label="Players online" value={players} max={max} valueText={`${players} / ${max}`} size="sm" />
        ) : (
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-4 text-muted-foreground" />
            <span className="nk-label flex-1">Players online</span>
            <span className="nk-num text-xs font-medium">{players ?? "—"}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="nk-label">Server ID</span>
          <span className="nk-num text-xs font-medium">{data?.serverId ?? "—"}</span>
        </div>
      </PanelFooter>
    </Panel>
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
