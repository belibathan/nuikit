// The identity fonts (docs/tokens.md#fonts) for the site's game stages: the same woff2 files
// nuikit-core ships, as @font-face rules written the way `pnpm sync` writes them into every UI.
// Injected once; a font that fails to load falls back down its stack, as in game.
import fontsJson from "../../../packages/core/fonts/fonts.json";

const files = import.meta.glob("../../../packages/core/fonts/*.woff2", { eager: true, query: "?url", import: "default" }) as Record<string, string>;

type Font = { family: string; file: string; weight: string; style?: string };

export function loadIdentityFonts() {
  if (typeof document === "undefined" || document.getElementById("nuikit-identity-fonts")) return;
  const rules = (fontsJson.fonts as Font[])
    .map((f) => {
      const url = files[`../../../packages/core/fonts/${f.file}`];
      if (!url) return "";
      return `@font-face{font-family:"${f.family}";font-style:${f.style ?? "normal"};font-weight:${f.weight};font-display:swap;src:url("${url}") format("woff2");unicode-range:${fontsJson.unicodeRange}}`;
    })
    .join("\n");
  const style = document.createElement("style");
  style.id = "nuikit-identity-fonts";
  style.textContent = rules;
  document.head.appendChild(style);
}
