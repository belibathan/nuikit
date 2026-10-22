import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// Registry metadata and the deprecation policy (docs/design/contract.md, "Registry metadata").
const root = path.resolve(__dirname, "../../..")
type Spec = { role: string; anatomy: string[]; props?: string[]; level?: string; rules: string[] }
type Meta = { since: string; status: string; replaces: string[]; removeIn: string | null; replacedBy?: string[]; spec?: Spec }
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")) as {
  items: { name: string; description?: string; files: { path: string }[]; meta?: Meta }[]
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

// Foundation 2: the component spec template (role, anatomy, props, level means, rules) in registry meta.
describe("component specs", () => {
  const SPECCED = ["panel", "menu-row", "meter", "vital-chip", "progress-ring", "notice", "key-prompt", "item-slot", "radial-menu", "hud-chip", "band", "confirm", "edge-sheet"]
  const LEVEL = ["meter", "vital-chip", "progress-ring", "notice", "key-prompt"]
  const meta = (n: string) => registry.items.find((i) => i.name === n)?.meta

  it("every specced component says its role, anatomy and rules", () => {
    for (const n of SPECCED) {
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
})
