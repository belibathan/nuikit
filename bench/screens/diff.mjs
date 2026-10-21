// Compares bench/screens/<name>/before.json and after.json: every POST (step, name, body) in order must match;
// only the `ms` timestamps may differ (reported when they drift by more than --tolerance=150 ms).
//
//   node bench/screens/diff.mjs qbx_scoreboard [--tolerance=150]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
if (!name) throw new Error("usage: node bench/screens/diff.mjs <override>");
const arg = (n, def) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? def;
const TOL = Number(arg("tolerance", 150));
const read = (f) => JSON.parse(fs.readFileSync(path.join(here, name, `${f}.json`), "utf8"));
const before = read("before");
const after = read("after");

let fail = 0;
let drift = 0;
for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const a = before[key]?.posts ?? [];
  const b = after[key]?.posts ?? [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    const sx = x ? `${x.step} ${x.name} ${x.body}` : "(none)";
    const sy = y ? `${y.step} ${y.name} ${y.body}` : "(none)";
    if (sx !== sy) {
      fail++;
      console.log(`✗ ${key} #${i}\n    before: ${sx}\n    after:  ${sy}`);
    } else if (Math.abs((x?.ms ?? 0) - (y?.ms ?? 0)) > TOL) {
      drift++;
      console.log(`~ ${key} #${i} ${x.name}: ${x.ms} ms → ${y.ms} ms`);
    }
  }
}
const total = Object.values(after).reduce((s, v) => s + (v.posts?.length ?? 0), 0);
if (fail) {
  console.log(`${fail} difference(s) in ${total} posts`);
  process.exit(1);
}
console.log(`identical: ${total} posts${drift ? `, ${drift} timing drift(s) over ${TOL} ms` : ""}`);
