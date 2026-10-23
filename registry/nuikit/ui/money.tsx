import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { getContext, useNuiContext } from "nuikit-core/react"

import { cn } from "@/lib/utils"

/**
 * Money — an amount of money, formatted the same way everywhere: tabular figures (nk-num), the
 * server's currency and locale (`nuikit:context`, from the `nuikit_currency` / `nuikit_locale`
 * convars; USD and en-US until it arrives) unless you pass your own (Intl), whole units by default
 * (game cash), an optional sign and direction colour for changes, and a compact form for tight
 * spots ("$1.2M").
 *
 *   <Money amount={48210} />                                  → $48,210 (48.210 € on a de-DE/EUR server)
 *   <Money amount={-250} sign="always" tone="direction" />    → −$250 in destructive
 *   <Money amount={1250000} compact />                        → $1.3M
 *   <Money amount={9.99} currency="EUR" locale="de-DE" fractionDigits={2} /> → 9,99 €
 *   <Money amount={120} currency={null} suffix=" chips" />    → 120 chips
 *
 * It's inline text: put it in a Stat's value, a menu-row's meta, a HUD chip. formatMoney() gives
 * the same string for places that need text.
 *
 * Role: Every amount formatted one way: the server currency and locale, tabular figures.
 * Anatomy: money (num role) > sign > amount
 * Props: amount, signDisplay, tone, size.
 * Rules: Whole units by default; compact only when asked. A direction tone for gains and losses, never
 *   decoration.
 */

const moneyVariants = cva("nk-num whitespace-nowrap", {
  variants: {
    size: {
      inherit: "",
      sm: "text-(length:--nk-text-base) leading-5 [font-weight:var(--nk-weight-strong,600)]",
      md: "text-(length:--nk-hud-value-size) leading-7 [font-weight:var(--nk-weight-strong,600)]",
      /** The money hero (a bank balance): display type in the numeric face. */
      display: "nk-display [font-family:var(--nk-num-font)]!",
    },
  },
  defaultVariants: {
    size: "inherit",
  },
})

type MoneySign = "auto" | "always" | "never"

type MoneyFormat = {
  /** ISO 4217 code ("USD", "EUR"); null for a plain number (chips, points, crypto with a suffix). Default: the server's. */
  currency?: string | null
  /** BCP 47 tag ("en-US", "de-DE"). Default: the server's. */
  locale?: string
  /** Decimals shown. Default 0 (game cash); compact uses up to 1. */
  fractionDigits?: number
  /** auto: only "−". always: "+" for gains too (changes, transactions). never: no sign. */
  sign?: MoneySign
  /** $1.2K, $3.4M. */
  compact?: boolean
  prefix?: string
  suffix?: string
}

/** The amount as text, by the same rules as <Money>. NaN or Infinity → 0. Currency and locale default to the server's (getContext()). */
function formatMoney(
  amount: number,
  { currency = getContext().currency, locale = getContext().locale, fractionDigits, sign = "auto", compact = false, prefix = "", suffix = "" }: MoneyFormat = {}
) {
  const value = Number.isFinite(amount) ? amount : 0
  const digits = fractionDigits ?? (compact ? undefined : 0)
  const options: Intl.NumberFormatOptions = {
    ...(currency ? { style: "currency", currency, currencyDisplay: "narrowSymbol" } : {}),
    ...(compact ? { notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: digits ?? 1 } : { minimumFractionDigits: digits, maximumFractionDigits: digits }),
    signDisplay: sign === "always" ? "exceptZero" : sign === "never" ? "never" : "auto",
  }
  let text: string
  try {
    text = new Intl.NumberFormat(locale, options).format(value)
  } catch {
    // An unknown currency or locale: fall back to a plain number rather than throw in a HUD.
    text = new Intl.NumberFormat("en-US", { ...options, style: "decimal", currency: undefined, currencyDisplay: undefined }).format(value)
  }
  return `${prefix}${text}${suffix}`
}

/**
 * formatMoney bound to the server's live context (useNuiContext): a component that formats text with
 * it re-renders when `nuikit:context` arrives or changes. Options passed to a call still win.
 *
 *   const fmt = useFormatMoney()
 *   <p>Cash on hand {fmt(cash)}</p>
 */
function useFormatMoney() {
  const { currency, locale } = useNuiContext()
  return React.useCallback((amount: number, options: MoneyFormat = {}) => formatMoney(amount, { currency, locale, ...options }), [currency, locale])
}

/** -1, 0 or 1: which way the amount goes (for the direction tone). */
function moneyDirection(amount: number): -1 | 0 | 1 {
  if (!Number.isFinite(amount) || amount === 0) return 0
  return amount > 0 ? 1 : -1
}

function Money({
  className,
  size,
  amount,
  currency,
  locale,
  fractionDigits,
  sign,
  compact,
  prefix,
  suffix,
  tone = "default",
  ...props
}: Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof moneyVariants> &
  MoneyFormat & {
    amount: number
    /** direction: gains in success, losses in destructive (transactions, a delta). */
    tone?: "default" | "direction" | "muted"
  }) {
  // The server's context, live: explicit props win.
  const ctx = useNuiContext()
  const dir = moneyDirection(amount)
  const fmt = { currency: currency === undefined ? ctx.currency : currency, locale: locale ?? ctx.locale, fractionDigits, sign, prefix, suffix }
  const text = formatMoney(amount, { ...fmt, compact })
  const full = compact ? formatMoney(amount, fmt) : undefined
  return (
    <span
      data-slot="money"
      data-direction={dir > 0 ? "up" : dir < 0 ? "down" : undefined}
      title={full}
      className={cn(
        moneyVariants({ size }),
        tone === "direction" && dir > 0 && "text-success",
        tone === "direction" && dir < 0 && "text-destructive",
        tone === "muted" && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {text}
    </span>
  )
}

export { Money, moneyVariants, formatMoney, useFormatMoney, moneyDirection, type MoneyFormat, type MoneySign }
