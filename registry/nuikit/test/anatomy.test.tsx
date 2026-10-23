// @vitest-environment jsdom
import * as React from "react"
import fs from "node:fs"
import path from "node:path"
// @ts-ignore www's tsconfig maps react-dom/server only; the client entry resolves at runtime
import { createRoot } from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { applyTheme, clearTheme } from "nuikit-core"

// Invariant 1 (docs/design/baseline.md): themes set values, never anatomy. Every registry ui component renders the
// same tree of data-slot / data-part names under every treatment and every shipped theme. A component whose structure
// depends on the treatment is the bug (VitalChip dropped its label, plate and fill under Flat).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const root = path.resolve(__dirname, "../../..")
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8")) as { items: { name: string; type: string; files: { path: string }[] }[] }
const uiItems = registry.items.filter((i) => i.type === "registry:ui")

const modules = import.meta.glob("../ui/*.tsx", { eager: true }) as Record<string, Record<string, any>>
const mod = (file: string) => modules[`../ui/${file}.tsx`]!
// jsdom has no ResizeObserver; the chip measures with one
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
const noop = () => {}
const rows = [{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]
const J = React.createElement

/** One minimal element per registry item (name → file basename → element). A new ui item must add a row here. */
const CASES: Record<string, () => React.ReactElement> = {
  panel: () => { const m = mod("panel"); return <m.Panel><m.PanelHeader><m.PanelTitle>T</m.PanelTitle><m.PanelDescription>D</m.PanelDescription></m.PanelHeader><m.PanelBody>b</m.PanelBody><m.PanelFooter>f</m.PanelFooter></m.Panel> },
  "edge-sheet": () => { const m = mod("edge-sheet"); return <m.EdgeSheet open title="T"><m.EdgeSheetBody>b</m.EdgeSheetBody><m.EdgeSheetFooter>f</m.EdgeSheetFooter></m.EdgeSheet> },
  "nui-image": () => { const m = mod("nui-image"); return <m.NuiImage src="a.png" alt="" /> },
  "menu-row": () => { const m = mod("menu-row"); return <m.MenuRowList active={0}><m.MenuRow icon="i" description="d" meta="m">Row</m.MenuRow><m.MenuRow>Two</m.MenuRow></m.MenuRowList> },
  "selection-tile": () => { const m = mod("selection-tile"); return <m.SelectionTile items="[data-slot=x]" /> },
  "selection-tabs": () => { const m = mod("selection-tabs"); return <m.Tabs defaultValue="a"><m.TabsList><m.TabsTrigger value="a">A</m.TabsTrigger><m.TabsTrigger value="b">B</m.TabsTrigger></m.TabsList><m.TabsContent value="a">a</m.TabsContent></m.Tabs> },
  stat: () => { const m = mod("stat"); return <m.Stat label="L" value="1" meta="m" delta={2} /> },
  meter: () => { const m = mod("meter"); return <m.Meter value={40} /> },
  "hud-chip": () => { const m = mod("hud-chip"); return <m.HudChip>x</m.HudChip> },
  "text-roll": () => { const m = mod("text-roll"); return <m.TextRoll value="abc" /> },
  "smooth-input": () => { const m = mod("smooth-input"); return <m.SmoothInput defaultValue="a" /> },
  vital: () => { const m = mod("vital"); return <m.Vital value={50} label="Health" icon="i" /> },
  "collapse-stack": () => { const m = mod("collapse-stack"); return <m.CollapseStack items={[{ key: "a", value: 50 }, { key: "b", value: 20 }]} renderItem={(i: { key: string }) => <span>{i.key}</span>} /> },
  "vital-chip": () => { const m = mod("vital-chip").VitalChip; return <m.Root value={40} tone="health" open><m.Shape><m.Icon>i</m.Icon><m.Level /></m.Shape><m.Label>Hunger</m.Label></m.Root> },
  "nui-menu": () => { const m = mod("nui-menu"); return <m.NuiMenu title="T" items={rows} onSelect={noop} /> },
  "radial-menu": () => { const m = mod("radial-menu"); return <m.RadialMenu items={[{ id: "a", label: "A" }, { id: "b", label: "B" }, { id: "c", label: "C" }]} onSelect={noop} /> },
  speedometer: () => { const m = mod("speedometer"); return <m.Speedometer speed={50} rpm={0.4} gear="3" fuel={0.5} /> },
  notice: () => { const m = mod("notice"); return <m.Notice title="T" description="D" /> },
  "form-field": () => { const m = mod("form-field"); return <m.TextField label="L" hint="h" defaultValue="a" /> },
  confirm: () => { const m = mod("confirm"); return <m.ConfirmPanel title="T" description="D" /> },
  "key-prompt": () => { const m = mod("key-prompt"); return <m.KeyPrompt keys="E" label="Open" description="d" /> },
  "progress-ring": () => { const m = mod("progress-ring"); return <m.ProgressRing value={40} /> },
  countdown: () => { const m = mod("countdown"); return <m.Countdown seconds={30} total={60} label="L" /> },
  band: () => { const m = mod("band"); return <m.Band title="T" subtitle="S" /> },
  money: () => { const m = mod("money"); return <m.Money value={1200} /> },
  "item-slot": () => { const m = mod("item-slot"); return <m.ItemSlot label="Bandage" count={3} hotkey="1" durability={50} /> },
  "player-card": () => { const m = mod("player-card"); return <m.PlayerCard name="Ada Lovelace" job="EMS" stats={[{ label: "Cash", value: "1" }]} /> },
  fill: () => { const m = mod("fill"); return <m.Fill level={0.4} /> },
  tile: () => { const m = mod("tile"); return <m.Tile>E</m.Tile> },
  chip: () => { const m = mod("chip"); return <m.Chip>x</m.Chip> },
  "icon-text": () => { const m = mod("icon-text"); return <m.IconText icon="i">t</m.IconText> },
  text: () => { const m = mod("text"); return <m.Text variant="label">t</m.Text> },
  stack: () => { const m = mod("stack"); return <m.Stack><m.Cluster>a</m.Cluster></m.Stack> },
  "action-bar": () => { const m = mod("action-bar"); return <m.ActionBar><m.ActionBarItem keys={["E"]} label="Use" /><m.ActionBarSep /><m.ActionBarItem keys={["Esc"]} label="Close" /></m.ActionBar> },
  "dialog-shell": () => { const m = mod("dialog-shell"); return <m.DialogShell open title="T" description="D">body</m.DialogShell> },
  "sheet-section": () => { const m = mod("sheet-section"); return <m.SheetSection label="L" meta="m">c</m.SheetSection> },
  dial: () => { const m = mod("dial"); return <m.Dial level={0.5} /> },
  "empty-state": () => { const m = mod("empty-state"); return <m.EmptyState title="T" description="D" /> },
  "skill-check": () => { const m = mod("skill-check"); return <m.SkillCheck zoneStart={40} zoneSize={30} angle={10} /> },
  stepper: () => { const m = mod("stepper"); return <m.Stepper defaultValue={1} min={0} max={3} /> },
}

/** The anatomy: data-slot / data-part names in document order (React-rendered DOM, portals included). */
function anatomy(): string[] {
  const out: string[] = []
  for (const el of document.body.querySelectorAll("[data-slot],[data-part]")) {
    const s = el.getAttribute("data-slot")
    const p = el.getAttribute("data-part")
    if (s) out.push(s)
    if (p) out.push(`part:${p}`)
  }
  return out
}

// shipped themes: every --nk-* / token value declared in themes/*.css, applied the way applyTheme paints a theme
const themeDir = path.join(root, "packages/core/themes")
const themeVars = (css: string) => {
  const vars: Record<string, string> = {}
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) if (!m[2]!.includes("var(")) vars[m[1]!] = m[2]!.trim()
  return vars
}
const themes = fs.readdirSync(themeDir).filter((f) => f.endsWith(".css")).map((f) => [f.replace(/\.css$/, ""), themeVars(fs.readFileSync(path.join(themeDir, f), "utf8"))] as const)
const TREATMENTS = ["soft", "glass", "plate", "slab", "tile"]
const CONFIGS: [string, () => void][] = [
  ...TREATMENTS.map((t): [string, () => void] => [`treatment:${t}`, () => applyTheme({ "nk-treatment": t })]),
  ...themes.map(([n, v]): [string, () => void] => [`theme:${n}`, () => applyTheme(v)]),
]

