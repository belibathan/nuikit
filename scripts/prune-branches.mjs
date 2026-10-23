#!/usr/bin/env node
// Delete remote branches that have no commits of their own (ahead of main by 0), keeping main and the
// changesets bot branch. Dry run by default; `--delete` deletes. Needs `gh` logged in.
//
//   node scripts/prune-branches.mjs            # list what would go, and what has unmerged commits
//   node scripts/prune-branches.mjs --delete   # delete the fully-merged ones
import { execFileSync } from "node:child_process";

const repo = "belibathan/nuikit";
const keep = new Set(["main", "changeset-release/main"]);
const del = process.argv.includes("--delete");
const gh = (...args) => execFileSync("gh", args, { encoding: "utf8" }).trim();

// one name per line: with --paginate, a `[...]` jq filter prints one array per page, which isn't one JSON value
const branches = gh("api", "--paginate", `repos/${repo}/branches?per_page=100`, "--jq", ".[].name").split("\n").filter(Boolean);
const merged = [];
const ahead = [];
for (const b of branches) {
  if (keep.has(b)) continue;
  const [a, behind] = gh("api", `repos/${repo}/compare/main...${encodeURIComponent(b)}`, "--jq", ".ahead_by,.behind_by").split("\n");
  (Number(a) === 0 ? merged : ahead).push({ b, a: Number(a), behind: Number(behind) });
}
console.log(`${branches.length} branches: ${merged.length} fully merged, ${ahead.length} with unmerged commits\n`);
for (const x of ahead) console.log(`  keep  ${x.b}  (+${x.a}, -${x.behind})`);
console.log("");
for (const x of merged) {
  if (del) {
    gh("api", "-X", "DELETE", `repos/${repo}/git/refs/heads/${x.b}`);
    console.log(`  deleted  ${x.b}`);
  } else console.log(`  merged   ${x.b}`);
}
if (!del) console.log("\nDry run. Re-run with --delete to remove the merged ones.");
