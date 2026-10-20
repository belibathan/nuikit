// The contract between your Lua and the character select. Lua opens the `character-select` surface
// with the player's characters and the spawn points; the page asks Lua to play one (and where to
// spawn), create one, or delete one, and shows what Lua answers. The server decides which
// characters are the player's, which spawn points they may use, and whether a new one is valid.
import "nuikit-core"

/** Icons for spawn points (lucide, drawn by the page; unknown names draw a map pin). */
export type SpawnIcon = "last" | "house" | "apartment" | "hotel" | "airport" | "station" | "police" | "hospital" | "beach" | "city"

export interface CharacterSummary {
  /** Your id for it (citizen id). */
  id: string
  firstName: string
  lastName: string
  /** A picture URL (a mugshot), else initials. */
  avatar?: string
  job?: string
  grade?: string
  cash?: number
  bank?: number
  /** "1994-03-12" */
  birthdate?: string
  /** What the server calls it: "Male", "Female", … */
  gender?: string
  /** "Today", "3 days ago" (Lua formats it). */
  lastPlayed?: string
  /** "Vinewood Hills" */
  lastLocation?: string
}

export interface SpawnPoint {
  id: string
  /** "Last location", "Legion Square" */
  label: string
  description?: string
  icon?: SpawnIcon
}

export interface CharacterSelectData {
  /** "Welcome back" */
  title?: string
  characters: CharacterSummary[]
  /** How many characters a player may have (the empty ones offer Create). */
  slots: number
  /** Where a character can start, after Play. Omit to play straight away. */
  spawns?: SpawnPoint[]
  canCreate?: boolean
  canDelete?: boolean
  /** The create form's gender choices. Default Male, Female, Other. */
  genders?: string[]
}

export interface NewCharacter {
  firstName: string
  lastName: string
  /** "YYYY-MM-DD" */
  birthdate: string
  gender: string
}

export type CharacterAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    "character-select": CharacterSelectData
  }
  interface NuiCallbacks {
    "character:play": { req: { id: string; spawn?: string }; res: CharacterAnswer }
    "character:create": { req: NewCharacter; res: CharacterAnswer }
    "character:delete": { req: { id: string }; res: CharacterAnswer }
  }
}
