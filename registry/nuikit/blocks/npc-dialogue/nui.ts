// The contract between your Lua and the NPC dialogue. Lua opens the `dialogue` surface with a
// DialogueData snapshot (who is talking, the line, the choices on offer); the player picks one, the
// page sends only its id, and Lua answers with the next line or the end. The server holds the
// conversation (the current node, every requirement and action); the page never decides what a choice does.
import "nuikit-core"

export interface DialogueChoice {
  /** The choice's id in the dialogue tree. The page sends only this. */
  id: string
  /** "Ask about the job" */
  label: string
  /** Not available to this player: dimmed, with `lockedReason` as its description. */
  locked?: boolean
  /** "Needs $500", "Police only". The server writes it. */
  lockedReason?: string
}

export interface DialogueData {
  /** "Marty" */
  speaker: string
  /** "Bartender" */
  role?: string
  /** The line being said. */
  text: string
  choices: DialogueChoice[]
}

/** next: the following line; ended: the conversation is over (Lua closes the surface). */
export type DialogueAnswer = { ok: boolean; error?: string; data?: DialogueData; ended?: boolean }

declare module "nuikit-core" {
  interface NuiSurfaces {
    dialogue: DialogueData
  }
  interface NuiCallbacks {
    "dialogue:choose": { req: { choice: string }; res: DialogueAnswer }
  }
}
