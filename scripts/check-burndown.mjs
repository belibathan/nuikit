#!/usr/bin/env node
// The `nuikit check` warning ratchet: one count per folder, compared with bench/check-baseline.json.
// A folder may only go down. `--update` writes the current counts as the new baseline (after a burn-down).
// In CI the table lands in the job summary. Rules per folder: `nuikit rules`; the plan: docs/roadmap.md Track C.
//
//   node scripts/check-burndown.mjs            # compare, exit 1 when a folder grew
//   node scripts/check-burndown.mjs --update   # record today's counts
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cli = path.join(root, "packages/cli/dist/cli.js");
const baselineFile = path.join(root, "bench/check-baseline.json");
const update = process.argv.includes("--update");

const folders = [
  ...fs.readdirSync(path.join(root, "systems")).map((d) => `systems/${d}`),
  ...fs.readdirSync(path.join(root, "addons")).map((d) => `addons/${d}`),
  "packages/create-nuikit/template",
];

function count(folder) {
  let out = "";
  try {
    out = execFileSync("node", [cli, "check", folder, "--level", "0"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    out = (e.stdout ?? "") + (e.stderr ?? "");
  }
  const m = out.match(/(\d+) errors?, (\d+) warnings?/);
  return m ? { errors: Number(m[1]), warnings: Number(m[2]) } : { errors: 0, warnings: 0 };
}

const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, "utf8")) : {};
const now = {};
const rows = [];
let grew = false;
for (const f of folders) {
  const c = count(f);
  now[f] = c;
  const b = baseline[f];
  const delta = b ? c.warnings - b.warnings : 0;
  if (b && delta > 0) grew = true;
  rows.push(`| ${f} | ${c.errors} | ${c.warnings} | ${b ? (delta === 0 ? "=" : delta > 0 ? `**+${delta}**` : `${delta}`) : "new"} |`);
}
const total = Object.values(now).reduce((n, c) => n + c.warnings, 0);
const table = ["| Folder | Errors | Warnings | vs baseline |", "|---|---:|---:|---:|", ...rows, `| **total** | | **${total}** | |`].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## nuikit check burn-down\n\n${table}\n`);

if (update) {
  fs.writeFileSync(baselineFile, JSON.stringify(now, null, 2) + "\n");
  console.log(`\nbaseline written: ${path.relative(root, baselineFile)}`);
} else if (grew) {
  console.error("\nwarnings grew in a folder above. Fix them, or (for a new rule) `node scripts/check-burndown.mjs --update` in the same commit and say so.");
  process.exit(1);
}
