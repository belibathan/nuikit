import * as React from "react"
import * as core from "nuikit-core/react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { BriefcaseIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { MenuRow } from "@/components/ui/menu-row"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Chip } from "@/components/ui/chip"
import { EdgeSheet, EdgeSheetBody, EdgeSheetFooter } from "@/components/ui/edge-sheet"

import type { JobSheetAction, JobSheetAnswer, JobSheetData, JobSheetPage, JobSheetRow } from "./nui"

/**
 * JobSheet — the one frame for a resource's menu (docs/design.md, Surfaces): a floating EdgeSheet
 * on the right (or left), a header row (icon, the job, grade and duty), sections of 48px rows with
 * hairlines in one ScrollArea column, sub-pages that swap in place with a back row (Escape goes
 * back before it closes), and one actions row with a single primary. A resource fills the pages
 * in Lua; the server checks every row (grade, duty) and answers; its error shows at the top.
 *
 *   <JobSheetSurface />                                 // wired: nk.surface('jobsheet', …) in Lua opens it
 *   <JobSheet data={data} onRequest={…} />              // a still, or your own wiring
 */
function JobSheetSurface() {
  const sheet = useSurface("jobsheet")
  const back = React.useRef<() => void>(() => sheet.close())
  return (
    <Surface name="jobsheet" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <JobSheet
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => sheet.close()}
            onRequest={(req) => {
              const call = req.kind === "duty" ? fetchNui("jobsheet:duty", { onDuty: req.onDuty }) : fetchNui("jobsheet:row", { page: req.page, id: req.id })
              return call.catch(() => ({ ok: false, error: "The job didn't answer. Try again." }))
            }}
          />
        ) : null
      }
    </Surface>
  )
}

export type JobSheetRequest = { kind: "duty"; onDuty: boolean } | { kind: "row"; page: string; id: string }

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** The page with this id, else the root (the first page). */
function jobSheetPage(pages: JobSheetPage[], id: string | undefined): JobSheetPage | undefined {
  const all = list(pages)
  return (id !== undefined && all.find((p) => p.id === id)) || all.find((p) => p.id === "root") || all[0]
}

/** Whether a row or action can be used now: not disabled, and on duty when it asks for it. */
function jobSheetEnabled(item: Pick<JobSheetRow, "disabled" | "onDutyOnly">, onDuty: boolean): boolean {
  return !item.disabled && !(item.onDutyOnly && !onDuty)
}

/**
 * The sheet's `open`: false while the surface is closing so the sheet slides out (nuikit-core's
 * useSurfaceOpen, landing with the surface exit); true until then.
 */
const useOpen: () => boolean = (core as { useSurfaceOpen?: () => boolean }).useSurfaceOpen ?? (() => true)

