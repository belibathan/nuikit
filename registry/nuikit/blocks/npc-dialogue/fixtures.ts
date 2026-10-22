// Every state of the dialogue, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { DialogueData } from "./nui"

const bartender: DialogueData = {
  speaker: "Marty",
  role: "Bartender, The Hen House",
  text: "Evening. You look like someone who needs a drink, or a favour. Which is it?",
  choices: [
    { id: "drink", label: "A drink, please" },
    { id: "rumours", label: "Heard anything lately?" },
    { id: "backroom", label: "I'd like a look in the back room", locked: true, lockedReason: "Needs $500" },
    { id: "leave", label: "Never mind" },
  ],
}

export const dialogueFixtures = {
  bartender,
  /** A choice only some players get. */
  desk: {
    speaker: "Sergeant Doyle",
    role: "Mission Row desk",
    text: "Records are down the hall. Evidence lockers are for officers only.",
    choices: [
      { id: "report", label: "I'd like to file a report" },
      { id: "evidence", label: "Open the evidence locker", locked: true, lockedReason: "Police only" },
      { id: "leave", label: "Thanks" },
    ],
  },
  /** One long line and a way out. */
  long: {
    speaker: "Old Pete",
    text: "I came here in '82 with a suitcase and a bad idea. The bad idea turned into a bar, the bar turned into a debt, and the debt turned into you standing there. Funny how it goes.",
    choices: [{ id: "leave", label: "Take care, Pete" }],
  },
} satisfies Record<string, DialogueData>

export type DialogueFixture = keyof typeof dialogueFixtures
