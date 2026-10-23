#!/usr/bin/env node
/**
 * nuikit-doctor — check any built NUI for CSS that FiveM's Chromium 103 can't render.
 *
 *   npx nuikit-doctor web/dist          # report
 *   npx nuikit-doctor web/dist --fix    # lower in place (for UIs not built with vite-plugin-nuikit)
 */
import fs from "node:fs";
import path from "node:path";
import { formatReport, lowerCss } from "./compat";

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const target = args.find((a) => !a.startsWith("--")) ?? "web/dist";

function walk(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  const stat = fs.statSync(p);
  if (stat.isFile()) return p.endsWith(".css") ? [p] : [];
  return fs.readdirSync(p).flatMap((f) => (f === "node_modules" ? [] : walk(path.join(p, f))));
}

const files = walk(target);
if (!files.length) {
  console.log(`\x1b[33m!\x1b[0m no .css files under ${target}`);
  process.exit(1);
}

let problems = 0;
let unparsed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  let lowered: ReturnType<typeof lowerCss>;
  try {
    lowered = lowerCss(before, { filename: file, minify: true });
  } catch (e) {
    // one unparsable file (a vendor bundle, a half-written build) shouldn't hide the rest
    unparsed++;
    console.log(`\n\x1b[1m${file}\x1b[0m\n  \x1b[31m✗\x1b[0m could not parse: ${e instanceof Error ? e.message : String(e)}`);
    continue;
  }
  const { code, report } = lowered;
  // What would break if shipped as-is:
  const unsupported = [
    ["oklch()/lab() colors", (before.match(/\b(?:okl(?:ch|ab)|lab|lch)\(/g) ?? []).length],
    ["color-mix() (bg-x/50 opacity)", (before.match(/color-mix\(/g) ?? []).length],
    ["media range syntax (width >= …)", (before.match(/\((?:width|height)\s*[<>]=?/g) ?? []).length],
    ["individual translate/scale/rotate", (before.match(/[;{\s](?:translate|scale|rotate)\s*:/g) ?? []).length],
  ] as const;
  console.log(`\n\x1b[1m${file}\x1b[0m`);
  for (const [name, n] of unsupported) {
    if (n) {
      problems++;
      console.log(`  \x1b[31m✗\x1b[0m ${name} ×${n}${fix ? " \x1b[2m→ lowered\x1b[0m" : ""}`);
    }
  }
  if (fix) {
    fs.writeFileSync(file, code);
    console.log(formatReport(report).split("\n").slice(1).join("\n"));
  } else {
    for (const w of report.warnings) console.log(`  \x1b[33m!\x1b[0m ${w.feature} ×${w.count} \x1b[2m— ${w.hint}\x1b[0m`);
  }
}

if (unparsed) {
  console.log(`\n\x1b[31m✗\x1b[0m ${unparsed} file(s) could not be parsed`);
  process.exit(1);
}
if (!fix && problems) {
  console.log(`\n\x1b[2mRun with --fix to lower in place, or build with vite-plugin-nuikit.\x1b[0m`);
  process.exit(1);
}
console.log(`\n\x1b[32m✓\x1b[0m ready for Chromium 103`);
