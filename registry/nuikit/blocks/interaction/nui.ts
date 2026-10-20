// The contract between your Lua and the interaction block. Two surfaces, neither of which takes
// input on its own:
//   `target`  (world layer): the eye at the centre of the screen and, when the player aims at
//             something, its options. Lua raycasts; the page only draws what it's sent.
//   `prompts` (hud layer):   "[E] Open the fridge" key prompts near things; Lua reads the keys and
//             sends hold progress.
// To choose an option with the mouse, Lua opens a cursor surface of its own and sets `picking`; the
// page then posts `interaction:select`. With the scroll wheel, Lua moves `active` and selects itself.
import "nuikit-core"

import type { KeyPromptPosition } from "@/components/ui/key-prompt"

/** The icons an option can name (lucide, drawn by the page; unknown names draw none). */
export type InteractionIcon =
  | "car"
  | "door"
  | "hand"
  | "box"
  | "user"
  | "wrench"
  | "cart"
  | "lock"
  | "unlock"
  | "key"
  | "phone"
  | "info"
  | "fuel"
  | "shirt"
  | "money"
  | "briefcase"
  | "medical"
  | "search"

export interface InteractionOption {
  id: string
  /** "Open the trunk" */
  label: string
  icon?: InteractionIcon
  /** A quieter second line: what it costs, why it's locked. */
  description?: string
  disabled?: boolean
}

export interface TargetData {
  /** What's aimed at, when that helps: "Pegassi Zentorno", "Fridge". Empty options = the idle eye. */
  label?: string
  options: InteractionOption[]
  /** The highlighted option (index), when Lua moves it with the scroll wheel. */
  active?: number
  /** Lua gave the page the cursor: the options take clicks. */
  picking?: boolean
  /** One short line under the options: "Click to choose", "Scroll, then click". */
  hint?: string
}

export interface InteractionPrompt {
  id: string
  /** "E", or ["Shift", "E"] */
  keys: string | string[]
  label: string
  description?: string
  icon?: InteractionIcon
  /** Hold for this many ms (a line fills; Lua sends `progress`). */
  hold?: number
  /** 0–1, from Lua while the key is held. */
  progress?: number
  disabled?: boolean
  /** The one the key acts on, among several. */
  active?: boolean
}

export interface PromptsData {
  prompts: InteractionPrompt[]
  /** Where the stack sits. Default "center-right". */
  position?: KeyPromptPosition
}

export type InteractionAnswer = { ok: boolean; error?: string }

declare module "nuikit-core" {
  interface NuiSurfaces {
    target: TargetData
    prompts: PromptsData
  }
  interface NuiCallbacks {
    "interaction:select": { req: { id: string }; res: InteractionAnswer }
  }
}
