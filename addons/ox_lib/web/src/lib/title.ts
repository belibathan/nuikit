/**
 * Resource-supplied titles, normalised at the boundary (docs/next/handoff.md §5.7: third-party input is
 * hostile to design). Scripts write "🎽 | Clothing store" or "★ - VIP garage": the glyph is an icon, not a
 * word. `splitTitle` takes a leading emoji (or an icon-like symbol) and the separator after it ("|", "-",
 * "–", ":", "·", "•") out of the title, so the menu's icon slot draws the glyph and the title reads in the
 * label voice like every other row.
 *
 * On by default; `--ox-title-normalise: 0` on :root in nuikit/theme.css keeps titles as written.
 */

// an emoji with its modifiers (skin tone, VS16, ZWJ sequences, flags), or a symbol glyph (★ ● ■ ▶ ✔)
const GLYPH = "(?:\\p{Regional_Indicator}{2}|[\\p{Extended_Pictographic}\\p{So}](?:\\uFE0F|\\p{Emoji_Modifier}|\\u200D[\\p{Extended_Pictographic}\\p{So}]\\uFE0F?)*)";
const LEAD = new RegExp(`^\\s*(${GLYPH})\\s*(?:[|\\-–—:·•]\\s*)?(\\S[\\s\\S]*)$`, "u");

/** The leading glyph and the rest of the title, or null when the title has no leading glyph (or nothing after it). */
export function splitTitle(title: string | undefined | null): { icon: string; title: string } | null {
  if (typeof title !== "string") return null;
  const m = LEAD.exec(title);
  if (!m) return null;
  return { icon: m[1]!, title: m[2]!.trimEnd() };
}

/** The lever: "0" turns normalising off (lib/levers.ts reads it from the applied theme). */
export const TITLE_LEVER = "ox-title-normalise";
