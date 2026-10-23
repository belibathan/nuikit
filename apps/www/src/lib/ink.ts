// The site wears Ink, nuikit's flagship (docs/design/ink.md): the same theme file a server copies over
// nuikit/theme.css, compiled and painted on <html> the way the nuikit resource paints it in game. The rules
// tokens can't say (systems/nuikit/theme/ink.css) are imported by index.css.
import { applyTheme } from "nuikit-core";
import { identities } from "@/themes";

export const ink = identities.find((t) => t.name === "Ink")!;

/** Paint Ink on the page (tokens, treatment attributes), once, before the first render. */
export function applySiteInk() {
  if (typeof document === "undefined") return;
  applyTheme(ink.css, document.documentElement, "dark");
}
