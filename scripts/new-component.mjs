// Scaffold a registry component on the one contract (docs/design.md §6–7): the file with the spec header, a test, and
// its registry.json item (tier, group, spec, variants). Then write the component, add its case to the anatomy test,
// run `pnpm --filter www test`, add a demo to apps/www/src/pages/components.tsx and `pnpm registry:build`.
//
//   node scripts/new-component.mjs <name> "Title" --tier foundation|composite --group "Lists & selection" [--role "…"]
//
// Tiers are a rule the tests keep: a foundation composes stock shadcn and foundations; a composite composes foundations
// and composites; blocks (registry/nuikit/blocks) compose anything. Nothing in ui/ imports a block.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [name, title = "", ...rest] = process.argv.slice(2);
const flag = (f, d) => {
  const i = rest.indexOf(f);
  return i >= 0 ? rest[i + 1] : d;
};
const GROUPS = ["Foundations", "Lists & selection", "Gauges & vitals", "Dialogs & sheets", "Notices & prompts", "Inputs", "HUD", "Layout"];
const tier = flag("--tier", "composite");
const group = flag("--group", tier === "foundation" ? "Foundations" : "HUD");
const role = flag("--role", `${title}: one sentence on what it is for.`);
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || !title || !["foundation", "composite"].includes(tier) || !GROUPS.includes(group)) {
  console.error(`usage: new-component.mjs <kebab-name> "Title" --tier foundation|composite --group "${GROUPS.join(" | ")}"`);
  process.exit(1);
}
const pascal = name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const file = `registry/nuikit/ui/${name}.tsx`;
const test = `registry/nuikit/test/${name}.test.tsx`;
for (const f of [file, test]) if (fs.existsSync(path.join(root, f))) { console.error(`${f} exists`); process.exit(1); }

const tsx = `import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * ${pascal} — ${role}
 *
 *   <${pascal} size="md">…</${pascal}>
 *
 * Role: ${role}
 * Anatomy: ${name} > ${name}-label
 * Props: size, tone, className.
 * Rules: Colour from tokens only (data-tone, data-hue); sizes on the kit scale; every look a server might want
 *   different is a lever (--nk-${name}-*) with its default as the fallback; transform and opacity only.
 */

const ${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Variants = cva("flex items-center gap-(--nk-space-2)", {
  variants: {
    size: { sm: "text-(length:--nk-text-label)", md: "text-(length:--nk-text-body)" },
  },
  defaultVariants: { size: "md" },
})

type ${pascal}Props = React.ComponentProps<"div"> &
  VariantProps<typeof ${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Variants> & {
    /** neutral | info | success | warning | danger */
    tone?: "neutral" | "info" | "success" | "warning" | "danger"
    /** A role (health, police, legendary…). */
    hue?: string
  }

function ${pascal}({ className, size, tone, hue, children, ...props }: ${pascal}Props) {
  return (
    <div
      data-slot="${name}"
      data-tone={tone && tone !== "neutral" ? tone : undefined}
      data-hue={hue || undefined}
      className={cn(${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Variants({ size }), className)}
      {...props}
    >
      <span data-slot="${name}-label">{children}</span>
    </div>
  )
}

export { ${pascal}, ${name.replace(/-(\w)/g, (_, c) => c.toUpperCase())}Variants, type ${pascal}Props }
`;

const spec = `import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

import { ${pascal} } from "@/components/ui/${name}"

describe("${pascal}", () => {
  it("carries its anatomy and its tone", () => {
    const html = renderToStaticMarkup(<${pascal} tone="success">x</${pascal}>)
    expect(html).toContain('data-slot="${name}"')
    expect(html).toContain('data-slot="${name}-label"')
    expect(html).toContain('data-tone="success"')
  })
})
`;

fs.writeFileSync(path.join(root, file), tsx);
fs.writeFileSync(path.join(root, test), spec);

const regPath = path.join(root, "registry.json");
const reg = JSON.parse(fs.readFileSync(regPath, "utf8"));
reg.items.push({
  name,
  type: "registry:ui",
  title,
  description: `${role} (new: describe what it draws, its sizes and states in one sentence over 20 characters).`,
  files: [{ path: file, type: "registry:ui" }],
  dependencies: ["class-variance-authority"],
  meta: {
    since: "unreleased",
    status: "experimental",
    replaces: [],
    removeIn: null,
    spec: { role, anatomy: [name, `${name}-label`], props: ["size", "tone", "hue"], rules: ["Colour from tokens only: tone or hue, never a literal."] },
    group,
    tier,
    variants: { axes: { size: ["sm", "md"] }, levers: [], hooks: [] },
    hidden: true,
    hiddenReason: "scaffolded: listed on the site once its demo is on /components",
  },
});
fs.writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");
console.log(`✓ ${file}\n✓ ${test}\n✓ registry.json: ${name} (${tier}, ${group})\nnext: write it; a case in registry/nuikit/test/anatomy.test.tsx CASES; pnpm --filter www test; a demo on /components; then meta.hidden false and pnpm registry:build`);
