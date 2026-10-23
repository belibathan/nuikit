import * as React from "react"
import { fetchNui, Surface, useSurface } from "nuikit-core/react"
import {
  CarIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  MonitorIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Confirm } from "@/components/ui/confirm"
import { EmptyState } from "@/components/ui/empty-state"
import { SelectField, TextField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MenuRow, MenuRowList } from "@/components/ui/menu-row"
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel"
import { PlayerCard } from "@/components/ui/player-card"
import { Spinner } from "@/components/ui/spinner"

import type {
  MdtData,
  MdtDraft,
  MdtKind,
  MdtLimits,
  MdtRecord,
  MdtRecordAnswer,
  MdtRecordSummary,
  MdtReport,
  MdtReportAnswer,
  MdtSearchAnswer,
} from "./nui"

/**
 * MDT — the shell of a police or EMS terminal: a left nav (Dashboard, People, Vehicles, Reports), a
 * search with a results list and a detail pane, and a short report form behind a confirm. The server
 * decides who may open it (job and duty), runs every search, and stamps the author and time of a
 * report; the page only asks. Built from the kit: Panel, MenuRow, PlayerCard, FormField, Confirm,
 * EmptyState, with stock shadcn Input, Badge and Button.
 *
 *   <MdtSurface />                                   // wired: nk.surface('mdt', …) in Lua opens it
 *   <Mdt data={data} onSearch={…} onOpen={…} onReport={…} onClose={…} />   // a still, or your own wiring
 *
 * Escape goes through the surface (escape = 'back'): the confirm first, then the report form, then the MDT.
 */
function MdtSurface() {
  const mdt = useSurface("mdt")
  const back = React.useRef<() => void>(() => mdt.close())
  return (
    <Surface name="mdt" layer="panel" exclusive escape="back" onBack={() => back.current()}>
      {(data) =>
        data ? (
          <Mdt
            data={data}
            onBack={(fn) => (back.current = fn)}
            onClose={() => mdt.close()}
            onSearch={(kind, query) =>
              fetchNui("mdt:search", { kind, query }).catch(() => ({ ok: false, error: "The terminal didn't answer. Try again." }))
            }
            onOpen={(kind, id) =>
              fetchNui("mdt:record", { kind, id }).catch(() => ({ ok: false, error: "The terminal didn't answer. Try again." }))
            }
            onReport={(draft) =>
              fetchNui("mdt:report", draft).catch(() => ({ ok: false, error: "The terminal didn't answer. Try again." }))
            }
          />
        ) : null
      }
    </Surface>
  )
}

type MdtSection = "dashboard" | "people" | "vehicles" | "reports"

const NAV: { id: MdtSection; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { id: "people", label: "People", icon: UsersIcon },
  { id: "vehicles", label: "Vehicles", icon: CarIcon },
  { id: "reports", label: "Reports", icon: FileTextIcon },
]

// Lua turns an empty table into {} instead of [].
const list = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v : [])

/** What's wrong with searching for `query`, in plain words, or null. The server checks it again. */
function mdtQueryError(query: string, limits: MdtLimits): string | null {
  const q = query.trim()
  if (q.length < limits.query.min) return `Type at least ${limits.query.min} characters.`
  if (q.length > limits.query.max) return `Keep it under ${limits.query.max} characters.`
  return null
}

/** What's wrong with filing `draft`, or null. The server checks it again. */
function mdtReportError(draft: MdtDraft, limits: MdtLimits): string | null {
  const title = draft.title.trim().length
  const text = draft.text.trim().length
  if (title < limits.title.min) return `Give the report a title of at least ${limits.title.min} characters.`
  if (title > limits.title.max) return `Keep the title under ${limits.title.max} characters.`
  if (text < limits.text.min) return `Write at least ${limits.text.min} characters.`
  if (text > limits.text.max) return `Keep the report under ${limits.text.max} characters.`
  return null
}

/** "2026-10-22 14:05" (UTC) from unix seconds. */
function mdtWhen(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 16).replace("T", " ")
}

const NO_ANSWER = "The terminal didn't answer."

