// Paints a compiled theme on a game stage (a subtree), the way a nuikit UI paints it on <html>.
//
// applyTheme(theme, element) sets the tokens and the identity keyword attributes (data-nk-row,
// data-nk-feel, data-nk-motion…) on the element; kit.css reads them from any ancestor, so a stage
// shows its own identity (the `fill` row indicator, the stepped feel, reduced motion) and the page
// around it keeps the site's own colours and motion.
import { applyTheme, clearTheme, type CompiledTheme } from "nuikit-core";

export function applyStageTheme(theme: CompiledTheme, stage: HTMLElement) {
  applyTheme(theme, stage, "dark");
}

export function clearStageTheme(stage: HTMLElement) {
  clearTheme(undefined, stage);
}
