// Every state of the scoreboard, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>&q=<search>), screenshots and the site's previews.
import type { ScoreboardActivity, ScoreboardData, ScoreboardPlayer } from "./nui"

const names = [
  "Alex Mercer", "Jordan Reyes", "Sam Okafor", "Riley Chen", "Casey Novak", "Morgan Blake", "Taylor Quinn", "Jamie Ortiz",
  "Drew Patel", "Avery Brooks", "Quinn Sato", "Rowan Hale", "Skyler Diaz", "Parker Lane", "Emerson Cole", "Reese Kim",
]
const jobs = ["LSPD", "EMS", "Mechanic", "", "LSPD", "Taxi", "", "Lawyer", "", "EMS", "", "Realtor", "", "LSPD", "", "Burger Shot"]
const pings = [38, 52, 140, 61, 233, 44, 97, 72, 180, 29, 66, 310, 55, 81, 120, 47]

const players: ScoreboardPlayer[] = names.map((name, i) => ({
  id: [3, 7, 12, 14, 18, 21, 25, 26, 31, 33, 40, 41, 44, 52, 57, 63][i]!,
  name,
  job: jobs[i] || undefined,
  ping: pings[i],
  you: i === 1,
}))

const activities: ScoreboardActivity[] = [
  { id: "store", label: "Store robbery", available: true, detail: "3 police on duty" },
  { id: "jewelry", label: "Jewelry store", available: true, detail: "3 police on duty" },
  { id: "bank", label: "Fleeca bank", available: false, detail: "Needs 4 police" },
  { id: "pacific", label: "Pacific Standard", available: false, detail: "Needs 6 police" },
]

export const scoreboardFixtures = {
  full: { title: "Los Santos", players, max: 128, activities },
  // players only: no activities configured
  players: { players: players.slice(0, 6), max: 48 },
  // standalone server: no jobs shared
  standalone: { players: players.slice(0, 8).map(({ job: _job, ...p }) => p), max: 32 },
  alone: { title: "Los Santos", players: [{ id: 1, name: "Alex Mercer", ping: 24, you: true }], max: 128, activities },
} satisfies Record<string, ScoreboardData>

export type ScoreboardFixture = keyof typeof scoreboardFixtures
