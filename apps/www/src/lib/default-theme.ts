// The site wears Default, nuikit's flagship (docs/design/default.md): the same theme file a server copies over
// nuikit/theme.css, compiled and painted on <html> the way the nuikit resource paints it in game. The rules
// tokens can't say (systems/nuikit/theme/default.css) are imported by index.css.
import { applyTheme } from "nuikit-core";
import { identities } from "@/themes";

export const defaultTheme = identities.find((t) => t.name === "Default")!;

/** Paint Default on the page (tokens, treatment attributes), once, before the first render. */
export function applySiteTheme() {
  if (typeof document === "undefined") return;
  applyTheme(defaultTheme.css, document.documentElement, "dark");
}
