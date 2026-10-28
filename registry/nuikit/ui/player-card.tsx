import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Chip } from "@/components/ui/chip"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Stat } from "@/components/ui/stat"

/**
 * PlayerCard — who someone is at a glance: avatar (or initials), name, job and grade with an
 * on/off duty dot, and a few stats (cash, citizen ID, phone…). A panel: a scoreboard row's
 * detail, a pause-menu profile, an ID check, an MDT result.
 *
 *   <PlayerCard
 *     name="Niko Bellic"
 *     avatar={mugshot}
 *     job="LSPD"
 *     grade="Sergeant"
 *     onDuty
 *     stats={[
 *       { label: "Citizen ID", value: "NKT-48210", mono: true },
 *       { label: "Cash", value: <Money amount={1520} /> },
 *     ]}
 *     actions={<Button size="sm">Message</Button>}
 *   />
 *
 * Duty is shown twice on purpose: a dot on the avatar for a glance, and the words for screen
 * readers and colour-blind players.
 *
 * Role: Who someone is at a glance: avatar, name, job and grade, duty, stats, actions.
 * Anatomy: panel > header: avatar (or initials), name, job, duty Chip dot > stats grid > footer actions
 * Props: name, avatar, job, grade, onDuty, dutyLabels, stats, columns.
 * Rules: Duty is a Chip dot and the words, never colour alone. On the panel recipe; codes in the num role.
 */

type PlayerCardStat = {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ReactNode
  /** Codes a player might type (citizen ID, plate, phone): the theme's mono font. */
  mono?: boolean
}

/** "Niko Bellic" → "NB", "  lester  " → "L", "Franklin D. Clinton" → "FC". */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return "?"
  const first = [...words[0]!][0] ?? ""
  const last = words.length > 1 ? ([...words[words.length - 1]!][0] ?? "") : ""
  return (first + last).toUpperCase()
}

function PlayerCard({
  className,
  name,
  avatar,
  job,
  grade,
  onDuty,
  dutyLabels = ["On duty", "Off duty"],
  stats = [],
  columns = 2,
  actions,
  selected,
  size = "default",
  children,
  ...props
}: Omit<React.ComponentProps<typeof Panel>, "children" | "title"> & {
  name: string
  /** A mugshot or avatar URL; initials when absent or it fails to load. */
  avatar?: string
  job?: React.ReactNode
  grade?: React.ReactNode
  /** undefined: the job has no duty (no dot). */
  onDuty?: boolean
  dutyLabels?: [React.ReactNode, React.ReactNode]
  stats?: readonly PlayerCardStat[]
  columns?: 1 | 2 | 3
  /** Footer: a Message button, a Search, a Fine. */
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  const role = [job, grade].filter((p) => p !== undefined && p !== null && p !== "")
  const duty = onDuty !== undefined
  return (
    <Panel data-slot="player-card" data-duty={duty ? (onDuty ? "on" : "off") : undefined} size={size} selected={selected} className={className} {...props}>
      <PanelHeader
        icon={
          <Avatar size="lg" data-slot="player-card-avatar">
            {avatar && <AvatarImage src={avatar} alt="" className="object-cover" />}
            <AvatarFallback className="[font-weight:var(--nk-type-label-weight)]">{initials(name)}</AvatarFallback>
            {duty && (
              <AvatarBadge
                aria-hidden
                data-slot="player-card-duty-dot"
                className={cn("ring-popover", onDuty ? "bg-success" : "bg-muted-foreground")}
              />
            )}
          </Avatar>
        }
        title={name}
        description={
          role.length > 0 ? (
            <>
              {role.map((r, i) => (
                <React.Fragment key={i}>
                  {i > 0 && ", "}
                  {r}
                </React.Fragment>
              ))}
            </>
          ) : undefined
        }
        actions={
          duty ? (
            <span data-slot="player-card-duty" className="nk-text-label flex items-center gap-(--nk-space-2)">
              <Chip variant="dot" tone={onDuty ? "success" : undefined} aria-hidden />
              {onDuty ? dutyLabels[0] : dutyLabels[1]}
            </span>
          ) : undefined
        }
      />
      {(stats.length > 0 || children) && (
        <PanelBody variant="form">
          {stats.length > 0 && (
            <div className={cn("grid gap-4", columns === 1 ? "grid-cols-1" : columns === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {stats.map((s, i) => (
                <Stat
                  key={i}
                  size="sm"
                  icon={s.icon}
                  label={s.label}
                  value={s.mono ? <span className="nk-text-num">{s.value}</span> : s.value}
                />
              ))}
            </div>
          )}
          {children}
        </PanelBody>
      )}
      {actions && <PanelFooter data-slot="player-card-actions">{actions}</PanelFooter>}
    </Panel>
  )
}

export { PlayerCard, initials, type PlayerCardStat }
