// The contract between your Lua and the MDT. Lua opens the `mdt` surface with an MdtData snapshot (who
// is logged in, the reports so far, the input limits); the page asks Lua to search, open a record and
// file a report, and Lua answers. The server does the searching, the permission check (job and duty) and
// the stamping of author and time. Records have opaque ids: no licence or citizen id ever reaches the page.
import "nuikit-core"

export type MdtKind = "person" | "vehicle"

/** One line of a search result. `id` is opaque: the server maps it back to the record. */
export interface MdtRecordSummary {
  id: string
  kind: MdtKind
  /** A person's name, a vehicle's plate. */
  title: string
  /** "Born 1988-03-14", "Banshee, black". */
  subtitle?: string
  /** Has flags worth a glance (a warrant, a stolen report). */
  flagged?: boolean
}

/** An opened record: the detail pane. */
export interface MdtRecord {
  id: string
  kind: MdtKind
  title: string
  subtitle?: string
  /** Label/value pairs: Date of birth, Model, Owner. */
  fields: { label: string; value: string }[]
  /** Short flags drawn as badges ("Wanted", "Armed"). */
  flags: string[]
  notes?: string
}

export interface MdtReport {
  id: string
  title: string
  /** Stamped by the server. */
  author: string
  /** Unix seconds, stamped by the server. */
  time: number
  /** The involved person's name, if one was chosen. */
  person?: string
  text: string
}

/** The input limits (the server enforces them; the page uses them for counters and early errors). */
export interface MdtLimits {
  query: { min: number; max: number }
  title: { min: number; max: number }
  text: { min: number; max: number }
}

export interface MdtData {
  title: string
  officer: { name: string; job: string; onDuty: boolean }
  /** Newest first. */
  reports: MdtReport[]
  limits: MdtLimits
}

export type MdtSearchAnswer = { ok: boolean; error?: string; results?: MdtRecordSummary[] }
export type MdtRecordAnswer = { ok: boolean; error?: string; record?: MdtRecord }
export type MdtReportAnswer = { ok: boolean; error?: string; reports?: MdtReport[] }

export interface MdtDraft {
  title: string
  /** An opaque person id from a search, or null. */
  person: string | null
  text: string
}

declare module "nuikit-core" {
  interface NuiSurfaces {
    mdt: MdtData
  }
  interface NuiCallbacks {
    "mdt:search": { req: { kind: MdtKind; query: string }; res: MdtSearchAnswer }
    "mdt:record": { req: { kind: MdtKind; id: string }; res: MdtRecordAnswer }
    "mdt:report": { req: MdtDraft; res: MdtReportAnswer }
  }
}
