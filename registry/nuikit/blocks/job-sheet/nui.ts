// The contract between your Lua and the job sheet. Lua opens the `jobsheet` surface with a
// JobSheetData snapshot: the job, and its pages (the first is the root; a row with `page` opens
// another one in place). The page asks Lua to go on or off duty or to run a row, and shows what
// it answers. After a change Lua sends a fresh snapshot (surface:update).
import "nuikit-core"

export interface JobSheetRow {
  /** Unique within the job: what the server checks on job:row. */
  id: string
  /** "Open the armory" */
  label: string
  description?: string
  /** Shown as a key next to the row when the row has one. */
  kbd?: string
  /** Right-aligned text: a count, a price, a plate. */
  meta?: string
  /** Opens this page in place (a sub-page) instead of asking the server. */
  page?: string
  /** Only on duty (greyed out while off duty). */
  onDutyOnly?: boolean
  disabled?: boolean
  tone?: "default" | "destructive"
}

export interface JobSheetSection {
  id: string
  /** A caption over the rows; none for the first section of a page. */
  title?: string
  rows: JobSheetRow[]
}

export interface JobSheetAction {
  id: string
  label: string
  /** The one filled button of the page; the others are outlined. */
  primary?: boolean
  kbd?: string
  onDutyOnly?: boolean
  disabled?: boolean
}

export interface JobSheetPage {
  /** "root" is the page the sheet opens on. */
  id: string
  title: string
  description?: string
  sections: JobSheetSection[]
  /** The actions row along the bottom. */
  actions?: JobSheetAction[]
}

export interface JobSheetData {
  job: {
    name: string
    /** "LSPD" */
    label: string
    gradeLabel?: string
    onDuty: boolean
  }
  /** Which screen edge the sheet floats on. Default right (opened from the world). */
  side?: "left" | "right"
  pages: JobSheetPage[]
}

export type JobSheetAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    jobsheet: JobSheetData
  }
  interface NuiCallbacks {
    "jobsheet:duty": { req: { onDuty: boolean }; res: JobSheetAnswer }
    /** A row or an action: `id` is the row's (or action's) id, `page` the page it was on. */
    "jobsheet:row": { req: { page: string; id: string }; res: JobSheetAnswer }
  }
}
