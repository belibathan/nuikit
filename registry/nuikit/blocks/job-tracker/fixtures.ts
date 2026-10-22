// Every state of the job tracker, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { JobTrackerData } from "./nui"

const delivery: JobTrackerData = {
  title: "Warehouse delivery",
  description: "Load the van, drive, unload",
  pay: 850,
  steps: [
    { id: "pickup", label: "Pick up the van", description: "Port of Los Santos, bay 4" },
    { id: "load", label: "Load the boxes", description: "Warehouse floor", count: 5, unit: "boxes" },
    { id: "drive", label: "Deliver to Vespucci", description: "Marked on your map" },
    { id: "unload", label: "Unload", count: 5, unit: "boxes" },
  ],
  current: 1,
  progress: 3,
  action: { key: "E", label: "Load a box" },
}

export const jobTrackerFixtures = {
  /** Mid-way through a counted step. */
  loading: delivery,
  /** A step that is a place: the meter is the distance. */
  driving: { ...delivery, current: 2, progress: undefined, distance: 640, action: undefined },
  /** The first step. */
  start: { ...delivery, current: 0, progress: undefined, distance: 38, action: { key: "E", label: "Take the keys" } },
  /** All steps done, payment on the way. */
  done: { ...delivery, current: 4, progress: undefined, action: undefined },
} satisfies Record<string, JobTrackerData>

export type JobTrackerFixture = keyof typeof jobTrackerFixtures
