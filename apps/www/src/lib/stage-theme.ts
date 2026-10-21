// Paints a compiled theme on a game stage (a subtree), the way a nuikit UI paints it on <html>.
//
// applyTheme(theme, element) sets the tokens and the identity keyword attributes (data-nk-row,
// data-nk-feel, data-nk-motion…) on the element. kit.css selects some of those on `html` (the
// `fill` row indicator, the stepped feel, reduced motion), so a stage alone wouldn't show them.
// The site shows one theme per page, so the keyword attributes are mirrored onto <html> too; the
// tokens stay on the stage, and the page around it keeps the site's own colours.
import { applyTheme, clearTheme, type CompiledTheme } from "nuikit-core";

// what applyTheme paints as attributes (packages/core/src/theme.ts KEYWORD_ATTRS, not exported yet)
const ATTRS = ["data-nk-row", "data-nk-gauge", "data-nk-elevation", "data-nk-label-case", "data-nk-feel", "data-nk-motion"];

export function applyStageTheme(theme: CompiledTheme, stage: HTMLElement) {
  applyTheme(theme, stage, "dark");
  const html = document.documentElement;
  for (const attr of ATTRS) {
    const v = stage.getAttribute(attr);
    if (v) html.setAttribute(attr, v);
    else html.removeAttribute(attr);
  }
}

export function clearStageTheme(stage: HTMLElement) {
  clearTheme(undefined, stage);
  for (const attr of ATTRS) document.documentElement.removeAttribute(attr);
}
