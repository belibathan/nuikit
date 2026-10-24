import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { ALL_TOKEN_NAMES, KEYWORD_ATTRS } from "nuikit-core"

// Invariant 4 (docs/design/baseline.md): every lever has a default and a reader. A --nk-* custom property a component
// or kit.css reads must be declared (kit.css, index.css.tpl, tokens.ts, or set by the component itself); a lever
// declared (kit.css base/:root or tokens.ts) must be read somewhere. Existing debt sits in the two ratchet lists below:
// a new violation fails, and a list entry that is fixed must be deleted.
const root = path.resolve(__dirname, "../../..")
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8")
const walk = (dir: string, exts: string[], out: string[] = []): string[] => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist") continue
    const p = path.posix.join(dir, e.name)
    if (e.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p)
  }
  return out
}
const NAME = /--nk-[a-z0-9]+(?:-[a-z0-9]+)*/g
const uniq = (s: string, re = NAME) => new Set(s.match(re) ?? [])
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "")

const uiFiles = walk("registry/nuikit/ui", [".tsx", ".ts"])
const kit = strip(read("packages/create-nuikit/kit.css"))
const tpl = strip(read("packages/create-nuikit/index.css.tpl"))

/** Names read: var(--nk-x…), Tailwind (--nk-x) arbitrary values, and style={{ … }} reads. */
const readsIn = (s: string, bare = false) => {
  const out = new Set<string>()
  // a read with a fallback (var(--nk-x, 2rem)) carries its own default; `bare` keeps only reads without one
  for (const m of s.matchAll(/(?:var\(\s*|\(\s*|\[\s*)(--nk-[a-z0-9]+(?:-[a-z0-9]+)*)(\s*,)?/g)) if (!bare || !m[2]) out.add(m[1]!)
  // JS reads: getPropertyValue("--nk-x") and the like (a quoted name not followed by a colon)
  if (!bare) for (const m of s.matchAll(/["'`](--nk-[a-z0-9]+(?:-[a-z0-9]+)*)["'`](?!\s*:)/g)) out.add(m[1]!)
  return out
}
/** Names set: `--nk-x:` in CSS, or "--nk-x": / `--nk-x`: in a style object, or a Record key. */
const setsIn = (s: string) => {
  const out = new Set<string>()
  for (const m of s.matchAll(/(--nk-[a-z0-9]+(?:-[a-z0-9]+)*)["'`]?\s*:/g)) out.add(m[1]!)
  for (const m of s.matchAll(/@property\s+(--nk-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) out.add(m[1]!)
  return out
}

const uiText = uiFiles.map((f) => [f, strip(read(f))] as const)
const reads = new Map<string, string[]>() // name → files that read it
const bareReads = new Set<string>()
for (const [f, s] of [...uiText, ["kit.css", kit] as const]) {
  for (const n of readsIn(s)) reads.set(n, [...(reads.get(n) ?? []), f])
  for (const n of readsIn(s, true)) bareReads.add(n)
}

// declared: tokens.ts, kit.css and the template anywhere, or set by a component that reads it
const declared = new Set<string>([...ALL_TOKEN_NAMES.map((n) => `--${n}`), ...setsIn(kit), ...setsIn(tpl)])
const setByUi = new Set<string>()
for (const [, s] of uiText) for (const n of setsIn(s)) setByUi.add(n)

// levers: declared in kit.css @layer nk.base / :root
const baseBlocks = [...kit.matchAll(/@layer nk\.base\s*\{|(?:^|\n):root[^{]*\{/g)].map((m) => m.index!)
const leverNames = new Set<string>()
for (const i of baseBlocks) {
  let depth = 0
  let end = i
  for (let j = kit.indexOf("{", i); j < kit.length; j++) {
    if (kit[j] === "{") depth++
    else if (kit[j] === "}" && --depth === 0) { end = j; break }
  }
  for (const n of setsIn(kit.slice(i, end))) leverNames.add(n)
}

// anything outside registry ui and kit.css that reads a lever also keeps it alive (core, themes, systems, addons, template)
const otherText = [
  ...walk("packages/core/src", [".ts", ".tsx"]),
  ...walk("packages/core/themes", [".css"]),
  ...walk("packages/create-nuikit/template", [".css", ".tsx", ".ts"]),
  ...walk("systems", [".css", ".tsx", ".ts", ".lua"]).filter((f) => !f.includes("/node_modules/")),
  ...walk("addons", [".css", ".tsx", ".ts"]),
  ...walk("registry/nuikit/blocks", [".tsx", ".ts"]),
  ...walk("registry/nuikit/hooks", [".ts", ".tsx"]),
  ...walk("registry/nuikit/lib", [".ts", ".tsx"]),
].filter((f) => !f.endsWith("tokens.ts") && !f.endsWith("tokens.generated.ts")).map((f) => strip(read(f)))
const readElsewhere = new Set<string>()
for (const s of [...otherText, tpl]) for (const n of readsIn(s)) readElsewhere.add(n)
// keyword levers are read as attributes (applyTheme paints data-nk-fill, data-nk-feel… from them)
for (const [, token] of KEYWORD_ATTRS) readElsewhere.add(`--${token}`)
// theme inputs the compiler reads by name (motion bounce, surface tint…), and colours read through their channels
const compiler = read("packages/core/src/tokens.ts") + read("packages/core/src/theme.ts")
for (const n of leverNamesAll()) if (compiler.includes(`"${n.slice(2)}"`)) readElsewhere.add(n)
for (const s of [kit, ...otherText, ...uiText.map(([, t]) => t)]) for (const m of s.matchAll(/var\((--nk-[a-z0-9-]+)-rgb\b/g)) readElsewhere.add(m[1]!)
// a part read by a computed name (nk-behavior-notify-${severity}), springs read as --nk-spring-${name} by nuikit-core/motion
for (const s of [...otherText, ...uiText.map(([, t]) => t)]) for (const m of s.matchAll(/nk-([a-z-]+)-\$\{/g)) for (const n of leverNamesAll()) if (n.startsWith(`--nk-${m[1]}-`)) readElsewhere.add(n)
function leverNamesAll() {
  return [...leverNames]
}
// a lever read inside another declaration of kit.css (var(--nk-a) in a value) counts as read: `reads` covers kit.css

/** Reads with no declaration anywhere (existing debt: delete a row when fixed). */
const UNDECLARED_DEBT: string[] = []
/** Declared levers nothing reads (existing debt: delete a row when it is read or removed). */
const DEAD_DEBT: string[] = []

const undeclared = [...bareReads].filter((n) => !declared.has(n) && !setByUi.has(n)).sort()
const dead = [...leverNames].filter((n) => !reads.has(n) && !readElsewhere.has(n)).sort()

describe("levers: every read has a default, every default a reader", () => {
  it("every --nk-* read in registry ui / kit.css is declared", () => {
    expect(undeclared.filter((n) => !UNDECLARED_DEBT.includes(n)), "declare it in kit.css @layer nk.base (or tokens.ts)").toEqual([])
    expect(UNDECLARED_DEBT.filter((n) => !undeclared.includes(n)), "fixed: delete from UNDECLARED_DEBT").toEqual([])
  })
  it("every lever declared is read somewhere", () => {
    expect(dead.filter((n) => !DEAD_DEBT.includes(n)), "read it, or remove it").toEqual([])
    expect(DEAD_DEBT.filter((n) => !dead.includes(n)), "fixed: delete from DEAD_DEBT").toEqual([])
  })
  it.skipIf(!process.env.LEVER_REPORT)("report", () => {
    console.log("UNDECLARED", JSON.stringify(undeclared), "\nDEAD", JSON.stringify(dead))
  })
})
