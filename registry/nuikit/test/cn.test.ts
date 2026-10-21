import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

const root = path.resolve(__dirname, "../../..")
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8")

// The kit-aware cn() (generated from kit.css by pnpm sync, scripts/kit-merge.mjs).
describe("cn knows the kit", () => {
  it("item-slot (86cf7cd): nk-chip-active removes the HUD's earlier text colour", () => {
    // the old hud variant, then the active state: white on white with plain twMerge
    expect(cn("nk-hud nk-shadow text-hud-foreground", "nk-chip-active")).toBe("nk-hud nk-shadow nk-chip-active")
    expect(cn("bg-muted/60 text-muted-foreground", "nk-chip-active")).toBe("nk-chip-active")
  })

  it("countdown (4f50a95): a later font size drops an earlier leading-*, so a size variant sets its own", () => {
    // the pair that broke: a base leading-none, then the hero size. cn keeps tailwind-merge's rule (turning
    // it off would change shadcn's CardTitle line heights everywhere), so the contract rule holds instead.
    expect(cn("leading-none", "text-[8rem]")).toBe("text-[8rem]")
    expect(cn("nk-num leading-none font-semibold tracking-tight", "text-[8rem]")).not.toContain("leading-none")
    // the self-contained size (text-* then leading-*) survives a merge, and so does the kit type modifier
    expect(cn("nk-num font-semibold tracking-tight", "text-[8rem] leading-none", "text-destructive opacity-40").split(" ")).toEqual(
      expect.arrayContaining(["nk-num", "text-[8rem]", "leading-none", "text-destructive"]),
    )
  })

  it("a kit type style removes earlier stock type classes, and another type style", () => {
    expect(cn("text-lg font-semibold leading-none", "nk-title")).toBe("nk-title")
    expect(cn("nk-title", "nk-label")).toBe("nk-label")
    expect(cn("text-foreground", "nk-caption")).toBe("nk-caption")
    // nk-num is a modifier, not a type style: it stays next to one
    expect(cn("nk-label", "nk-num")).toBe("nk-label nk-num")
    expect(cn("nk-display", "nk-num")).toBe("nk-display nk-num")
  })

  it("never removes layout, and a later stock class never removes a kit utility", () => {
    expect(cn("flex px-2 h-6", "nk-chip")).toBe("flex px-2 h-6 nk-chip")
    expect(cn("relative", "nk-anchor-tr")).toBe("relative nk-anchor-tr")
    expect(cn("nk-chip-active", "text-hud-foreground")).toBe("nk-chip-active text-hud-foreground")
    expect(cn("nk-panel", "rounded-none")).toBe("nk-panel rounded-none")
  })

  it("one surface and one anchor per element", () => {
    expect(cn("nk-hud", "nk-panel")).toBe("nk-panel")
    expect(cn("nk-anchor-tl", "nk-anchor-br")).toBe("nk-anchor-br")
    // the active state is not a surface: it sits on one
    expect(cn("nk-chip", "nk-chip-active")).toBe("nk-chip nk-chip-active")
  })

  it("keeps stock merging (shadcn's own className overrides)", () => {
    expect(cn("px-2 py-1 bg-primary", "p-3 bg-destructive")).toBe("p-3 bg-destructive")
    expect(cn("text-sm text-muted-foreground", "text-foreground")).toBe("text-sm text-foreground")
  })

  it("every UI's lib/utils.ts is the generated one (pnpm sync)", () => {
    const source = read("registry/nuikit/lib/utils.ts")
    expect(source).toMatch(/^\/\/ Generated from packages\/create-nuikit\/kit\.css/)
    for (const nk of read("packages/create-nuikit/kit.css").matchAll(/@utility (nk-[\w-]+)/g)) expect(source, nk[1]).toContain(`"${nk[1]}": ["${nk[1]}"]`)
    const copies = ["apps/www/src/lib/utils.ts", "packages/create-nuikit/template/web/src/lib/utils.ts"]
    for (const group of ["systems", "addons"])
      for (const d of fs.readdirSync(path.join(root, group))) {
        const f = `${group}/${d}/web/src/lib/utils.ts`
        if (fs.existsSync(path.join(root, f))) copies.push(f)
      }
    for (const f of copies) expect(read(f), f).toBe(source)
  })
})
