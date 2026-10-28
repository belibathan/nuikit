import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/glyph"

/**
 * Text — the type roles as one component (docs/design.md, foundation): scan (a key legend), title,
 * label, num (tabular figures in the numeric face), body, caption and display. Each role is a kit class
 * (`nk-scan`, `nk-title`…) read from the theme's --nk-type-<role>-* levers, so a theme restyles every role at
 * once. `size` is the value ladder numbers sit on: sm (the body size), md (the HUD value size) and display (the
 * number is the point). Stat's value and Money are Text in the num role.
 *
 *   <Text variant="title">Garage</Text>
 *   <Text variant="num" size="md">$48,210</Text>
 *   <Text as="p" variant="caption">Until you can respawn</Text>
 *
 * Key tokens: any string child may carry `[E]`, `[LEFT MOUSE]`, `[SHIFT + E]` tokens (`[A-Z0-9 +-]{1,12}` in square
 * brackets, at least one letter or digit); they render as the kit's keycap inline. `keys={false}` keeps the brackets
 * literally. The lever `--nk-text-key-scale` (default 1) sizes the inline keycap. Plain React nodes, never HTML.
 *
 * Role: Every piece of text in one of the kit's type roles, on one value ladder.
 * Anatomy: text (one element: span, p, div, h2…)
 * Props: variant (the role), size, as, keys (inline key tokens, default true).
 * Rules: Pick a role (variant), never a font size: the role's levers (--nk-type-<role>-family, -weight, -tracking, -case)
 *   come from the theme. size is for values only (sm | md | display); inherit keeps the parent's size.
 */
const textVariants = cva("", {
  variants: {
    variant: {
      none: "",
      scan: "nk-text-scan",
      title: "nk-text-title",
      label: "nk-text-label",
      num: "nk-text-num",
      body: "nk-text-body",
      caption: "nk-text-caption",
      display: "nk-text-display",
    },
    size: {
      inherit: "",
      /** The body size, strong: a value in a row. */
      sm: "text-(length:--nk-text-base) leading-5 [font-weight:var(--nk-type-weight-strong)]",
      /** The HUD value size (18px+), strong: the default stat. */
      md: "text-(length:--nk-text-hud) leading-7 [font-weight:var(--nk-type-weight-strong)]",
      /** The figure style: the number is the point (a balance, a clock). */
      display: "nk-text-figure",
    },
  },
  defaultVariants: {
    variant: "body",
    size: "inherit",
  },
})

type TextRole = NonNullable<VariantProps<typeof textVariants>["variant"]>
type TextSize = NonNullable<VariantProps<typeof textVariants>["size"]>

type KeyPart = { key: boolean; text: string }

const KEY_TOKEN = /\[([A-Z0-9 +-]{1,12})\]/g

/** Splits a string into plain runs and `[KEY]` tokens. A token needs a letter or digit (`[ ]`, `[-]` stay text). */
function parseKeyTokens(input: string): KeyPart[] {
  const out: KeyPart[] = []
  let last = 0
  for (const m of input.matchAll(KEY_TOKEN)) {
    const label = m[1].trim()
    if (!/[A-Z0-9]/.test(label)) continue
    const at = m.index ?? 0
    if (at > last) out.push({ key: false, text: input.slice(last, at) })
    out.push({ key: true, text: label })
    last = at + m[0].length
  }
  if (last < input.length) out.push({ key: false, text: input.slice(last) })
  return out
}

/** The inline keycap: the kit's Kbd, sized by --nk-text-key-scale. */
function InlineKey({ children }: { children: string }) {
  return (
    <Kbd
      data-inline-key=""
      className="mx-0.5 h-[calc(var(--nk-height-key)*var(--nk-text-key-scale))] min-w-[calc(var(--nk-height-key)*var(--nk-text-key-scale))] align-middle text-[length:calc(var(--nk-text-key)*var(--nk-text-key-scale))]"
    >
      {children}
    </Kbd>
  )
}

/** Renders a node with key tokens in its string parts; other nodes pass through untouched. */
function withKeys(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") {
    if (!node.includes("[")) return node
    const parts = parseKeyTokens(node)
    if (!parts.some((p) => p.key)) return node
    return parts.map((p, i) => (p.key ? <InlineKey key={i}>{p.text}</InlineKey> : <React.Fragment key={i}>{p.text}</React.Fragment>))
  }
  if (Array.isArray(node)) return node.map((n, i) => (typeof n === "string" ? <React.Fragment key={i}>{withKeys(n)}</React.Fragment> : n))
  return node
}

function Text({
  as: Comp = "span",
  variant,
  size,
  className,
  keys = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    /** The element. Default span. */
    as?: React.ElementType
    /** Render `[E]`-style tokens in string children as keycaps. Default true; false keeps the brackets. */
    keys?: boolean
  }) {
  return (
    <Comp data-slot="text" data-variant={variant ?? "body"} className={cn(textVariants({ variant, size }), className)} {...props}>
      {keys ? withKeys(children) : children}
    </Comp>
  )
}

export { Text, textVariants, parseKeyTokens, withKeys, type TextRole, type TextSize, type KeyPart }
