import * as React from "react"
import { Surface } from "nuikit-core/react"
import { SearchIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Meter } from "@/components/ui/meter"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"

import type { ScoreboardActivity, ScoreboardData, ScoreboardPlayer } from "./nui"

/**
 * Scoreboard — who's online, with server IDs, jobs and ping, a search, and what can be done right
 * now (activities and the jobs they need). Read only: nothing goes back to Lua. Built from the kit:
 * Panel (a search under the title), Meter, Badge and stock shadcn Input.
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
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: ScoreboardData
  /** Start with this search (for previews). */
  query?: string
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
            <span className="nk-num text-sm font-medium">
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
                  autoFocus
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
            ) : (
              <p className="nk-row text-muted-foreground">
                {players.length ? `No one matches "${query.trim()}". Try a name, a server ID or a job.` : "No one else is online yet."}
              </p>
            )}
          </div>
        </PanelBody>
        <PanelFooter className="nk-label">
          <span className="flex-1">Ping</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Under 100 ms
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-warning" />
            Under 200
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive" />
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
      <span role="cell" className="nk-num w-10 shrink-0 text-xs text-muted-foreground">
        {p.id}
      </span>
      <span role="cell" className="flex min-w-0 flex-1 items-center gap-2 font-medium">
        <span className="truncate">{p.name}</span>
        {p.you && <Badge variant="outline">You</Badge>}
      </span>
      <span role="cell" className="w-28 shrink-0 truncate text-sm text-muted-foreground">
        {p.job ?? ""}
      </span>
      <span
        role="cell"
        className={cn(
          "nk-num w-14 shrink-0 text-right text-xs",
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
          <div key={a.id} data-slot="scoreboard-activity" className={cn("nk-row", !a.available && "text-muted-foreground")}>
            <span
              className={cn("size-2 shrink-0 rounded-full", a.available ? "bg-success" : "bg-muted-foreground/40")}
              aria-label={a.available ? "Available" : "Not available"}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{a.label}</span>
              {a.detail && <span className="truncate text-xs leading-4 text-muted-foreground">{a.detail}</span>}
            </span>
          </div>
        ))}
      </PanelBody>
    </Panel>
  )
}

export { Scoreboard, ScoreboardSurface, filterPlayers, pingLevel }
