import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Registry metadata and the deprecation policy (docs/design.md, "Registry metadata").
const root = path.resolve(__dirname, "../../..")
type Spec = { role: string; anatomy: string[]; props?: string[]; level?: string; rules: string[] }
type Meta = { since: string; status: string; replaces: string[]; removeIn: string | null; replacedBy?: string[]; spec?: Spec }
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")) as {
  items: { name: string; type: string; description?: string; files: { path: string }[]; meta?: Meta }[]
}
const names = new Set(registry.items.map((i) => i.name))
// removed after their deprecation; `replaces` still names them (history)
const REMOVED = ["key-hint", "task-progress", "nui-toaster", "hud-chip", "vital", "nui-menu"]
const releases = fs
  .readdirSync(path.join(root, "docs/releases"))
  .map((f) => f.match(/^v(\d+\.\d+\.\d+)\.md$/)?.[1])
  .filter((v): v is string => !!v)

describe("registry meta", () => {
  it("every item has since, status, replaces and removeIn", () => {
    for (const item of registry.items) {
      expect(item.meta, item.name).toBeDefined()
      const m = item.meta!
      expect(m.since === "unreleased" || releases.includes(m.since), `${item.name}: since ${m.since} has no docs/releases entry`).toBe(true)
      expect(["stable", "experimental", "deprecated"], item.name).toContain(m.status)
      expect(Array.isArray(m.replaces), item.name).toBe(true)
      for (const r of m.replaces) expect(names.has(r) || REMOVED.includes(r), `${item.name} replaces ${r}`).toBe(true)
    }
  })

  it("a deprecated item names its replacement, says so, and stays for two minors", () => {
    for (const item of registry.items.filter((i) => i.meta?.status === "deprecated")) {
      const m = item.meta!
      expect(m.replacedBy?.length, item.name).toBeGreaterThan(0)
      for (const r of m.replacedBy!) expect(names, `${item.name} → ${r}`).toContain(r)
      expect(item.description, item.name).toMatch(/^Deprecated: use /)
      expect(m.removeIn, item.name).toMatch(/^\d+\.\d+\.\d+$/)
      // still here after removeIn shipped: remove it, or move removeIn and say why in the release notes
      expect(releases, `${item.name} should have been removed in ${m.removeIn}`).not.toContain(m.removeIn)
      for (const f of item.files) expect(fs.readFileSync(path.join(root, f.path), "utf8"), f.path).toContain("@deprecated")
    }
  })

  it("only deprecated items have removeIn or replacedBy", () => {
    for (const item of registry.items.filter((i) => i.meta?.status !== "deprecated")) {
      expect(item.meta!.removeIn, item.name).toBeNull()
      expect(item.meta!.replacedBy, item.name).toBeUndefined()
    }
  })

  it("key-hint, task-progress and nui-toaster are gone in 0.9.0; their successors stay", () => {
    for (const n of REMOVED) {
      expect(names.has(n), n).toBe(false)
      expect(fs.existsSync(path.join(root, `registry/nuikit/ui/${n}.tsx`)), n).toBe(false)
    }
    for (const n of ["key-prompt", "meter", "progress-ring", "notice"]) expect(names.has(n), n).toBe(true)
  })
})

// Foundation 2: the component spec template (role, anatomy, props, level means, rules) in registry meta,
// and the same template in each component's doc comment (docs/design.md §3).
describe("component specs", () => {
  const UI = registry.items.filter((i) => i.type === "registry:ui")
  const LEVEL = ["meter", "vital-chip", "progress-ring", "notice", "key-prompt", "dial", "countdown", "speedometer"]
  const meta = (n: string) => registry.items.find((i) => i.name === n)?.meta

  it("every component says its role, anatomy and rules", () => {
    for (const { name: n } of UI) {
      const spec = meta(n)?.spec
      expect(spec, n).toBeDefined()
      expect(spec!.role.length, n).toBeGreaterThan(10)
      expect(spec!.anatomy.length, n).toBeGreaterThan(0)
      expect(spec!.rules.length, n).toBeGreaterThan(0)
    }
  })

  it("every component on the --level contract says what its level means", () => {
    for (const n of LEVEL) expect(meta(n)?.spec?.level, n).toMatch(/\S/)
  })

  it("a spec's props are real: each file mentions them", () => {
    for (const item of registry.items.filter((i) => i.meta?.spec?.props)) {
      const src = item.files.map((f) => fs.readFileSync(path.join(root, f.path), "utf8")).join("\n")
      for (const p of item.meta!.spec!.props!) expect(src, `${item.name}: ${p}`).toMatch(new RegExp(`\\b${p}\\b`))
    }
  })

  it("every component's doc comment carries the spec template", () => {
    for (const item of UI) {
      const src = fs.readFileSync(path.join(root, item.files[0]!.path), "utf8")
      for (const head of ["Role:", "Anatomy:", "Rules:"]) expect(src, `${item.name}: ${head}`).toMatch(new RegExp(`^ \\* ${head}`, "m"))
      if (item.meta?.spec?.props?.length) expect(src, `${item.name}: Props:`).toMatch(/^ \* Props:/m)
      if (item.meta?.spec?.level) expect(src, `${item.name}: Level means:`).toMatch(/^ \* Level means:/m)
    }
  })
})

