import * as React from "react"

import { cn } from "@/lib/utils"
import { textVariants } from "@/components/ui/text"

/**
 * IconText — an icon and a text on one centre line (docs/design.md §6): --nk-gap-cluster apart, the icon
 * at --nk-icon-md (sm / lg step it), the text in a role: label, num or body. One recipe for money, job, fuel,
 * ammo, notes and flag rows (today: nine icon sizes and eight gaps).
 *
 *   <IconText icon={<WalletIcon />} text="num">$12,400</IconText>
 *   <IconText icon={<BriefcaseIcon />} muted>Police · Sergeant</IconText>
 *
 * Role: Money, job, fuel, ammo, notes: an icon next to a value.
 * Anatomy: icon > text (a Text role: label, num or body)
 * Props: icon, text, size, muted.
 * Rules: One gap and one icon size per step. A muted icon is --muted-foreground, never an opacity.
 */
function IconText({
  className,
  icon,
  text = "body",
  size = "md",
  muted = false,
  children,
  ...props
}: React.ComponentProps<"span"> & {
  icon?: React.ReactNode
  /** The text's type role: label, num or body. */
  text?: "label" | "num" | "body"
  size?: "sm" | "md" | "lg"
  /** The icon in --muted-foreground (never an opacity). */
  muted?: boolean
}) {
  return (
    <span data-slot="icon-text" data-size={size === "md" ? undefined : size} data-muted={muted || undefined} className={cn(textVariants({ variant: text }), className)} {...props}>
      {icon && (
        <span data-slot="icon-text-icon" aria-hidden className="flex items-center">
          {icon}
        </span>
      )}
      <span data-slot="icon-text-text" className="min-w-0 truncate">
        {children}
      </span>
    </span>
  )
}

export { IconText }
