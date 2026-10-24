// Generated from packages/create-nuikit/kit.css by pnpm sync (scripts/kit-merge.mjs): don't edit.
// cn() that knows the nk-* kit. A kit utility removes the earlier stock classes that set what it paints
// (colour and type), never layout or shape; one type style, surface or anchor per element.
import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

type KitClassGroup =
  | "nk-panel"
  | "nk-panel-header"
  | "nk-panel-body"
  | "nk-panel-footer"
  | "nk-panel-header-stack"
  | "nk-panel-title-row"
  | "nk-field"
  | "nk-field-label"
  | "nk-title"
  | "nk-label"
  | "nk-scan"
  | "nk-body"
  | "nk-caption"
  | "nk-row"
  | "nk-list"
  | "nk-num"
  | "nk-chip"
  | "nk-chip-active"
  | "nk-hud"
  | "nk-track"
  | "nk-shadow"
  | "nk-on-game"
  | "nk-display"
  | "nk-slab"
  | "nk-slab-tile"
  | "nk-slab-delta"
  | "nk-slab-key"
  | "nk-slab-stack"
  | "nk-slab-stack-row"
  | "nk-slab-line"
  | "nk-slab-band"
  | "nk-slab-band-title"
  | "nk-scroll"
  | "nk-edge"
  | "nk-anchor-tl"
  | "nk-anchor-tr"
  | "nk-anchor-bl"
  | "nk-anchor-br"
  | "nk-anchor-t"
  | "nk-anchor-b"
  | "nk-anchor-l"
  | "nk-anchor-r"
  | "nk-first-row"
  | "nk-enter"
  | "nk-pop"
  | "nk-rise"
  | "nk-stagger"
  | "nk-press"
  | "nk-skeleton"
  | "nk-blink"
  | "nk-indicator"