function JobSheet({
  data,
  onRequest,
  onBack,
  onClose,
  autoFocus = true,
  initialPage,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: JobSheetData
  /** Ask Lua; resolve with its answer. */
  onRequest?: (req: JobSheetRequest) => Promise<JobSheetAnswer> | void
  /** Gives the surface what Escape should do now (back from a sub-page, else close). */
  onBack?: (fn: () => void) => void
  onClose?: () => void
  /** Focus the first row when it opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Open on this sub-page (stills). */
  initialPage?: string
}) {
  const [trail, setTrail] = React.useState<string[]>(() => (initialPage ? [initialPage] : []))
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const open = useOpen()

  const { job } = data
  const page = jobSheetPage(data.pages, trail[trail.length - 1])
  const root = trail.length === 0

  // A fresh snapshot may drop the page we're on: fall back to the root.
  React.useEffect(() => {
    if (!root && !list(data.pages).some((p) => p.id === trail[trail.length - 1])) setTrail([])
  }, [data.pages, root, trail])

  const goBack = React.useCallback(() => setTrail((t) => t.slice(0, -1)), [])
  React.useEffect(() => {
    onBack?.(() => (root ? onClose?.() : goBack()))
  }, [root, onBack, onClose, goBack])

  const send = (key: string, req: JobSheetRequest) => {
    if (!onRequest || busy) return
    setBusy(key)
    setError(null)
    void Promise.resolve(onRequest(req))
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't work.")
      })
      .finally(() => setBusy(null))
  }

  const run = (r: JobSheetRow | JobSheetAction) => {
    if (!page) return
    if ("page" in r && r.page) {
      setError(null)
      setTrail((t) => [...t, r.page!])
      return
    }
    send(`${page.id}:${r.id}`, { kind: "row", page: page.id, id: r.id })
  }

  // Up / Down move between the rows and the actions; the first row takes the keyboard when the
  // sheet opens and when the page changes. The sheet is portaled, so the rows are found from the
  // document, not the wrapper.
  const navRows = () =>
    [...document.querySelectorAll<HTMLElement>("[data-slot=edge-sheet][data-job-sheet] [data-nav]")].filter(
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
  }, [autoFocus, page?.id])

  const actions = list(page?.actions)
  const primary = actions.find((a) => a.primary) ?? actions[0]

  return (
    <div data-slot="job-sheet" className={cn("absolute inset-0", className)} onKeyDown={onKeyDown} {...props}>
      <EdgeSheet
        data-job-sheet=""
        open={open}
        side={data.side ?? "right"}
        width="30rem"
        page={page?.id}
        icon={<BriefcaseIcon />}
        title={root ? job.label : page?.title}
        description={
          root ? (
            <span className="flex items-center gap-(--nk-gap-cluster)">
              <Chip variant="dot" tone={job.onDuty ? "success" : undefined} aria-hidden />
              {[job.gradeLabel, job.onDuty ? "On duty" : "Off duty"].filter(Boolean).join(", ")}
            </span>
          ) : (
            page?.description
          )
        }
        onBack={root ? undefined : goBack}
        onClose={root ? onClose : undefined}
      >
        {error && (
          <p role="alert" className="nk-text-label pt-3 text-destructive">
            {error}
          </p>
        )}

        <EdgeSheetBody scroll>
          {root && (
            <>
              <MenuRow
                data-nav
                className="h-12"
                description={job.onDuty ? "You're on duty" : "Clock in to use the job's rows"}
                checked={job.onDuty}
                disabled={busy === "duty"}
                onCheckedChange={(on) => send("duty", { kind: "duty", onDuty: on })}
              >
                On duty
              </MenuRow>
              <Separator className="my-2" />
            </>
          )}
          {list(page?.sections).map((s, i) => (
            <section key={s.id} data-slot="job-sheet-section">
              {i > 0 && <Separator className="my-2" />}
              {s.title && <p className="nk-text-caption px-3 pt-2 pb-1 text-muted-foreground">{s.title}</p>}
              {list(s.rows).map((r) => {
                const key = `${page?.id}:${r.id}`
                const off = !jobSheetEnabled(r, job.onDuty)
                return (
                  <MenuRow
                    key={r.id}
                    data-nav
                    className="h-12"
                    tone={r.tone}
                    description={r.onDutyOnly && !job.onDuty ? "On duty only" : r.description}
                    kbd={busy === key ? undefined : r.kbd}
                    meta={busy === key ? <Spinner /> : r.meta}
                    chevron={!!r.page}
                    disabled={off || (!!busy && busy !== key)}
                    onClick={() => run(r)}
                  >
                    {r.label}
                  </MenuRow>
                )
              })}
            </section>
          ))}
        </EdgeSheetBody>

        <EdgeSheetFooter>
          {actions.map((a) => {
            const key = `${page?.id}:${a.id}`
            return (
              <Button
                key={a.id}
                data-nav
                variant={a === primary ? "default" : "outline"}
                className={cn(a === primary && "flex-1")}
                disabled={!jobSheetEnabled(a, job.onDuty) || !!busy}
                onClick={() => run(a)}
              >
                {busy === key ? <Spinner /> : a.label}
                {a.kbd && busy !== key && <Kbd>{a.kbd}</Kbd>}
              </Button>
            )
          })}
          <span className="nk-text-label ml-auto flex items-center gap-(--nk-space-2) text-muted-foreground">
            <Kbd>Esc</Kbd> {root ? "Close" : "Back"}
          </span>
        </EdgeSheetFooter>
      </EdgeSheet>
    </div>
  )
}

export { JobSheet, JobSheetSurface, jobSheetEnabled, jobSheetPage }
