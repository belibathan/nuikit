import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Registry metadata and the deprecation policy (docs/design/contract.md, "Registry metadata").
const root = path.resolve(__dirname, "../../..")
type Spec = { role: string; anatomy: string[]; props?: string[]; level?: string; rules: string[] }
type Meta = { since: string; status: string; replaces: string[]; removeIn: string | null; replacedBy?: string[]; spec?: Spec }
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")) as {
  items: { name: string; type: string; description?: string; files: { path: string }[]; meta?: Meta }[]
}
const names = new Set(registry.items.map((i) => i.name))
// removed after their deprecation; `replaces` still names them (history)
const REMOVED = ["key-hint", "task-progress", "nui-toaster"]
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
// and the same template in each component's doc comment (docs/design/ink.md §3).
describe("component specs", () => {
  const UI = registry.items.filter((i) => i.type === "registry:ui")
  const LEVEL = ["meter", "vital-chip", "progress-ring", "notice", "key-prompt", "dial", "countdown", "speedometer", "vital"]
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