const twMerge = extendTailwindMerge<KitClassGroup>({
  extend: {
    classGroups: {
      "nk-panel": ["nk-panel"],
      "nk-panel-header": ["nk-panel-header"],
      "nk-panel-body": ["nk-panel-body"],
      "nk-panel-footer": ["nk-panel-footer"],
      "nk-panel-header-stack": ["nk-panel-header-stack"],
      "nk-panel-title-row": ["nk-panel-title-row"],
      "nk-field": ["nk-field"],
      "nk-field-label": ["nk-field-label"],
      "nk-title": ["nk-title"],
      "nk-label": ["nk-label"],
      "nk-scan": ["nk-scan"],
      "nk-body": ["nk-body"],
      "nk-caption": ["nk-caption"],
      "nk-row": ["nk-row"],
      "nk-list": ["nk-list"],
      "nk-num": ["nk-num"],
      "nk-chip": ["nk-chip"],
      "nk-chip-active": ["nk-chip-active"],
      "nk-hud": ["nk-hud"],
      "nk-track": ["nk-track"],
      "nk-shadow": ["nk-shadow"],
      "nk-on-game": ["nk-on-game"],
      "nk-display": ["nk-display"],
      "nk-slab": ["nk-slab"],
      "nk-slab-tile": ["nk-slab-tile"],
      "nk-slab-delta": ["nk-slab-delta"],
      "nk-slab-key": ["nk-slab-key"],
      "nk-slab-stack": ["nk-slab-stack"],
      "nk-slab-stack-row": ["nk-slab-stack-row"],
      "nk-slab-line": ["nk-slab-line"],
      "nk-slab-band": ["nk-slab-band"],
      "nk-slab-band-title": ["nk-slab-band-title"],
      "nk-scroll": ["nk-scroll"],
      "nk-edge": ["nk-edge"],
      "nk-anchor-tl": ["nk-anchor-tl"],
      "nk-anchor-tr": ["nk-anchor-tr"],
      "nk-anchor-bl": ["nk-anchor-bl"],
      "nk-anchor-br": ["nk-anchor-br"],
      "nk-anchor-t": ["nk-anchor-t"],
      "nk-anchor-b": ["nk-anchor-b"],
      "nk-anchor-l": ["nk-anchor-l"],
      "nk-anchor-r": ["nk-anchor-r"],
      "nk-first-row": ["nk-first-row"],
      "nk-enter": ["nk-enter"],
      "nk-pop": ["nk-pop"],
      "nk-rise": ["nk-rise"],
      "nk-stagger": ["nk-stagger"],
      "nk-press": ["nk-press"],
      "nk-skeleton": ["nk-skeleton"],
      "nk-blink": ["nk-blink"],
      "nk-indicator": ["nk-indicator"],
    },
    conflictingClassGroups: {
      "nk-panel": ["bg-color", "nk-chip", "nk-hud", "nk-slab", "text-color"],
      "nk-panel-header": ["nk-panel-header-stack"],
      "nk-panel-header-stack": ["nk-panel-header"],
      "nk-field-label": ["font-family", "font-size", "font-weight", "leading", "text-transform", "tracking"],
      "nk-title": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-body", "nk-caption", "nk-display", "nk-label", "nk-scan", "text-transform", "tracking"],
      "nk-label": ["font-family", "font-size", "font-weight", "leading", "nk-body", "nk-caption", "nk-display", "nk-scan", "nk-title", "text-color"],
      "nk-scan": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-body", "nk-caption", "nk-display", "nk-label", "nk-title", "text-transform", "tracking"],
      "nk-body": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-caption", "nk-display", "nk-label", "nk-scan", "nk-title", "text-transform", "tracking"],
      "nk-caption": ["font-family", "font-size", "font-weight", "leading", "nk-body", "nk-display", "nk-label", "nk-scan", "nk-title", "text-color", "text-transform", "tracking"],
      "nk-row": ["font-size", "leading"],
      "nk-num": ["font-family", "font-style", "fvn-figure", "fvn-fraction", "fvn-normal", "fvn-ordinal", "fvn-slashed-zero", "fvn-spacing", "tracking"],
      "nk-chip": ["bg-color", "font-size", "font-weight", "leading", "nk-hud", "nk-panel", "nk-slab", "text-color"],
      "nk-chip-active": ["bg-color", "text-color"],
      "nk-hud": ["bg-color", "nk-chip", "nk-panel", "nk-slab", "text-color"],
      "nk-track": ["bg-color"],
      "nk-on-game": ["text-color"],
      "nk-display": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-body", "nk-caption", "nk-label", "nk-scan", "nk-title", "text-transform", "tracking"],
      "nk-slab": ["bg-color", "font-size", "font-weight", "leading", "nk-chip", "nk-hud", "nk-panel", "text-color"],
      "nk-slab-tile": ["bg-color", "text-color"],
      "nk-slab-delta": ["font-family", "fvn-figure", "fvn-fraction", "fvn-normal", "fvn-ordinal", "fvn-slashed-zero", "fvn-spacing", "text-color", "tracking"],
      "nk-slab-key": ["bg-color", "font-family", "font-size", "font-weight", "leading", "text-color"],
      "nk-slab-stack": ["text-color"],
      "nk-slab-stack-row": ["font-size", "font-weight", "leading"],
      "nk-slab-line": ["bg-color"],
      "nk-slab-band": ["bg-color", "text-color"],
      "nk-slab-band-title": ["font-family", "font-size", "font-weight", "leading", "text-transform", "tracking"],
      "nk-anchor-tl": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-br", "nk-anchor-l", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tr"],
      "nk-anchor-tr": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-br", "nk-anchor-l", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tl"],
      "nk-anchor-bl": ["nk-anchor-b", "nk-anchor-br", "nk-anchor-l", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-anchor-br": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-l", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-anchor-t": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-br", "nk-anchor-l", "nk-anchor-r", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-anchor-b": ["nk-anchor-bl", "nk-anchor-br", "nk-anchor-l", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-anchor-l": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-br", "nk-anchor-r", "nk-anchor-t", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-anchor-r": ["nk-anchor-b", "nk-anchor-bl", "nk-anchor-br", "nk-anchor-l", "nk-anchor-t", "nk-anchor-tl", "nk-anchor-tr"],
      "nk-skeleton": ["bg-color", "text-color"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The knobs every kit component takes for itself and what's inside it (kit.css "Variants"): density,
 * shape, and motion (false: still, "reduced": fades only). "default" or undefined: the theme's.
 */
export type NkVariantProps = {
  density?: "compact" | "default" | "comfortable"
  shape?: "square" | "default" | "round"
  motion?: boolean | "reduced"
}

/** NkVariantProps as the attributes kit.css and nuikit-core/motion read: spread them on the root. */
export function nkVariant({ density, shape, motion }: NkVariantProps) {
  return {
    "data-nk-density": density === "default" ? undefined : density,
    "data-nk-shape": shape === "default" ? undefined : shape,
    "data-nk-motion": motion === false ? "off" : motion === "reduced" ? "reduced" : undefined,
  }
}

/**
 * Foundation 2 states: every interactive kit component draws one of these on data-state (kit.css
 * "States" styles them; a theme restyles them). Most telling first: disabled, confirm, hold, alert,
 * focus (the highlight the UI or Lua drives, or keyboard focus), rest.
 */
export type NkState = "rest" | "focus" | "hold" | "confirm" | "disabled" | "alert"

export function nkState(s: { disabled?: boolean; confirm?: boolean; hold?: boolean; alert?: boolean; focus?: boolean }): NkState {
  return s.disabled ? "disabled" : s.confirm ? "confirm" : s.hold ? "hold" : s.alert ? "alert" : s.focus ? "focus" : "rest"
}

/**
 * The confirm pop on an element: data-state="confirm" for --nk-time-slow (160ms), then back to what
 * it was, unless something changed it meanwhile. Set on the DOM, so the component doesn't re-render.
 */
export function nkConfirm(el: Element | null | undefined) {
  if (!el || typeof window === "undefined") return
  const before = el.getAttribute("data-state")
  const ms = parseFloat(getComputedStyle(el).getPropertyValue("--nk-time-slow")) || 160
  el.setAttribute("data-state", "confirm")
  window.setTimeout(() => {
    if (el.getAttribute("data-state") !== "confirm") return
    if (before === null) el.removeAttribute("data-state")
    else el.setAttribute("data-state", before)
  }, ms)
}

/**
 * The level contract: --level (0–1) on a component's root, set from its data (a meter's value, a
 * vital, a hold, the time left). Level styles (bar, ring, liquid, slab, pips) draw from it; each
 * component documents what its level means.
 */
export function nkLevel(level: number | undefined): Record<string, string> {
  const n = Number.isFinite(level) ? Math.min(1, Math.max(0, level as number)) : 0
  return { "--level": n.toFixed(3) }
}