// Each item ships exactly what it needs: its files exist, every registry file belongs to an item, and its
// dependencies / registryDependencies are what its files import (no more, no less).
describe("registry items", () => {
  const items = registry.items as { name: string; type: string; description?: string; files: { path: string }[]; dependencies?: string[]; registryDependencies?: string[] }[]
  const norm = (d: string) => d.replace(/^https?:.*\/r\/([\w-]+)\.json$/, "$1")
  const imports = (src: string, re: RegExp) => [...src.matchAll(re)].map((m) => m[1]!)

  it("has a description and files that exist", () => {
    for (const item of items) {
      expect(item.description?.length ?? 0, item.name).toBeGreaterThan(20)
      for (const f of item.files) expect(fs.existsSync(path.join(root, f.path)), f.path).toBe(true)
    }
  })

  it("covers every registry source file", () => {
    const listed = new Set(items.flatMap((i) => i.files.map((f) => f.path)))
    for (const dir of ["ui", "hooks", "lib"])
      for (const f of fs.readdirSync(path.join(root, "registry/nuikit", dir))) expect(listed.has(`registry/nuikit/${dir}/${f}`), `${dir}/${f}`).toBe(true)
  })

  it("declares what its files import", () => {
    for (const item of items) {
      const own = new Set(item.files.map((f) => path.basename(f.path).replace(/\.tsx?$/, "")))
      const src = item.files.map((f) => fs.readFileSync(path.join(root, f.path), "utf8")).join("\n")
      const reg = new Set([...imports(src, /from\s+["']@\/components\/ui\/([\w-]+)["']/g), ...imports(src, /from\s+["']@\/hooks\/([\w-]+)["']/g)].filter((x) => !own.has(x)))
      const pkg = new Set(imports(src, /from\s+["']((?:@[\w.-]+\/)?[\w.-]+)(?:\/[^"']*)?["']/g).filter((p) => p !== "react" && !p.startsWith("@/") && !p.startsWith(".")))
      expect([...(item.registryDependencies ?? []).map(norm)].sort(), `${item.name} registryDependencies`).toEqual([...reg].sort())
      expect([...(item.dependencies ?? [])].sort(), `${item.name} dependencies`).toEqual([...pkg].sort())
    }
  })
})

// A11: the curated catalogue. Every item is classified, grouped by purpose and (optionally) hidden from the
// site; the site lists at most 21 components, foundations first, each with its variants, levers and hooks.
describe("curated catalogue", () => {
  const GROUPS = ["Foundations", "Lists & selection", "Gauges & vitals", "Dialogs & sheets", "Notices & prompts", "Inputs", "HUD", "Layout", "Blocks"]
  type Curated = Meta & { group?: string; tier?: string; hidden?: boolean; hiddenReason?: string; variants?: { axes: Record<string, string[]>; levers: string[]; hooks: string[] } }
  const m = (i: { meta?: Meta }) => i.meta as Curated
  const UI = registry.items.filter((i) => i.type === "registry:ui")
  const listed = UI.filter((i) => !m(i).hidden)

  it("every item has a group; every ui and hook item has a tier", () => {
    for (const i of registry.items) {
      expect(GROUPS, `${i.name} group`).toContain(m(i).group)
      if (i.type !== "registry:block" && i.type !== "registry:lib") expect(["foundation", "composite", "alias"], `${i.name} tier`).toContain(m(i).tier)
    }
  })

  it("deprecated items are aliases and hidden; aliases are deprecated", () => {
    for (const i of registry.items) {
      expect(m(i).tier === "alias", i.name).toBe(i.meta!.status === "deprecated")
      if (m(i).tier === "alias") expect(m(i).hidden, i.name).toBe(true)
    }
  })

  it("a hidden item says why (unless it is a deprecated alias)", () => {
    for (const i of registry.items.filter((x) => m(x).hidden && m(x).tier !== "alias")) expect(m(i).hiddenReason?.length ?? 0, i.name).toBeGreaterThan(15)
  })

  it("the site lists at most 21 components, foundations first, and every listed item shows its variants", () => {
    expect(listed.length).toBeLessThanOrEqual(21)
    expect(listed.filter((i) => m(i).tier === "foundation").length).toBeGreaterThan(0)
    for (const i of listed) {
      expect(m(i).tier, i.name).not.toBe("alias")
      const v = m(i).variants
      expect(v, `${i.name} variants`).toBeDefined()
      expect(Array.isArray(v!.levers) && Array.isArray(v!.hooks), i.name).toBe(true)
      for (const [axis, vals] of Object.entries(v!.axes)) expect(vals.length, `${i.name}.${axis}`).toBeGreaterThan(0)
    }
  })

  it("the hooks a card names are real", () => {
    const REAL = ["useLinearRun", "useSelectionIndicator", "TextRoll", "NumberRoll", "useCollapse", "useStaggerGroup"]
    for (const i of UI) for (const h of m(i).variants?.hooks ?? []) expect(REAL, `${i.name} ${h}`).toContain(h)
  })
})
