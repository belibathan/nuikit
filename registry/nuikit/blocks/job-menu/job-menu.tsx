import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { BriefcaseIcon, ChevronDownIcon, ChevronUpIcon, UserMinusIcon, UserPlusIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Confirm } from "@/components/ui/confirm"
import { EmptyState } from "@/components/ui/empty-state"
import { MenuRow } from "@/components/ui/menu-row"
import { Money } from "@/components/ui/money"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Stat } from "@/components/ui/stat"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { JobAnswer, JobEmployee, JobGrade, JobMenuData } from "./nui"

/**
 * JobMenu — your job in one panel: go on or off duty and run the job's actions; a boss also gets
 * the staff (promote, demote, fire, with a confirm) and whoever is nearby to hire. Lua answers every
 * button and its error shows at the top of the panel. Built from the kit: Panel (with a tabs
 * header), MenuRow, Stat, Money, EmptyState, Confirm (for firing), with stock shadcn Tabs, Button and
 * Spinner. Escape goes through the surface (escape = 'back'): the confirm first, then the menu.
 *
 *   <JobMenuSurface />                                // wired: nk.surface('job', …) in Lua opens it
 *   <JobMenu data={data} onRequest={…} />             // a still, or your own wiring
 */
function JobMenuSurface() {
  const job = useSurface("job")
  const back = React.useRef<() => void>(() => job.close())
  return (
    <Surface name="job" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <JobMenu
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => job.close()}
            onRequest={(req) => {
              const call =
                req.kind === "duty"
                  ? fetchNui("job:duty", { onDuty: req.onDuty })
                  : req.kind === "action"
                    ? fetchNui("job:action", { id: req.id })
                    : req.kind === "hire"
                      ? fetchNui("job:hire", { player: req.player })
                      : req.kind === "fire"
                        ? fetchNui("job:fire", { id: req.id })
                        : fetchNui("job:grade", { id: req.id, grade: req.grade })
              return call.catch(() => ({ ok: false, error: "The job didn't answer. Try again." }))
            }}
          />
        ) : null
      }
    </Surface>
  )
}

export type JobRequest =
  | { kind: "duty"; onDuty: boolean }
  | { kind: "action"; id: string }
  | { kind: "hire"; player: number }
  | { kind: "fire"; id: string }
  | { kind: "grade"; id: string; grade: number }

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** The next grade up or down from `grade`, below the boss grade; null at either end. */
function jobNextGrade(grades: JobGrade[], grade: number, dir: 1 | -1): number | null {
  const ladder = [...grades].filter((g) => !g.boss).sort((a, b) => a.grade - b.grade)
  const i = ladder.findIndex((g) => g.grade === grade)
  if (i === -1) return null
  return ladder[i + dir]?.grade ?? null
}

