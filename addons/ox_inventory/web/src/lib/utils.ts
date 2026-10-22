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
  | "nk-caption"
  | "nk-row"
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
      "nk-caption": ["nk-caption"],
      "nk-row": ["nk-row"],
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
      "nk-title": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-caption", "nk-display", "nk-label", "text-transform", "tracking"],
      "nk-label": ["font-family", "font-size", "font-weight", "leading", "nk-caption", "nk-display", "nk-title", "text-color"],
      "nk-caption": ["font-family", "font-size", "font-weight", "leading", "nk-display", "nk-label", "nk-title", "text-color", "text-transform", "tracking"],
      "nk-row": ["font-size", "leading"],
      "nk-num": ["font-family", "font-style", "fvn-figure", "fvn-fraction", "fvn-normal", "fvn-ordinal", "fvn-slashed-zero", "fvn-spacing", "tracking"],
      "nk-chip": ["bg-color", "font-size", "font-weight", "leading", "nk-hud", "nk-panel", "nk-slab", "text-color"],
      "nk-chip-active": ["bg-color", "text-color"],
      "nk-hud": ["bg-color", "nk-chip", "nk-panel", "nk-slab", "text-color"],
      "nk-track": ["bg-color"],
      "nk-on-game": ["text-color"],
      "nk-display": ["font-family", "font-size", "font-style", "font-weight", "leading", "nk-caption", "nk-label", "nk-title", "text-transform", "tracking"],
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
      "nk-indicator": ["bg-color"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
