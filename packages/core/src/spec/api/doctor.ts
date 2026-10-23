import type { DomainSpec } from "./types";

const J = "js only: runs in the nuikit resource's server (Node) and the CLI";
/** Doctor: the server-side checks, install planning and coverage maths the nuikit resource and the CLI run. */
export default {
  js: "doctor",
  lua: "doctor",
  title: "Doctor",
  doc: "What runs on the server and in the CLI: the doctor's report, override install plans, coverage maths.",
  docs: "docs/doctor.md",
  entries: [
    { name: "run", kind: "call", doc: "A report of every resource: nuikit, override, adapter, outdated.", js: "doctor", only: J, since: "0.6.0" },
    { name: "format", kind: "call", doc: "The report as lines.", js: "formatDoctor", only: J, since: "0.6.0" },
    { name: "detectFramework", kind: "call", doc: "Qbox, QBCore, ESX or standalone from the resource list.", js: "detectFramework", only: J, since: "0.6.0" },
    { name: "compareVersions", kind: "call", doc: "Semver compare.", js: "compareVersions", only: J, since: "0.6.0" },
    { name: "pageHash", kind: "call", doc: "A page's hash (override drift).", js: "pageHash", also: ["bytesHash"], only: J, since: "0.6.0" },
    { name: "adapterPacks", kind: "const", doc: "The adapter packs the doctor knows.", js: "ADAPTER_PACKS", only: J, since: "0.6.0" },
    { name: "planInstall", kind: "call", doc: "What installing overrides would change.", js: "planInstall", also: ["planUninstall", "overrideOutdated", "formatInstall"], only: J, since: "0.6.0" },
    { name: "coverage", kind: "call", doc: "Coverage of a framework session by the drawn intents.", js: "computeCoverage", also: ["parseSessionLog", "formatCoverage", "COVERAGE_TARGETS"], only: J, since: "0.7.0" },
  ],
  events: [
    { name: "nuikit:doctor:command", dir: "net", payload: "string[]", sender: "any", doc: "/nuikit <sub>, ace-checked on the server.", wire: "nuikit:command", since: "0.5.0" },
    { name: "nuikit:doctor:renderer-failed", dir: "net", payload: "{ resource: string; kind: string; message: string }", sender: "nuikit", doc: "A renderer failed to load (for the doctor).", wire: "nuikit:renderer:failed", since: "0.7.0" },
  ],
} satisfies DomainSpec;