function Mdt({
  data,
  onSearch,
  onOpen,
  onReport,
  onClose,
  onBack,
  autoFocus = true,
  defaultSection = "dashboard",
  defaultQuery = "",
  defaultResults = null,
  defaultRecord = null,
  defaultComposing = false,
  defaultDraft,
  confirming: confirmingProp,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  data: MdtData
  /** Ask Lua to search; resolve with its answer. */
  onSearch?: (kind: MdtKind, query: string) => Promise<MdtSearchAnswer> | void
  /** Ask Lua for one record by its opaque id. */
  onOpen?: (kind: MdtKind, id: string) => Promise<MdtRecordAnswer> | void
  /** Ask Lua to file a report; the answer carries the fresh list. */
  onReport?: (draft: MdtDraft) => Promise<MdtReportAnswer> | void
  onClose?: () => void
  /** Gives the surface what Escape should do now (close the confirm, leave the form, else the MDT). */
  onBack?: (fn: () => void) => void
  /** Focus the search when a search opens (off for stills next to other content). */
  autoFocus?: boolean
  /** Stills: where to start. */
  defaultSection?: MdtSection
  defaultQuery?: string
  defaultResults?: MdtRecordSummary[] | null
  defaultRecord?: MdtRecord | null
  defaultComposing?: boolean
  defaultDraft?: MdtDraft
  /** Start with the confirm open (stills). */
  confirming?: boolean
}) {
  const { limits } = data
  const [section, setSection] = React.useState<MdtSection>(defaultSection)
  const [query, setQuery] = React.useState(defaultQuery)
  const [results, setResults] = React.useState<MdtRecordSummary[] | null>(defaultResults)
  const [record, setRecord] = React.useState<MdtRecord | null>(defaultRecord)
  const [reports, setReports] = React.useState<MdtReport[]>(list(data.reports))
  const [openReport, setOpenReport] = React.useState<string | null>(null)
  const [composing, setComposing] = React.useState(defaultComposing || !!confirmingProp)
  const [draft, setDraft] = React.useState<MdtDraft>(defaultDraft ?? { title: "", person: null, text: "" })
  // People the report can name: the latest person search, plus whoever's record is open.
  const [known, setKnown] = React.useState<MdtRecordSummary[]>(() => defaultResults?.filter((r) => r.kind === "person") ?? [])
  const [confirming, setConfirming] = React.useState(!!confirmingProp)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const latest = React.useRef(0)
  const kind: MdtKind | null = section === "people" ? "person" : section === "vehicles" ? "vehicle" : null

  const go = (next: MdtSection) => {
    setSection(next)
    setQuery("")
    setResults(null)
    setRecord(null)
    setOpenReport(null)
    setComposing(false)
    setError(null)
  }

  // Escape: the confirm first, then the report form, then the MDT.
  React.useEffect(() => {
    onBack?.(() => (confirming ? setConfirming(false) : composing ? setComposing(false) : onClose?.()))
  }, [confirming, composing, onBack, onClose])

  // Search as the player types (after a pause, once the query is long enough). A slower answer to an
  // older query never replaces a newer one.
  React.useEffect(() => {
    if (!kind || !onSearch) return
    const q = query.trim()
    if (mdtQueryError(q, limits)) {
      setResults(null)
      return
    }
    const mine = ++latest.current
    const t = setTimeout(() => {
      void Promise.resolve(onSearch(kind, q)).then((a) => {
        if (mine !== latest.current || !a) return
        if (a.ok) {
          const found = list(a.results)
          setError(null)
          setResults(found)
          if (kind === "person") setKnown((k) => [...found, ...k.filter((p) => !found.some((r) => r.id === p.id))].slice(0, 20))
        } else setError(a.error ?? NO_ANSWER)
      })
    }, 350)
    return () => clearTimeout(t)
  }, [query, kind, onSearch, limits])

  const open = (r: MdtRecordSummary) => {
    setError(null)
    if (!onOpen) return
    void Promise.resolve(onOpen(r.kind, r.id)).then((a) => {
      if (!a) return
      if (a.ok && a.record) setRecord(a.record)
      else setError(a.error ?? NO_ANSWER)
    })
  }

  const writeReport = (about?: MdtRecord) => {
    if (about?.kind === "person") setKnown((k) => (k.some((p) => p.id === about.id) ? k : [{ id: about.id, kind: "person", title: about.title }, ...k]))
    setSection("reports")
    setDraft((d) => ({ ...d, person: about?.kind === "person" ? about.id : d.person }))
    setComposing(true)
    setError(null)
  }

  const problem = composing ? mdtReportError(draft, limits) : null

  const file = () => {
    if (!onReport || busy || problem) return
    setBusy(true)
    setError(null)
    void Promise.resolve(onReport(draft))
      .then((a) => {
        if (a && !a.ok) setError(a.error ?? "That didn't go through.")
        else {
          if (a?.reports) setReports(list(a.reports))
          setDraft({ title: "", person: null, text: "" })
          setComposing(false)
          setOpenReport(null)
        }
      })
      .finally(() => {
        setBusy(false)
        setConfirming(false)
      })
  }

  const shownReport = reports.find((r) => r.id === openReport) ?? null

  return (
    <div data-slot="mdt" className={cn("absolute inset-0 grid place-items-center p-6", className)} {...props}>
      <Panel size="auto" className="nk-enter max-w-full">
        <PanelHeader
          icon={<MonitorIcon />}
          title={data.title}
          description={`${data.officer.name}, ${data.officer.job}`}
          actions={<Badge variant={data.officer.onDuty ? "default" : "secondary"}>{data.officer.onDuty ? "On duty" : "Off duty"}</Badge>}
        />
        <div className="grid grid-cols-[11rem_38rem]">
          <PanelBody className="border-r">
            <MenuRowList active={NAV.findIndex((n) => n.id === section)}>
              {NAV.map((n) => (
                <MenuRow key={n.id} icon={<n.icon />} active={section === n.id} onClick={() => go(n.id)}>
                  {n.label}
                </MenuRow>
              ))}
            </MenuRowList>
          </PanelBody>

          <div className="h-[28rem] min-h-0">
            {section === "dashboard" && (
              <PanelBody scroll className="h-full">
                <div className="flex flex-col gap-4 p-3">
                  <PlayerCard
                    animate={false}
                    name={data.officer.name}
                    job={data.officer.job}
                    onDuty={data.officer.onDuty}
                    stats={[
                      { label: "Reports filed", value: String(reports.filter((r) => r.author === data.officer.name).length) },
                      { label: "Reports on file", value: String(reports.length) },
                    ]}
                  />
                  <p className="nk-caption px-1">Latest reports</p>
                  {reports.length ? (
                    <div>
                      {reports.slice(0, 3).map((r) => (
                        <MenuRow
                          key={r.id}
                          icon={<FileTextIcon />}
                          description={`${r.author}, ${mdtWhen(r.time)}`}
                          onClick={() => {
                            setSection("reports")
                            setOpenReport(r.id)
                          }}
                        >
                          {r.title}
                        </MenuRow>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={<FileTextIcon />} title="No reports yet" description="Reports you file show up here." />
                  )}
                </div>
              </PanelBody>
            )}

            {kind && (
              <div className="grid h-full grid-cols-[17rem_21rem]">
                <div className="flex min-h-0 flex-col border-r">
                  <div className="relative p-3 pb-1">
                    <SearchIcon className="pointer-events-none absolute inset-y-0 left-5.5 my-auto size-4 text-muted-foreground" />
                    <Input
                      autoFocus={autoFocus}
                      value={query}
                      maxLength={limits.query.max}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={kind === "person" ? "Search by name" : "Search by plate"}
                      aria-label={kind === "person" ? "Search people" : "Search vehicles"}
                      className="h-8 pl-8"
                    />
                  </div>
                  <PanelBody scroll className="min-h-0 flex-1">
                    {results === null ? (
                      <EmptyState
                        icon={<SearchIcon />}
                        title={kind === "person" ? "Search for a person" : "Search for a vehicle"}
                        description={`Type at least ${limits.query.min} characters.`}
                      />
                    ) : results.length ? (
                      results.map((r) => (
                        <MenuRow
                          key={r.id}
                          icon={kind === "person" ? <UsersIcon /> : <CarIcon />}
                          description={r.subtitle}
                          meta={r.flagged ? <Badge variant="destructive">Flagged</Badge> : undefined}
                          active={record?.id === r.id}
                          onClick={() => open(r)}
                        >
                          {r.title}
                        </MenuRow>
                      ))
                    ) : (
                      <EmptyState icon={<SearchIcon />} title={`No match for "${query.trim()}"`} description="Check the spelling, or try less." />
                    )}
                  </PanelBody>
                </div>
                <PanelBody scroll className="h-full">
                  {record && record.kind === kind ? (
                    <div className="p-3">
                      <PlayerCard
                        animate={false}
                        name={record.title}
                        job={record.subtitle}
                        columns={1}
                        stats={record.fields.map((f) => ({ label: f.label, value: f.value }))}
                        actions={
                          <Button size="sm" variant="outline" onClick={() => writeReport(record)}>
                            Write a report
                          </Button>
                        }
                      >
                        <div className="flex flex-col gap-3">
                          {record.flags.length > 0 && (
                            <div className="flex flex-wrap gap-(--nk-space-2)">
                              {record.flags.map((f) => (
                                <Badge key={f} variant="destructive">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {record.notes && <p className="text-(length:--nk-text-label) text-muted-foreground">{record.notes}</p>}
                        </div>
                      </PlayerCard>
                    </div>
                  ) : (
                    <EmptyState icon={kind === "person" ? <UsersIcon /> : <CarIcon />} title="No record open" description="Pick a result to see the record." />
                  )}
                </PanelBody>
              </div>
            )}

            {section === "reports" && !composing && (
              <div className="grid h-full grid-cols-[17rem_21rem]">
                <PanelBody scroll className="border-r">
                  {reports.length ? (
                    reports.map((r) => (
                      <MenuRow
                        key={r.id}
                        icon={<FileTextIcon />}
                        description={`${r.author}, ${mdtWhen(r.time)}`}
                        active={openReport === r.id}
                        onClick={() => setOpenReport(r.id)}
                      >
                        {r.title}
                      </MenuRow>
                    ))
                  ) : (
                    <EmptyState icon={<FileTextIcon />} title="No reports yet" description="File the first one with New report." />
                  )}
                </PanelBody>
                <PanelBody scroll>
                  {shownReport ? (
                    <div className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="nk-title">{shownReport.title}</p>
                        <p className="nk-caption">
                          {shownReport.author}, {mdtWhen(shownReport.time)}
                          {shownReport.person ? `, about ${shownReport.person}` : ""}
                        </p>
                      </div>
                      <p className="text-(length:--nk-text-label) whitespace-pre-wrap">{shownReport.text}</p>
                    </div>
                  ) : (
                    <EmptyState icon={<FileTextIcon />} title="No report open" description="Pick a report to read it." />
                  )}
                </PanelBody>
              </div>
            )}

            {section === "reports" && composing && (
              <PanelBody scroll className="h-full">
                <form
                  className="flex flex-col gap-4 p-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!problem) setConfirming(true)
                  }}
                >
                  <TextField
                    label="Title"
                    required
                    value={draft.title}
                    maxLength={limits.title.max}
                    onValueChange={(title) => setDraft((d) => ({ ...d, title }))}
                    placeholder="Traffic stop on Route 1"
                  />
                  <SelectField
                    label="Involved person"
                    hint="Optional"
                    clearable
                    placeholder="No one"
                    options={known.map((p) => ({ value: p.id, label: p.title }))}
                    value={draft.person}
                    onValueChange={(person) => setDraft((d) => ({ ...d, person }))}
                    description={known.length ? undefined : "Search for a person first, then write the report from their record."}
                  />
                  <TextField
                    label="Report"
                    required
                    multiline
                    rows={6}
                    value={draft.text}
                    maxLength={limits.text.max}
                    onValueChange={(text) => setDraft((d) => ({ ...d, text }))}
                    placeholder="What happened"
                  />
                </form>
              </PanelBody>
            )}
          </div>
        </div>
        <PanelFooter className="flex items-center gap-3">
          <p role={error ? "alert" : undefined} className={cn("min-w-0 flex-1 truncate text-(length:--nk-text-label)", error ? "text-destructive" : "text-muted-foreground")}>
            {error ?? (composing && draft.title.trim() ? problem : null) ?? "Every search and report is logged by the server."}
          </p>
          {composing ? (
            <>
              <Button variant="ghost" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button disabled={!!problem || busy} onClick={() => setConfirming(true)}>
                {busy && <Spinner />}
                File report
              </Button>
            </>
          ) : (
            <Button onClick={() => writeReport()}>
              <PlusIcon />
              New report
            </Button>
          )}
        </PanelFooter>
      </Panel>

      {confirming && (
        <Confirm
          tone="primary"
          title="File this report?"
          description={`"${draft.title.trim()}" is stamped with your name and the time, and can't be edited afterwards.`}
          confirmLabel="File report"
          loading={busy}
          onConfirm={file}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

export { Mdt, MdtSurface, mdtQueryError, mdtReportError, mdtWhen, type MdtSection }