function JobMenu({
  data,
  onRequest,
  onBack,
  onClose,
  autoFocus = true,
  defaultTab = "actions",
  firing: firingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** The tab a boss sees first. */
  defaultTab?: "actions" | "staff"
  data: JobMenuData
  /** Ask Lua; resolve with its answer. */
  onRequest?: (req: JobRequest) => Promise<JobAnswer> | void
  /** Gives the surface what Escape should do now (close the fire confirm, else the menu). */
  onBack?: (fn: () => void) => void
  onClose?: () => void
  /** Focus the first row when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Start with the fire confirm open for this employee id (stills). */
  firing?: string
}) {
  const [tab, setTab] = React.useState<"actions" | "staff">(defaultTab)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [firing, setFiring] = React.useState<JobEmployee | null>(() => list(data.boss?.employees).find((e) => e.id === firingProp) ?? null)

  // Escape: the fire confirm first, then the menu.
  React.useEffect(() => {
    onBack?.(() => (firing ? setFiring(null) : onClose?.()))
  }, [firing, onBack, onClose])

  const send = (key: string, req: JobRequest) => {
    if (!onRequest || busy) return
    setBusy(key)
    setError(null)
    void Promise.resolve(onRequest(req))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(null))
  }

  const { job, boss } = data
  const actions = list(data.actions)
  const view = boss ? tab : "actions"

  // Up / Down move between the rows and the staff buttons; the first one takes the keyboard when
  // the menu opens and when the tab changes (after the event that switched tabs focuses its tab).
  const panel = React.useRef<HTMLDivElement>(null)
  const navRows = () =>
    [...(panel.current?.querySelectorAll<HTMLElement>("[data-nav]") ?? [])].filter(
      (el) => el.getAttribute("aria-disabled") !== "true" && !(el as HTMLButtonElement).disabled
    )
  const onKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0
    const rows = dir ? navRows() : []
    if (!rows.length) return
    e.preventDefault()
    const i = rows.indexOf(document.activeElement as HTMLElement)
    rows[(i + dir + rows.length) % rows.length]?.focus()
  }
  React.useEffect(() => {
    if (!autoFocus) return
    const t = setTimeout(() => navRows()[0]?.focus(), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus, view])

  return (
    <div data-slot="job-menu" className={cn("nk-edge absolute inset-0", className)} {...props}>
      <div className="nk-anchor-r">
        <Panel ref={panel} className="w-[30rem]" onKeyDown={onKeyDown}>
          <PanelHeader
            icon={<BriefcaseIcon />}
            title={job.label}
            description={
              <span className="flex items-center gap-(--nk-space-2)">
                <Chip variant="dot" tone={job.onDuty ? "success" : undefined} aria-hidden />
                {[job.gradeLabel, job.onDuty ? "On duty" : "Off duty"].filter(Boolean).join(", ")}
              </span>
            }
            tabs={
              boss ? (
                <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="staff">
                      Staff <span className="nk-text-num text-muted-foreground">{list(boss.employees).length}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : undefined
            }
          />

          {error && (
            <p role="alert" className="border-b px-4 py-2 text-(length:--nk-text-label) text-destructive">
              {error}
            </p>
          )}

          {view === "actions" || !boss ? (
            <PanelBody scroll className="max-h-[32rem]">
              <MenuRow
                data-nav
                description={job.onDuty ? "You're on duty" : "Clock in to use the job's actions"}
                checked={job.onDuty}
                disabled={busy === "duty"}
                onCheckedChange={(on) => send("duty", { kind: "duty", onDuty: on })}
              >
                On duty
              </MenuRow>
              {actions.map((a) => {
                const off = a.disabled || (a.onDutyOnly && !job.onDuty)
                return (
                  <MenuRow
                    key={a.id}
                    data-nav
                    description={a.onDutyOnly && !job.onDuty ? "On duty only" : a.description}
                    kbd={busy === `action:${a.id}` ? undefined : a.kbd}
                    meta={busy === `action:${a.id}` ? <Spinner /> : undefined}
                    disabled={off}
                    onClick={() => send(`action:${a.id}`, { kind: "action", id: a.id })}
                  >
                    {a.label}
                  </MenuRow>
                )
              })}
            </PanelBody>
          ) : (
            <JobStaff
              boss={boss}
              busy={busy}
              onGrade={(e, grade) => send(`grade:${e.id}`, { kind: "grade", id: e.id, grade })}
              onFire={setFiring}
              onHire={(player) => send(`hire:${player}`, { kind: "hire", player })}
            />
          )}
        </Panel>
      </div>

      {firing && (
        <Confirm
          tone="destructive"
          size="sm"
          title={`Fire ${firing.name}?`}
          description="They lose the job and its access straight away. You can hire them again later."
          cancelLabel="Keep them"
          confirmLabel="Fire"
          initialFocus="cancel"
          onCancel={() => setFiring(null)}
          onConfirm={() => {
            send(`fire:${firing.id}`, { kind: "fire", id: firing.id })
            setFiring(null)
          }}
        />
      )}
    </div>
  )
}

/** The boss's view: the job's balance, the staff with their grades, and who's nearby to hire. */
function JobStaff({
  boss,
  busy,
  onGrade,
  onFire,
  onHire,
}: {
  boss: NonNullable<JobMenuData["boss"]>
  busy: string | null
  onGrade: (e: JobEmployee, grade: number) => void
  onFire: (e: JobEmployee) => void
  onHire: (player: number) => void
}) {
  const grades = list(boss.grades)
  const label = (g: number) => grades.find((x) => x.grade === g)?.label ?? `Grade ${g}`
  const isBoss = (g: number) => !!grades.find((x) => x.grade === g)?.boss
  const employees = [...list(boss.employees)].sort((a, b) => b.grade - a.grade || a.name.localeCompare(b.name))
  const nearby = list(boss.nearby)

  return (
    <PanelBody scroll className="max-h-[32rem]">
      {boss.balance !== undefined && (
        <div className="px-3 pt-1 pb-3">
          <Stat size="sm" label="Job account" value={<Money amount={boss.balance} />} />
        </div>
      )}
      {employees.map((e) => {
        const up = jobNextGrade(grades, e.grade, 1)
        const down = jobNextGrade(grades, e.grade, -1)
        const locked = e.you || isBoss(e.grade)
        const working = busy === `grade:${e.id}` || busy === `fire:${e.id}`
        return (
          <MenuRow
            key={e.id}
            data-slot="job-employee"
            readOnly
            icon={<Chip variant="dot" tone={e.onDuty ? "success" : undefined} className={e.online || e.onDuty ? undefined : "opacity-50"} aria-hidden />}
            description={[label(e.grade), e.onDuty ? "On duty" : e.online ? "Online" : "Offline"].join(", ")}
            actions={
              working ? (
                <Spinner className="text-muted-foreground" />
              ) : (
                !locked && (
                  <>
                    <Button data-nav variant="ghost" size="icon-sm" aria-label={`Promote ${e.name}`} disabled={up === null || !!busy} onClick={() => up !== null && onGrade(e, up)}>
                      <ChevronUpIcon />
                    </Button>
                    <Button data-nav variant="ghost" size="icon-sm" aria-label={`Demote ${e.name}`} disabled={down === null || !!busy} onClick={() => down !== null && onGrade(e, down)}>
                      <ChevronDownIcon />
                    </Button>
                    <Button data-nav variant="ghost" size="icon-sm" aria-label={`Fire ${e.name}`} className="text-destructive hover:text-destructive" disabled={!!busy} onClick={() => onFire(e)}>
                      <UserMinusIcon />
                    </Button>
                  </>
                )
              )
            }
          >
            {e.name}
            {e.you && <span className="[font-weight:var(--nk-type-weight-body)] text-muted-foreground"> (you)</span>}
          </MenuRow>
        )
      })}

      <p className="nk-text-caption px-3 pt-4 pb-1">Hire someone nearby</p>
      {nearby.length ? (
        nearby.map((p) => (
          <MenuRow
            key={p.id}
            data-nav
            icon={<UserPlusIcon />}
            meta={busy === `hire:${p.id}` ? <Spinner /> : `ID ${p.id}`}
            disabled={!!busy}
            onClick={() => onHire(p.id)}
          >
            {p.name}
          </MenuRow>
        ))
      ) : (
        <EmptyState icon={<UserPlusIcon />} title="No one is close enough" description="Stand next to them and open this again." />
      )}
    </PanelBody>
  )
}

export { JobMenu, JobMenuSurface, jobNextGrade }
