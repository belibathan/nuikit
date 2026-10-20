import * as React from "react"
import { fetchNui, Surface } from "nuikit-core/react"
import { BriefcaseIcon, ChevronDownIcon, ChevronUpIcon, UserMinusIcon, UserPlusIcon } from "lucide-react"

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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MenuRow } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"
import { Stat } from "@/components/ui/stat"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { JobAnswer, JobEmployee, JobGrade, JobMenuData } from "./nui"

/**
 * JobMenu — your job in one panel: go on or off duty and run the job's actions; a boss also gets
 * the staff (promote, demote, fire, with a confirm) and whoever is nearby to hire. Lua answers every
 * button and its error shows at the top of the panel. Built from the kit: Panel (with a tabs
 * header), MenuRow, Stat, with stock shadcn Tabs, Button, AlertDialog and Spinner (the fire confirm
 * moves to the kit's confirm once it ships).
 *
 *   <JobMenuSurface />                                // wired: nk.surface('job', …) in Lua opens it
 *   <JobMenu data={data} onRequest={…} />             // a still, or your own wiring
 */
function JobMenuSurface() {
  return (
    <Surface name="job" layer="panel" exclusive>
      {(data) =>
        data ? (
          <JobMenu
            data={data}
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

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })

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
  autoFocus = true,
  defaultTab = "actions",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  /** The tab a boss sees first. */
  defaultTab?: "actions" | "staff"
  data: JobMenuData
  /** Ask Lua; resolve with its answer. */
  onRequest?: (req: JobRequest) => Promise<JobAnswer> | void
  /** Focus the first row when it opens (off for stills next to other content). */
  autoFocus?: boolean
}) {
  const [tab, setTab] = React.useState<"actions" | "staff">(defaultTab)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [firing, setFiring] = React.useState<JobEmployee | null>(null)

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
              <span className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", job.onDuty ? "bg-success" : "bg-muted-foreground/50")} />
                {[job.gradeLabel, job.onDuty ? "On duty" : "Off duty"].filter(Boolean).join(", ")}
              </span>
            }
            tabs={
              boss ? (
                <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="staff">
                      Staff <span className="nk-num text-muted-foreground">{list(boss.employees).length}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              ) : undefined
            }
          />

          {error && (
            <p role="alert" className="border-b px-4 py-2 text-sm text-destructive">
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

      <AlertDialog open={!!firing} onOpenChange={(open) => !open && setFiring(null)}>
        <AlertDialogContent
          className="nk-panel nk-enter gap-4 p-6 data-[size=default]:sm:max-w-sm"
          // One Escape closes the dialog only, not the menu behind it.
          onEscapeKeyDown={(e) => {
            e.preventDefault()
            setFiring(null)
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="nk-title">Fire {firing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They lose the job and its access straight away. You can hire them again later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (firing) send(`fire:${firing.id}`, { kind: "fire", id: firing.id })
                setFiring(null)
              }}
            >
              Fire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          <Stat size="sm" label="Job account" value={money.format(boss.balance)} />
        </div>
      )}
      {employees.map((e) => {
        const up = jobNextGrade(grades, e.grade, 1)
        const down = jobNextGrade(grades, e.grade, -1)
        const locked = e.you || isBoss(e.grade)
        const working = busy === `grade:${e.id}` || busy === `fire:${e.id}`
        return (
          <div key={e.id} data-slot="job-employee" className="nk-row">
            <span className={cn("size-1.5 shrink-0 rounded-full", e.onDuty ? "bg-success" : e.online ? "bg-muted-foreground" : "bg-muted-foreground/30")} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">
                {e.name}
                {e.you && <span className="font-normal text-muted-foreground"> (you)</span>}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {[label(e.grade), e.onDuty ? "On duty" : e.online ? "Online" : "Offline"].join(", ")}
              </span>
            </span>
            {working ? (
              <Spinner className="text-muted-foreground" />
            ) : (
              !locked && (
                <span className="flex shrink-0 items-center gap-1">
                  <Button data-nav variant="ghost" size="icon-sm" aria-label={`Promote ${e.name}`} disabled={up === null || !!busy} onClick={() => up !== null && onGrade(e, up)}>
                    <ChevronUpIcon />
                  </Button>
                  <Button data-nav variant="ghost" size="icon-sm" aria-label={`Demote ${e.name}`} disabled={down === null || !!busy} onClick={() => down !== null && onGrade(e, down)}>
                    <ChevronDownIcon />
                  </Button>
                  <Button data-nav variant="ghost" size="icon-sm" aria-label={`Fire ${e.name}`} className="text-destructive hover:text-destructive" disabled={!!busy} onClick={() => onFire(e)}>
                    <UserMinusIcon />
                  </Button>
                </span>
              )
            )}
          </div>
        )
      })}

      <p className="nk-label px-3 pt-4 pb-1">Hire someone nearby</p>
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
        <p className="nk-row text-muted-foreground">No one is close enough. Stand next to them and open this again.</p>
      )}
    </PanelBody>
  )
}

export { JobMenu, JobMenuSurface, jobNextGrade }
