// Every state of the job sheet, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), and the site's previews.
import type { JobSheetData, JobSheetPage } from "./nui"

const police: JobSheetPage[] = [
  {
    id: "root",
    title: "LSPD",
    sections: [
      {
        id: "work",
        rows: [
          { id: "armory", label: "Armory", description: "Weapons and gear for your grade", page: "armory", onDutyOnly: true },
          { id: "garage", label: "Take a patrol car", description: "From the Mission Row lot", kbd: "G", onDutyOnly: true },
          { id: "outfit", label: "Change into uniform", onDutyOnly: true },
        ],
      },
      {
        id: "office",
        title: "Office",
        rows: [
          { id: "billing", label: "Write a fine", description: "To the nearest player", kbd: "F7", onDutyOnly: true },
          { id: "records", label: "Records", description: "Warrants and reports", page: "records" },
          { id: "locker", label: "Personal locker" },
        ],
      },
    ],
    actions: [{ id: "clockout", label: "Clock out", primary: true, onDutyOnly: true }],
  },
  {
    id: "armory",
    title: "Armory",
    description: "Checked out against your grade",
    sections: [
      {
        id: "weapons",
        rows: [
          { id: "pistol", label: "Combat pistol", meta: "2 left" },
          { id: "taser", label: "Stun gun", meta: "6 left" },
          { id: "carbine", label: "Carbine rifle", meta: "Sergeant and up", disabled: true },
        ],
      },
      {
        id: "gear",
        title: "Gear",
        rows: [
          { id: "vest", label: "Body armor", meta: "12 left" },
          { id: "radio", label: "Radio" },
          { id: "return", label: "Return everything", tone: "destructive" },
        ],
      },
    ],
    actions: [{ id: "takeall", label: "Take the standard kit", primary: true }],
  },
  {
    id: "records",
    title: "Records",
    sections: [
      {
        id: "warrants",
        rows: [
          { id: "w-moreno", label: "Alex Moreno", description: "Evading, reckless driving", meta: "2 days" },
          { id: "w-park", label: "Jordan Park", description: "Unpaid fines", meta: "6 days" },
        ],
      },
    ],
  },
]

const job = { name: "police", label: "LSPD", gradeLabel: "Officer", onDuty: true }

export const jobSheetFixtures = {
  officer: { job, pages: police },
  "off-duty": {
    job: { ...job, onDuty: false },
    pages: police.map((p) => (p.id === "root" ? { ...p, actions: [{ id: "clockin", label: "Clock in", primary: true }] } : p)),
  },
  mechanic: {
    job: { name: "mechanic", label: "Benny's", gradeLabel: "Apprentice", onDuty: true },
    side: "left",
    pages: [
      {
        id: "root",
        title: "Benny's",
        sections: [
          {
            id: "shop",
            rows: [
              { id: "repair", label: "Repair kit", description: "Fix the nearest vehicle", kbd: "E", onDutyOnly: true },
              { id: "tow", label: "Tow truck", onDutyOnly: true },
              { id: "bill", label: "Send a bill", onDutyOnly: true, disabled: true, description: "No one nearby" },
            ],
          },
        ],
        actions: [{ id: "clockout", label: "Clock out", primary: true }],
      },
    ],
  },
} satisfies Record<string, JobSheetData>

export type JobSheetFixture = keyof typeof jobSheetFixtures
