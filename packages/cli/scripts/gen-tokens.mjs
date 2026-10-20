// Build step: read the tokens v1 DTCG file(s) in packages/core/tokens/ into src/tokens.generated.ts.
// Missing directory (or nothing recognisable in it) → GENERATED = null and src/tokens.ts uses its
// embedded list. Tolerant of nesting: a leaf is any object with `$value`; its CSS name is taken from
// `$extensions.*.(cssVar|css|var|name)` when present, else from the path (top-level type group dropped).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(process.argv[2] ?? path.join(here, "../../core/tokens"));
const out = path.resolve(process.argv[3] ?? path.join(here, "../src/tokens.generated.ts"));

const TYPE_GROUPS = new Set(["color", "colors", "dimension", "number", "font", "fontfamily", "duration", "shadow", "tokens", "nuikit", "shadcn", "kit"]);

function cssName(pathParts, node) {
  const ext = node.$extensions && typeof node.$extensions === "object" ? Object.values(node.$extensions) : [];
  for (const e of ext) {
    if (!e || typeof e !== "object") continue;
    for (const k of ["cssVar", "css", "var", "name"]) {
      if (typeof e[k] === "string") return e[k].replace(/^--/, "").replace(/^var\(--|\)$/g, "");
    }
  }
  const parts = [...pathParts];
  while (parts.length > 1 && TYPE_GROUPS.has(parts[0].toLowerCase())) parts.shift();
  return parts.join("-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function group(name) {
  if (/^(success|warning|info)(-|$)/.test(name)) return "status";
  if (/^hud(-|$)/.test(name)) return "hud";
  if (/^vital-/.test(name)) return "vital";
  if (/^chart-/.test(name)) return "chart";
  if (/^sidebar(-|$)/.test(name)) return "sidebar";
  if (name === "radius") return "shape";
  if (/^font-/.test(name)) return "font";
  if (/^nk-/.test(name)) return "kit";
  return "base";
}

function type(t, name) {
  if (t === "color" || t === "dimension" || t === "fontFamily" || t === "number") return t;
  if (/^font-/.test(name)) return "fontFamily";
  if (name === "radius") return "dimension";
  if (/^nk-/.test(name)) return "number";
  return "color";
}

function walk(node, parts, inheritedType, acc) {
  if (!node || typeof node !== "object") return;
  const t = node.$type ?? inheritedType;
  if ("$value" in node) {
    const name = cssName(parts, node);
    if (name) acc.push({ name, group: group(name), type: type(t, name), description: typeof node.$description === "string" ? node.$description : "" });
    return;
  }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, [...parts, k], t, acc);
}

let tokens = null;
if (fs.existsSync(dir)) {
  const acc = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    try {
      walk(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), [], undefined, acc);
    } catch (e) {
      console.warn(`gen-tokens: skipping ${f}: ${e.message}`);
    }
  }
  const seen = new Set();
  tokens = acc.filter((t) => (seen.has(t.name) ? false : (seen.add(t.name), true)));
  if (!tokens.length) tokens = null;
}

const body = `// Written by scripts/gen-tokens.mjs from packages/core/tokens/*.json. null = file not found at build time.
export const GENERATED: { name: string; group: string; type: string; description: string }[] | null = ${tokens ? JSON.stringify(tokens, null, 2) : "null"};
`;
if (!fs.existsSync(out) || fs.readFileSync(out, "utf8") !== body) fs.writeFileSync(out, body);
console.log(tokens ? `gen-tokens: ${tokens.length} tokens from packages/core/tokens` : "gen-tokens: packages/core/tokens not found, using the embedded tokens v1 list");
