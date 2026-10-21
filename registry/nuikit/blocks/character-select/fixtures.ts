// Every state of the character select, as your Lua would send it. Used by dev.tsx (browser
// development, ?fixture=<name>), screenshots and the site's previews.
import type { CharacterSelectData, CharacterSummary, SpawnPoint } from "./nui"

const characters: CharacterSummary[] = [
  { id: "NKT48210", firstName: "Alex", lastName: "Moreno", job: "LSPD", grade: "Sergeant", cash: 1520, bank: 48210, birthdate: "1994-03-12", gender: "Male", lastPlayed: "Today", lastLocation: "Mission Row" },
  { id: "RCH20811", firstName: "Riley", lastName: "Chen", job: "Mechanic", grade: "Owner", cash: 320, bank: 912450, birthdate: "1988-11-02", gender: "Female", lastPlayed: "3 days ago", lastLocation: "Benny's" },
  { id: "SOK44120", firstName: "Sam", lastName: "Okafor", job: "Unemployed", cash: 40, bank: 210, birthdate: "2001-06-30", gender: "Other", lastPlayed: "Last month", lastLocation: "Sandy Shores" },
]

const spawns: SpawnPoint[] = [
  { id: "last", label: "Last location", description: "Mission Row", icon: "last" },
  { id: "legion", label: "Legion Square", description: "Downtown", icon: "city" },
  { id: "airport", label: "LS International", description: "Arrivals", icon: "airport" },
  { id: "pillbox", label: "Pillbox Medical", icon: "hospital" },
  { id: "motel", label: "Pink Cage Motel", description: "Your room", icon: "hotel" },
]

export const characterSelectFixtures = {
  three: { title: "Welcome back", characters, slots: 5, spawns, canCreate: true, canDelete: true },
  /** First join: nothing yet. */
  first: { title: "Welcome", characters: [], slots: 3, spawns, canCreate: true },
  /** Every slot taken, no spawn choice (straight in). */
  full: { title: "Welcome back", characters, slots: 3, canCreate: true, canDelete: true },
} satisfies Record<string, CharacterSelectData>

export type CharacterSelectFixture = keyof typeof characterSelectFixtures
