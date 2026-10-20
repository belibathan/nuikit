// The contract between your Lua and the job menu. Lua opens the `job` surface with a JobMenuData
// snapshot; the page asks Lua to go on or off duty, run a job action, and (for bosses) hire, fire or
// regrade, and shows what it answers. After a change Lua sends a fresh snapshot (surface:update).
import "nuikit-core"

export interface JobMenuAction {
  id: string
  /** "Open the armory" */
  label: string
  description?: string
  /** Shown as a key next to the row when the action has one. */
  kbd?: string
  /** Only on duty (greyed out while off duty). */
  onDutyOnly?: boolean
  disabled?: boolean
}

export interface JobEmployee {
  /** Your id for them (citizen id, identifier). */
  id: string
  name: string
  grade: number
  online?: boolean
  onDuty?: boolean
  /** The player looking at the menu. */
  you?: boolean
}

export interface JobGrade {
  grade: number
  /** "Sergeant" */
  label: string
  /** The boss grade: can't be fired or regraded from here. */
  boss?: boolean
}

export interface JobMenuData {
  job: {
    name: string
    /** "LSPD" */
    label: string
    gradeLabel?: string
    onDuty: boolean
  }
  actions: JobMenuAction[]
  /** Present for bosses: the staff, the grades and who's nearby to hire. */
  boss?: {
    employees: JobEmployee[]
    grades: JobGrade[]
    /** The job's account. */
    balance?: number
    /** Players near the boss who could be hired (server ID and name). */
    nearby?: { id: number; name: string }[]
  }
}

export type JobAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    job: JobMenuData
  }
  interface NuiCallbacks {
    "job:duty": { req: { onDuty: boolean }; res: JobAnswer }
    "job:action": { req: { id: string }; res: JobAnswer }
    "job:hire": { req: { player: number }; res: JobAnswer }
    "job:fire": { req: { id: string }; res: JobAnswer }
    "job:grade": { req: { id: string; grade: number }; res: JobAnswer }
  }
}
