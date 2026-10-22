import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import { CheckIcon, CircleDashedIcon, ClipboardListIcon, MapPinIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { KeyPrompt } from "@/components/ui/key-prompt"
import { MenuRow } from "@/components/ui/menu-row"
import { Meter } from "@/components/ui/meter"
import { Money, useFormatMoney } from "@/components/ui/money"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { Spinner } from "@/components/ui/spinner"

import type { JobStep, JobTrackerAnswer, JobTrackerData } from "./nui"

/**
 * JobTracker — the task panel a job shows while you work it: the job's name and pay, the steps as
 * rows (done, current, locked), the current step's progress as a meter (a count, or the distance),
 * a key prompt for its action, and "Abandon job" behind a confirm. It docks at the right edge and
 * stays compact so it reads on the game. Lua and the server own the job; the page only shows it.
 *
 *   <JobTrackerSurface />                        // wired: nk.surface('jobtracker', …) in Lua shows it
 *   <JobTracker data={data} onAbandon={…} />     // a still, or your own wiring
 *
 * Two surfaces share one look: `jobtracker` (layer hud, no focus: always there while you work) and
 * `jobtracker-manage` (layer panel, keepInput: opened with the manage key, has the buttons and the
 * confirm). Escape closes the confirm first, then the manage panel.
 */
function JobTrackerSurface() {
  const manage = useSurface("jobtracker-manage")
  const back = React.useRef<() => void>(() => manage.close())
  return (
    <>
      <Surface name="jobtracker" layer="hud">
        {(data) => (data ? <JobTracker data={data} /> : null)}
      </Surface>
      <Surface name="jobtracker-manage" layer="panel" input="full" keepInput escape="back" hides={["jobtracker"]} onBack={() => back.current()}>
        {(data) =>
          data ? (
            <JobTracker
              data={data}
              manage
              onBack={(fn) => (back.current = fn)}
              onClose={() => manage.close()}
              onStep={(step) => fetchNui("jobtracker:step", { step }).catch(() => ({ ok: false, error: "The job didn't answer. Try again." }))}
              onAbandon={() => fetchNui("jobtracker:abandon", {}).catch(() => ({ ok: false, error: "The job didn't answer. Try again." }))}
            />
          ) : null
        }
      </Surface>
    </>
  )
}

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

type JobStepState = "done" | "current" | "locked"

/** A step is done before the current one, current at it, locked after it. */
function jobStepState(index: number, current: number): JobStepState {
  return index < current ? "done" : index === current ? "current" : "locked"
}

/** Beyond this many metres the distance meter is empty. */
const JOB_RANGE = 250

/** "38 m", "640 m", "1.4 km". */
function jobDistance(metres: number): string {
  const m = Math.max(0, Math.round(metres))
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`
}

/**
 * The current step's meter, or null when it has none: a counted step fills with its count
 * ("3 / 5 boxes"), a step that is a place fills as you get closer ("640 m").
 */
function jobProgress(step: JobStep | undefined, progress: number | undefined, distance: number | undefined) {
  if (!step) return null
  if (step.count && step.count > 0) {
    const value = Math.max(0, Math.min(step.count, progress ?? 0))
    return { value, max: step.count, text: `${value} / ${step.count}${step.unit ? ` ${step.unit}` : ""}` }
  }
  if (distance !== undefined && Number.isFinite(distance)) {
    return { value: Math.max(0, 1 - distance / JOB_RANGE) * 100, max: 100, text: jobDistance(distance) }
  }
  return null
}

/** "2 of 4 steps". */
function jobSummary(steps: JobStep[], current: number): string {
  const done = Math.max(0, Math.min(steps.length, current))
  return `${done} of ${steps.length} ${steps.length === 1 ? "step" : "steps"}`
}

const STATE_ICON = { done: <CheckIcon />, current: <MapPinIcon />, locked: <CircleDashedIcon /> } as const

function JobTracker({
  data,
  manage = false,
  onStep,
  onAbandon,
  onClose,
  onBack,
  abandoning: abandoningProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: JobTrackerData
  /** The focused panel: shows Abandon job (and makes the key prompt clickable). */
  manage?: boolean
  /** Ask Lua to report the step; resolve with its answer. */
  onStep?: (step: string) => Promise<JobTrackerAnswer> | void
  /** Ask Lua to abandon the job; resolve with its answer. */
  onAbandon?: () => Promise<JobTrackerAnswer> | void
  onClose?: () => void
  /** Gives the surface what Escape should do now (close the confirm, else the panel). */
  onBack?: (fn: () => void) => void
  /** Start with the confirm open (stills). */
  abandoning?: boolean
}) {
  const fmt = useFormatMoney()
  const steps = list(data.steps)
  const current = steps[data.current]
  const meter = jobProgress(current, data.progress, data.distance)
  const [abandoning, setAbandoning] = React.useState(!!abandoningProp)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Escape: the confirm first, then the panel.
  React.useEffect(() => {
    onBack?.(() => (abandoning ? setAbandoning(false) : onClose?.()))
  }, [abandoning, onBack, onClose])

  const abandon = () => {
    if (!onAbandon || busy) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onAbandon())
      .then((answer) => {
        if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
      })
      .finally(() => {
        setBusy(false)
        setAbandoning(false)
      })
  }

  const report = () => {
    if (!onStep || !current) return
    setError(null)
    void Promise.resolve(onStep(current.id)).then((answer) => {
      if (answer && !answer.ok) setError(answer.error ?? "That didn't go through.")
    })
  }

  return (
    <div data-slot="job-tracker" className={cn("absolute inset-0", className)} {...props}>
      <Panel size="default" className="nk-anchor-r">
        <PanelHeader
          icon={<ClipboardListIcon />}
          title={data.title}
          description={jobSummary(steps, data.current)}
          actions={<Money amount={data.pay} className="text-sm" />}
        />
        <PanelBody>
          {steps.map((step, i) => {
            const state = jobStepState(i, data.current)
            return (
              <MenuRow
                key={step.id}
                readOnly
                icon={STATE_ICON[state]}
                description={state === "current" ? step.description : undefined}
                data-state={state}
                className={cn(state === "done" && "text-muted-foreground line-through", state === "locked" && "text-muted-foreground")}
              >
                {step.label}
              </MenuRow>
            )
          })}
        </PanelBody>
        {(meter || data.action) && (
          <div className="flex flex-col gap-2 border-t px-4 py-3">
            {meter && <Meter value={meter.value} max={meter.max} label={current?.label} valueText={meter.text} />}
            {data.action && (
              <KeyPrompt keys={data.action.key} label={data.action.label} stage="focus" onConfirm={manage && onStep ? report : undefined} />
            )}
          </div>
        )}
        {(manage || error) && (
          <PanelFooter className="flex items-center gap-3">
            <p role={error ? "alert" : undefined} className={cn("min-w-0 flex-1 truncate text-sm", error ? "text-destructive" : "text-muted-foreground")}>
              {error ?? "Abandoning pays nothing."}
            </p>
            {manage && (
              <Button variant="outline" disabled={busy} onClick={() => setAbandoning(true)}>
                {busy && <Spinner />}
                Abandon job
              </Button>
            )}
          </PanelFooter>
        )}
      </Panel>

      {abandoning && (
        <Confirm
          tone="destructive"
          title="Abandon this job?"
          description={`You lose your progress and the ${fmt(data.pay)} pay.`}
          confirmLabel="Abandon"
          loading={busy}
          onConfirm={abandon}
          onCancel={() => setAbandoning(false)}
        />
      )}
    </div>
  )
}

export { JobTracker, JobTrackerSurface, jobDistance, jobProgress, jobStepState, jobSummary }
