// Every state of the MDT, as your Lua would send it. Used by dev.tsx (browser development,
// ?fixture=<name>), screenshots and the site's previews.
import type { MdtData, MdtDraft, MdtLimits, MdtRecord, MdtRecordSummary, MdtReport } from "./nui"

const limits: MdtLimits = { query: { min: 2, max: 32 }, title: { min: 3, max: 60 }, text: { min: 10, max: 1000 } }

const reports: MdtReport[] = [
  { id: "r3", title: "Disturbance at the Vespucci pier", author: "J. Ortega", time: 1792674300, person: "Marcus Vale", text: "Called to a fight outside the pier cafe. Two parties separated, no injuries. Marcus Vale was cautioned and left on foot." },
  { id: "r2", title: "Stolen Banshee recovered", author: "T. Reyes", time: 1792587900, text: "Vehicle found abandoned behind the Strawberry garages, engine cold. Towed to Davis impound for prints." },
  { id: "r1", title: "Welfare check, Mirror Park", author: "J. Ortega", time: 1792501500, person: "Lena Okafor", text: "Neighbour reported no contact for three days. Resident was found well and had been away." },
]

const police: MdtData = {
  title: "MDT",
  officer: { name: "J. Ortega", job: "LSPD", onDuty: true },
  reports,
  limits,
}

export const mdtFixtures = {
  police,
  ems: { ...police, officer: { name: "A. Brandt", job: "EMS", onDuty: true } } satisfies MdtData,
  /** A fresh terminal: no reports yet. */
  empty: { ...police, reports: [] } satisfies MdtData,
}

export type MdtFixture = keyof typeof mdtFixtures

/** The demo database for the browser: dev.tsx and the previews search it the way the server does. */
export const mdtRecords: MdtRecord[] = [
  { id: "p-4f1c", kind: "person", title: "Marcus Vale", subtitle: "Born 1988-03-14", fields: [{ label: "Date of birth", value: "1988-03-14" }, { label: "Address", value: "Vinewood, Apt 12" }], flags: ["Wanted", "Armed"], notes: "Known associate of the Strawberry crew. Approach with backup." },
  { id: "p-9a2e", kind: "person", title: "Lena Okafor", subtitle: "Born 1993-07-02", fields: [{ label: "Date of birth", value: "1993-07-02" }, { label: "Address", value: "Mirror Park" }], flags: [], notes: "No concerns." },
  { id: "p-31bd", kind: "person", title: "Marta Vance", subtitle: "Born 1975-11-30", fields: [{ label: "Date of birth", value: "1975-11-30" }, { label: "Address", value: "Rockford Hills" }], flags: ["Medical alert"], notes: "Severe penicillin allergy." },
  { id: "v-77c0", kind: "vehicle", title: "48KLM221", subtitle: "Banshee, black", fields: [{ label: "Model", value: "Banshee" }, { label: "Colour", value: "Black" }, { label: "Owner", value: "Marcus Vale" }], flags: ["Stolen"], notes: "Reported stolen 2026-10-18." },
  { id: "v-2d19", kind: "vehicle", title: "12ABC987", subtitle: "Sultan, white", fields: [{ label: "Model", value: "Sultan" }, { label: "Colour", value: "White" }, { label: "Owner", value: "Lena Okafor" }], flags: [], notes: undefined },
]

const summary = (r: MdtRecord): MdtRecordSummary => ({ id: r.id, kind: r.kind, title: r.title, subtitle: r.subtitle, flagged: r.flags.length > 0 })

/** What a search returns for these records. */
export const mdtSearch = (kind: MdtRecord["kind"], query: string): MdtRecordSummary[] =>
  mdtRecords.filter((r) => r.kind === kind && r.title.toLowerCase().includes(query.trim().toLowerCase())).map(summary)

export const mdtSamples = {
  people: mdtRecords.filter((r) => r.kind === "person").map(summary),
  vehicles: mdtRecords.filter((r) => r.kind === "vehicle").map(summary),
  person: mdtRecords[0]!,
  vehicle: mdtRecords[3]!,
  draft: { title: "Traffic stop on Route 1", person: "p-4f1c", text: "Stopped the black Banshee for speeding. Driver cooperative, vehicle checked against the stolen list." } satisfies MdtDraft,
}
