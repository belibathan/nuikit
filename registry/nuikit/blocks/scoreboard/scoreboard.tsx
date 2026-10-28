import * as React from "react"
import { Surface } from "nuikit-core/react"
import { SearchIcon, UsersIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Chip } from "@/components/ui/chip"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { MenuRow } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"

import type { ScoreboardActivity, ScoreboardData, ScoreboardPlayer } from "./nui"

/**
 * Scoreboard — who's online, with server IDs, jobs and ping, a search, and what can be done right
 * now (activities and the jobs they need). Read only: nothing goes back to Lua. Built from the kit:
 * Panel (a search under the title), Meter, MenuRow (read-only activity rows), EmptyState, Badge and
 * stock shadcn Input.
 *
 *   <ScoreboardSurface />                         // wired: nk.surface('scoreboard', …) in Lua opens it
 *   <Scoreboard data={data} />                    // a still, for previews
 */
function ScoreboardSurface() {
  return (
    <Surface name="scoreboard" layer="panel" exclusive>
      {(data) => (data ? <Scoreboard data={data} className="absolute inset-x-0 top-[15%] mx-auto" /> : null)}
    </Surface>
  )
}

type PingLevel = "good" | "fair" | "poor"

/** Under 100 ms is good, under 200 fair, the rest poor (shown in warning / destructive). */
function pingLevel(ms: number | undefined): PingLevel {
  if (ms === undefined || !Number.isFinite(ms) || ms < 100) return "good"
  return ms < 200 ? "fair" : "poor"
}

/** Players matching a search by name, server ID or job, sorted by server ID. */
function filterPlayers(players: ScoreboardPlayer[], query: string) {
  const q = query.trim().toLowerCase()
  const sorted = [...players].sort((a, b) => a.id - b.id)
  if (!q) return sorted
  return sorted.filter((p) => String(p.id) === q || p.name.toLowerCase().includes(q) || (p.job ?? "").toLowerCase().includes(q))
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

function Scoreboard({
  data,
  query: initialQuery = "",
  autoFocus = true,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: ScoreboardData
  /** Start with this search (for previews). */
  query?: string
  /** Focus the search when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const [query, setQuery] = React.useState(initialQuery)
  const players = list(data.players)
  const shown = filterPlayers(players, query)
  const activities = list(data.activities)

  return (
    <div data-slot="scoreboard" className={cn("flex w-max items-start gap-4", className)} {...props}>
      <Panel className="w-[34rem]">
        <PanelHeader
          icon={<UsersIcon />}
          title={data.title || "Players"}
          actions={
            <span className="nk-text-num text-(length:--nk-text-label) [font-weight:var(--nk-type-label-weight,500)]">
              {players.length}
              {data.max ? <span className="text-muted-foreground"> / {data.max}</span> : null}
            </span>
          }
          tabs={
            <div className="flex flex-col gap-3">
              {data.max ? <Meter aria-label="Players online" value={players.length} max={data.max} size="sm" /> : null}
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute inset-y-0 left-2.5 my-auto size-4 text-muted-foreground" />
                <Input
                  autoFocus={autoFocus}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, ID or job"
                  aria-label="Search players"
                  className="h-8 pl-8"
                />
              </div>
            </div>
          }
        />
        <PanelBody scroll className="max-h-[26rem]">
          <div role="table" aria-label="Players">
            {shown.length ? (
              shown.map((p) => <ScoreboardRow key={p.id} player={p} />)
            ) : players.length ? (
              <EmptyState icon={<SearchIcon />} title={`No one matches "${query.trim()}"`} description="Try a name, a server ID or a job." />
            ) : (
              <EmptyState icon={<UsersIcon />} title="No one else is online yet" description="You'll see players here as they join." />
            )}
          </div>
        </PanelBody>
        <PanelFooter className="nk-text-label">
          <span className="flex-1">Ping</span>
          <span className="flex items-center gap-(--nk-space-2)">
            <Chip variant="dot" aria-hidden />
            Under 100 ms
          </span>
          <span className="flex items-center gap-(--nk-space-2)">
            <Chip variant="dot" tone="warning" aria-hidden />
            Under 200
          </span>
          <span className="flex items-center gap-(--nk-space-2)">
            <Chip variant="dot" tone="danger" aria-hidden />
            Slower
          </span>
        </PanelFooter>
      </Panel>
      {activities.length > 0 && <ScoreboardActivities activities={activities} />}
    </div>
  )
}

function ScoreboardRow({ player: p }: { player: ScoreboardPlayer }) {
  const level = pingLevel(p.ping)
  return (
    <div role="row" data-slot="scoreboard-row" data-you={p.you || undefined} className={cn("nk-row", p.you && "bg-accent text-accent-foreground")}>
      <span role="cell" className="nk-text-num w-10 shrink-0 text-(length:--nk-text-label) text-muted-foreground">
        {p.id}
      </span>
      <span role="cell" className="flex min-w-0 flex-1 items-center gap-2 [font-weight:var(--nk-type-label-weight,500)]">
        <span className="truncate">{p.name}</span>
        {p.you && <Badge variant="outline">You</Badge>}
      </span>
      <span role="cell" className="w-28 shrink-0 truncate text-(length:--nk-text-label) text-muted-foreground">
        {p.job ?? ""}
      </span>
      <span
        role="cell"
        className={cn(
          "nk-text-num w-14 shrink-0 text-right text-(length:--nk-text-label)",
          level === "good" && "text-muted-foreground",
          level === "fair" && "text-warning",
          level === "poor" && "text-destructive"
        )}
      >
        {p.ping !== undefined ? `${p.ping} ms` : "—"}
      </span>
    </div>
  )
}

/** What can be done right now, and what it needs. */
function ScoreboardActivities({ activities }: { activities: ScoreboardActivity[] }) {
  return (
    <Panel size="sm">
      <PanelHeader title="Activities" description={`${activities.filter((a) => a.available).length} of ${activities.length} available`} />
      <PanelBody>
        {activities.map((a) => (
          <MenuRow
            key={a.id}
            data-scoreboard-activity
            readOnly
            icon={
              <Chip variant="dot" tone={a.available ? "success" : undefined} aria-label={a.available ? "Available" : "Not available"} />
            }
            description={a.detail}
            className={cn(!a.available && "text-muted-foreground")}
          >
            {a.label}
          </MenuRow>
        ))}
      </PanelBody>
    </Panel>
  )
}

export { Scoreboard, ScoreboardSurface, filterPlayers, pingLevel }
