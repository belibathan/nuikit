// Every state of the job menu, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { JobEmployee, JobGrade, JobMenuAction, JobMenuData } from "./nui"

const actions: JobMenuAction[] = [
  { id: "armory", label: "Open the armory", description: "Weapons and gear for your grade", onDutyOnly: true },
  { id: "vehicles", label: "Take a patrol car", description: "From the Mission Row lot", kbd: "G", onDutyOnly: true },
  { id: "outfit", label: "Change into uniform", onDutyOnly: true },
  { id: "billing", label: "Write a fine", description: "To the nearest player", kbd: "F7", onDutyOnly: true },
  { id: "locker", label: "Personal locker" },
]

const grades: JobGrade[] = [
  { grade: 0, label: "Cadet" },
  { grade: 1, label: "Officer" },
  { grade: 2, label: "Sergeant" },
  { grade: 3, label: "Lieutenant" },
  { grade: 4, label: "Chief", boss: true },
]

const employees: JobEmployee[] = [
  { id: "ABC12345", name: "Alex Moreno", grade: 4, online: true, onDuty: true, you: true },
  { id: "RCH20811", name: "Riley Chen", grade: 3, online: true, onDuty: true },
  { id: "SOK44120", name: "Sam Okafor", grade: 2, online: true },
  { id: "JPA90127", name: "Jordan Park", grade: 1 },
  { id: "TVS31008", name: "Taylor Voss", grade: 0, online: true, onDuty: true },
]

const job = { name: "police", label: "LSPD", gradeLabel: "Chief", onDuty: true }

export const jobMenuFixtures = {
  boss: {
    job,
    actions,
    boss: { employees, grades, balance: 912450, nearby: [{ id: 14, name: "Casey Ito" }, { id: 27, name: "Morgan Hale" }] },
  },
  officer: { job: { ...job, gradeLabel: "Officer" }, actions },
  "off-duty": { job: { ...job, gradeLabel: "Officer", onDuty: false }, actions },
  "no-one-nearby": { job, actions, boss: { employees: employees.slice(0, 2), grades } },
  mechanic: {
    job: { name: "mechanic", label: "Benny's", gradeLabel: "Apprentice", onDuty: true },
    actions: [
      { id: "repair", label: "Repair kit", description: "Fix the nearest vehicle", kbd: "E", onDutyOnly: true },
      { id: "tow", label: "Tow truck", onDutyOnly: true },
      { id: "bill", label: "Send a bill", onDutyOnly: true, disabled: true, description: "No one nearby" },
    ],
  },
} satisfies Record<string, JobMenuData>

export type JobMenuFixture = keyof typeof jobMenuFixtures
