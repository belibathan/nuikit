// The contract between your Lua and the job tracker. Lua opens the `jobtracker` surface (the compact
// panel on the game) with a JobTrackerData snapshot; `jobtracker-manage` is the same panel with focus,
// where the player can abandon. The server owns the job (its steps, where they are, the pay) and each
// player's progress; the page only shows it and asks. Steps are reported by the player's key in Lua
// (client/main.lua) and checked by the server; after each answer Lua sends a fresh snapshot (surface:update).
import "nuikit-core"

export interface JobStep {
  id: string
  /** "Load the boxes" */
  label: string
  /** A second line: where, with what. */
  description?: string
  /** The step takes this many reports (3 / 5 boxes). Omit for a single one. */
  count?: number
  /** What the count counts: "boxes". */
  unit?: string
}

export interface JobTrackerData {
  /** "Warehouse delivery" */
  title: string
  description?: string
  /** What completing the job pays, in whole units. The server pays it, once. */
  pay: number
  steps: JobStep[]
  /** The index of the step to do now; `steps.length` when all are done. */
  current: number
  /** How many of the current step's `count` are done. */
  progress?: number
  /** Metres to the current step's place (Lua measures it; display only). */
  distance?: number
  /** The key for the current step's action: { key: "E", label: "Load a box" }. */
  action?: { key: string; label: string }
}

export type JobTrackerAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    jobtracker: JobTrackerData
    "jobtracker-manage": JobTrackerData
  }
  interface NuiCallbacks {
    /** The player pressed the step's action on the page (the key does the same in Lua). */
    "jobtracker:step": { req: { step: string }; res: JobTrackerAnswer }
    "jobtracker:abandon": { req: Record<string, never>; res: JobTrackerAnswer }
  }
}
