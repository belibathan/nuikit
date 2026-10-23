// synced by pnpm sync: don't edit here. Change registry/nuikit/ui/text.tsx, then run pnpm sync.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Text — the type roles as one component (docs/design/components.md, foundation): scan (a key legend), title,
 * label, num (tabular figures in the numeric face), body, caption and display. Each role is a kit class
 * (`nk-scan`, `nk-title`…) read from the theme's --nk-type-<role>-* levers, so a theme restyles every role at
 * once. `size` is the value ladder numbers sit on: sm (the body size), md (the HUD value size) and display (the
 * number is the point). Stat's value and Money are Text in the num role.
 *
 *   <Text variant="title">Garage</Text>
 *   <Text variant="num" size="md">$48,210</Text>
 *   <Text as="p" variant="caption">Until you can respawn</Text>
 *
 * Role: Every piece of text in one of the kit's type roles, on one value ladder.
 * Anatomy: text (one element: span, p, div, h2…)
 * Props: variant (the role), size, as.
 * Rules: Pick a role (variant), never a font size: the role's levers (--nk-type-<role>-family, -weight, -tracking, -case)
 *   come from the theme. size is for values only (sm | md | display); inherit keeps the parent's size.
 */
const textVariants = cva("", {
  variants: {
    variant: {
      none: "",
      scan: "nk-scan",
      title: "nk-title",
      label: "nk-label",
      num: "nk-num",
      body: "nk-body",
      caption: "nk-caption",
      display: "nk-display",
    },
    size: {
      inherit: "",
      /** The body size, strong: a value in a row. */
      sm: "text-(length:--nk-text-base) leading-5 [font-weight:var(--nk-weight-strong,600)]",
      /** The HUD value size (18px+), strong: the default stat. */
      md: "text-(length:--nk-hud-value-size) leading-7 [font-weight:var(--nk-weight-strong,600)]",
      /** Display type in the numeric face: the number is the point (a balance, a clock). */
      display: "nk-display [font-family:var(--nk-num-font)]!",
    },
  },
  defaultVariants: {
    variant: "body",
    size: "inherit",
  },
})

type TextRole = NonNullable<VariantProps<typeof textVariants>["variant"]>
type TextSize = NonNullable<VariantProps<typeof textVariants>["size"]>

function Text({
  as: Comp = "span",
  variant,
  size,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    /** The element. Default span. */
    as?: React.ElementType
  }) {
  return <Comp data-slot="text" data-variant={variant ?? "body"} className={cn(textVariants({ variant, size }), className)} {...props} />
}

export { Text, textVariants, type TextRole, type TextSize }
