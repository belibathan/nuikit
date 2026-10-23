#!/usr/bin/env node
/**
 * nuikit: the command line for the nuikit protocol.
 *
 *   nuikit check [path…] [--level 1|2|3] [--json] [--verbose] [--include-built]
 *   nuikit tokens [--json | --css]
 *   nuikit theme new <name> [--from <theme>] [--out theme.css] [--force]
 *   nuikit theme --list
 */
import fs from "node:fs";
import { check, LEVEL_NAMES, RULES, type Level } from "./check";
import { bold, dim, formatResult, formatSummary, formatTokens, red } from "./format";
import { TOKENS, TOKEN_SOURCE } from "./tokens";
import { DEFAULT_FROM, problems, renderTheme, shippedCss, shippedThemes } from "./theme";

/** From package.json (dist/cli.js → ../package.json), so it can't fall behind the release. */
const VERSION: string = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const HELP = `${bold("nuikit")} ${dim(VERSION)}: the UI platform layer for FiveM

${bold("Usage")}
  nuikit check [path…]    audit resources (or folders of resources) against the protocol
    --level <1|2|3>       exit 1 if any resource is below this level
    --json                machine-readable output
    --verbose             list every finding (default: 5 per rule)
    --include-built       also grade dist/ and build/ output when sources exist
  nuikit tokens           list the theme tokens (tokens v1)
    --json | --css
  nuikit theme new <name> start a theme file from a shipped theme (levers.md)
    --from <theme>        default ${DEFAULT_FROM} (nuikit theme --list)
    --out <file>          default theme.css
    --force               overwrite an existing file
  nuikit theme --list     list the shipped themes
  nuikit rules            list the check rules

${bold("Levels")} (docs/protocol.md §10)
  1 themed        reads theme tokens, no hard-coded colours
  2 well-behaved  registers surfaces, never calls SetNuiFocus, releases focus on stop, Escape via surfaces
  3 native        uses the nuikit runtime and components

Silence a deliberate exception with a comment: ${dim("/* nuikit-ignore color/hardcoded: GTA hair palette */")}
or ${dim("// nuikit-ignore-next-line")} on the line above.`;

/** `--name value` or `--name=value`. */
function flag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq !== undefined) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function main(argv: string[]): number {
  const [cmd, ...args] = argv;
  if (!cmd || cmd === "-h" || cmd === "--help" || cmd === "help") {
    console.log(HELP);
    return 0;
  }
  if (cmd === "-v" || cmd === "--version") {
    console.log(VERSION);
    return 0;
  }

  if (cmd === "tokens") {
    if (args.includes("--json")) console.log(JSON.stringify({ version: 1, source: TOKEN_SOURCE, tokens: TOKENS }, null, 2));
    else if (args.includes("--css")) console.log(TOKENS.map((t) => `--${t.name}`).join("\n"));
    else console.log(formatTokens());
    return 0;
  }

  if (cmd === "theme") {
    if (args.includes("--list")) {
      console.log(shippedThemes().join("\n"));
      return 0;
    }
    const name = args[1];
    if (args[0] !== "new" || !name || name.startsWith("--")) {
      console.error(red("✗ usage: nuikit theme new <name> [--from <theme>] [--out theme.css] [--force]"));
      return 2;
    }
    if (!/^[a-z][a-z0-9-]*$/.test(name)) {
      console.error(red(`✗ theme name "${name}" must be lowercase letters, digits and dashes`));
      return 2;
    }
    const from = flag(args, "--from") ?? DEFAULT_FROM;
    const css = shippedCss(from);
    if (css === undefined) {
      console.error(red(`✗ no shipped theme "${from}" (nuikit theme --list)`));
      return 2;
    }
    const out = flag(args, "--out") ?? "theme.css";
    if (fs.existsSync(out) && !args.includes("--force")) {
      console.error(red(`✗ ${out} exists (pass --force to overwrite)`));
      return 2;
    }
    const { text, set, unset } = renderTheme({ name, from, css });
    const bad = problems(text);
    if (bad.length) {
      console.error(red(`✗ the generated theme does not pass: ${bad.join("; ")}`));
      return 2;
    }
    fs.writeFileSync(out, text);
    console.log(`✓ wrote ${out}: ${set} values from ${from}, ${unset} levers left to the kit (commented)`);
    return 0;
  }

  if (cmd === "rules") {
    for (const [id, r] of Object.entries(RULES)) console.log(`${(r.level ? `L${r.level}` : "perf").padEnd(5)} ${id.padEnd(20)} ${r.description}`);
    return 0;
  }

  if (cmd === "check") {
    const valueFlags = new Set(["--level"]);
    const positional = args.filter((a, i) => !a.startsWith("--") && !valueFlags.has(args[i - 1] ?? ""));
    const targets = positional.length ? positional : ["."];
    const target = targets.join(", ");
    for (const t of targets)
      if (!fs.existsSync(t)) {
        console.error(red(`✗ ${t} does not exist`));
        return 2;
      }
    const levelArg = flag(args, "--level");
    const threshold = levelArg === undefined ? 0 : Number(levelArg);
    if (![0, 1, 2, 3].includes(threshold)) {
      console.error(red(`✗ --level must be 1, 2 or 3`));
      return 2;
    }
    let results: ReturnType<typeof check>;
    try {
      results = targets.flatMap((t) => check(t, { includeBuilt: args.includes("--include-built") }));
    } catch (e) {
      console.error(red(`✗ check failed: ${e instanceof Error ? e.message : String(e)}`));
      return 2;
    }
    if (!results.length) {
      console.error(red(`✗ no resource found under ${target} (looked for fxmanifest.lua, web/ or index.html)`));
      return 2;
    }
    const failing = results.filter((r) => r.level !== null && r.level < threshold);
    if (args.includes("--json")) {
      console.log(JSON.stringify({ protocol: 1, threshold, pass: failing.length === 0, results }, null, 2));
    } else {
      console.log(results.map((r) => formatResult(r, { verbose: args.includes("--verbose") })).join("\n\n"));
      console.log(`\n${formatSummary(results)}`);
      if (threshold) {
        console.log(
          failing.length
            ? red(`✗ ${failing.length} below level ${threshold} (${LEVEL_NAMES[threshold as Level]}): ${failing.map((r) => r.name).join(", ")}`)
            : `✓ all at level ${threshold} (${LEVEL_NAMES[threshold as Level]}) or above`,
        );
      }
    }
    return failing.length ? 1 : 0;
  }

  console.error(red(`✗ unknown command "${cmd}"`) + `\n\n${HELP}`);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