/** Items that draw no data-slot of their own (plain layout classes): nothing to compare. */
const NO_SLOT = new Set<string>()
/** Items that read <html> through an observer store (a frame after a theme): wait for it. */
const STORE = new Set(["vital-chip"])
/** Existing violations (a ratchet): item → the configs whose anatomy differs from the baseline. Delete a row when fixed. */
const KNOWN: Record<string, string[]> = {
  // --nk-chip-shape picks the DOM (keycap wall/track/plate/tile/liquid vs a bare shape): a lever must change values, not parts
  "vital-chip": ["theme:default", "theme:flat", "theme:graphite", "theme:neon-pop", "theme:signal", "theme:square", "theme:street", "theme:studio", "theme:vector", "theme:velvet"],
}
const frames = () => act(async () => { await new Promise((r) => setTimeout(r, 10)) })

afterEach(() => clearTheme())

describe("anatomy: themes set values, never anatomy", () => {
  it("every registry ui item has a case", () => {
    expect(uiItems.map((i) => i.name).filter((n) => !CASES[n]), "add a minimal element to CASES").toEqual([])
    expect(Object.keys(CASES).filter((n) => !uiItems.some((i) => i.name === n)), "stale CASES row").toEqual([])
  })

  for (const item of uiItems) {
    it(item.name, async () => {
      const make = CASES[item.name]
      if (!make) return
      const seen = new Map<string, string[]>()
      for (const [label, set] of [["baseline", () => clearTheme()] as [string, () => void], ...CONFIGS]) {
        set()
        const host = document.createElement("div")
        document.body.appendChild(host)
        const r = createRoot(host)
        await act(async () => { r.render(make()) })
        if (STORE.has(item.name)) await frames()
        seen.set(label, anatomy())
        await act(async () => { r.unmount() })
        host.remove()
      }
      const base = seen.get("baseline")!
      if (!NO_SLOT.has(item.name)) expect(base.length, `${item.name} rendered no data-slot`).toBeGreaterThan(0)
      const differs = [...seen].filter(([, a]) => JSON.stringify(a) !== JSON.stringify(base)).map(([l]) => l)
      if (process.env.ANATOMY_REPORT && differs.length) console.log("DIFFERS", item.name, JSON.stringify(differs))
      const known = KNOWN[item.name] ?? []
      expect(differs.filter((l) => !known.includes(l)), `${item.name}: anatomy depends on the theme; a theme sets values, never anatomy (known debt: KNOWN)`).toEqual([])
      expect(known.filter((l) => !differs.includes(l)), `${item.name}: fixed under these; delete from KNOWN`).toEqual([])
    }, 120_000)
  }
})
