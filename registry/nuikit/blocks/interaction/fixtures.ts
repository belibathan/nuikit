// Every state of the interaction block, as your Lua would send it: each scene opens the `target`
// surface, the `prompts` surface, or both. Used by dev.tsx (?fixture=<name>), screenshots and the
// site's previews.
import type { InteractionOption, PromptsData, TargetData } from "./nui"

const vehicle: InteractionOption[] = [
  { id: "trunk", label: "Open the trunk", icon: "box" },
  { id: "lock", label: "Lock", icon: "lock" },
  { id: "hood", label: "Check the engine", icon: "wrench", description: "Mechanics only", disabled: true },
  { id: "fuel", label: "Refuel", icon: "fuel", description: "$3 a litre" },
]

const person: InteractionOption[] = [
  { id: "give", label: "Give money", icon: "money" },
  { id: "id", label: "Show your ID", icon: "user" },
  { id: "search", label: "Search", icon: "search", description: "Hands up only", disabled: true },
]

export interface InteractionScene {
  target?: TargetData
  prompts?: PromptsData
}

export const interactionFixtures = {
  /** Alt held, aiming at nothing. */
  idle: { target: { options: [] } },
  /** Aiming at a car, the wheel on the first option. */
  vehicle: { target: { label: "Pegassi Zentorno", options: vehicle, active: 0, hint: "Click to choose" } },
  /** The player clicked: the cursor is the page's, the options take clicks. */
  picking: { target: { label: "Pegassi Zentorno", options: vehicle, picking: true } },
  person: { target: { label: "Riley Chen", options: person, active: 1, hint: "Scroll, then click" } },
  /** Near the fridge. */
  prompt: { prompts: { prompts: [{ id: "fridge", keys: "E", label: "Open the fridge", icon: "box" }] } },
  /** Holding G at the register, 60% in. */
  hold: {
    prompts: {
      prompts: [
        { id: "rob", keys: "G", label: "Rob the register", description: "Hold G", icon: "money", hold: 3000, progress: 0.6, active: true },
        { id: "buy", keys: "E", label: "Buy something", icon: "cart" },
      ],
    },
  },
  /** Several at once, one locked, at the bottom of the screen. */
  several: {
    prompts: {
      position: "bottom-center",
      prompts: [
        { id: "enter", keys: "E", label: "Enter the garage", icon: "car" },
        { id: "lock", keys: ["Shift", "E"], label: "Lock the door", icon: "lock", disabled: true, description: "Not your house" },
      ],
    },
  },
  /** Both at once: a prompt nearby while targeting. */
  both: {
    target: { label: "Fridge", options: [{ id: "open", label: "Open the fridge", icon: "box" }], active: 0, hint: "Click to choose" },
    prompts: { prompts: [{ id: "fridge", keys: "E", label: "Open the fridge", icon: "box" }] },
  },
} satisfies Record<string, InteractionScene>

export type InteractionFixture = keyof typeof interactionFixtures
