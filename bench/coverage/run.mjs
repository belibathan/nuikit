// Coverage run (README.md): node bench/coverage/run.mjs <framework> <session.jsonl> <doctor.json>
// <doctor.json> is the line `nuikit doctor json` printed. Writes results/<framework>-<date>.md; exits 1 below target.
// Needs nuikit-core built (pnpm -r --filter "./packages/**" build).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { computeCoverage, formatCoverage, parseSessionLog } from "../../packages/core/dist/coverage.js";

const [framework, sessionPath, doctorPath] = process.argv.slice(2);
if (!framework || !sessionPath || !doctorPath) {
  console.error("usage: node bench/coverage/run.mjs <qbox|qbcore|esx> <session.jsonl> <doctor.json>");
  process.exit(2);
}
const doctor = JSON.parse(readFileSync(doctorPath, "utf8").trim().split(/\r?\n/).pop());
const r = computeCoverage(framework, parseSessionLog(readFileSync(sessionPath, "utf8")), doctor.intents ?? []);
const date = new Date().toISOString().slice(0, 10);
const dir = new URL("./results/", import.meta.url);
mkdirSync(dir, { recursive: true });
const md = formatCoverage(r, { date, version: doctor.runtime?.version });
writeFileSync(new URL(`${framework}-${date}.md`, dir), md);
console.log(md.split("\n").slice(0, 3).join("\n"));
process.exit(r.pass === false ? 1 : 0);
