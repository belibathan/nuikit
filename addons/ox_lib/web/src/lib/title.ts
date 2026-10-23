/**
 * Resource-supplied titles, normalised at the boundary (docs/next/handoff.md §5.7: third-party input is
 * hostile to design). Scripts write "🎽 | Clothing store" or "★ - VIP garage": the glyph is an icon, not a
 * word. `splitTitle` takes a leading emoji (or an icon-like symbol) and the separator after it ("|", "-",
 * "–", ":", "·", "•") out of the title, so the menu's icon slot draws the glyph and the title reads in the
 * label voice like every other row.
 *
 * On by default; `--ox-title-normalise: 0` on :root in nuikit/theme.css keeps titles as written.
 */

import { lookup } from "@/lib/icon";

// One emoji element: keycap (1️⃣), flag (🇺🇸), tag flag (🏴 + tags), or a pictograph / symbol with its modifiers
// (VS16, skin tone, enclosing keycap); elements join with ZWJ (👨‍👩‍👧, 🏳️‍🌈, 👨🏽‍⚕️).
const MARK = "(?:\\uFE0F|\\p{Emoji_Modifier}|\\u20E3)";
const ONE = `(?:[0-9#*]\\uFE0F?\\u20E3|\\p{Regional_Indicator}{2}|\\u{1F3F4}[\\u{E0020}-\\u{E007E}]+\\u{E007F}|[\\p{Extended_Pictographic}\\p{So}]${MARK}*)`;
const GLYPH = `${ONE}(?:\\u200D${ONE})*`;
const SEP = "[|\\-–—:·•]";
const LEAD = new RegExp(`^\\s*(${GLYPH})\\s*(?:${SEP}\\s*)?(\\S[\\s\\S]*)$`, "u");
// "shirt | Clothing", "fa-shirt | Clothing", "fas fa-shirt | Clothing": a Font Awesome name, only with a pipe
const NAMED = /^\s*((?:fa[srb]?\s+|fa-solid\s+|fa-regular\s+|fa-brands\s+)?(?:fa-)?[a-z][a-z0-9]*(?:-[a-z0-9]+)*)\s*\|\s*(\S[\s\S]*)$/;

/**
 * The leading glyph and the rest of the title, or null when the title has no leading glyph (or nothing after it).
 * `named` is set when the glyph is a Font Awesome name (draw it with <Icon>), not a character.
 */
export function splitTitle(title: string | undefined | null): { icon: string; title: string; named?: boolean } | null {
  if (typeof title !== "string") return null;
  const m = LEAD.exec(title);
  if (m) return { icon: m[1]!, title: m[2]!.trimEnd() };
  const n = NAMED.exec(title);
  if (n && lookup(n[1]!)) return { icon: n[1]!, title: n[2]!.trimEnd(), named: true };
  return null;
}

/**
 * The frame's icon renderer draws Font Awesome / lucide names, not characters, so routed menus get the
 * glyph as a name where one fits. Common emoji on FiveM menus; anything else is dropped (no icon).
 */
const EMOJI_ICON: Record<string, string> = {
  "🧥": "shirt", "👕": "shirt", "👔": "user-tie", "👖": "shirt", "👗": "shirt", "👚": "shirt", "🧢": "hat-cowboy", "👒": "hat-cowboy", "🎩": "hat-wizard",
  "👟": "shoe-prints", "👞": "shoe-prints", "👓": "glasses", "🕶️": "glasses", "🕶": "glasses", "💍": "ring", "👜": "bag-shopping", "🎒": "bag-shopping", "🧤": "hand",
  "💾": "floppy-disk", "🗑️": "trash", "🗑": "trash", "💰": "coins", "💵": "money-bill", "💳": "credit-card", "🏦": "building-columns",
  "🚗": "car", "🏎️": "car", "🏎": "car", "🚓": "car-side", "🚑": "truck-medical", "🚒": "fire-extinguisher", "🚚": "truck", "🏍️": "motorcycle", "🏍": "motorcycle", "🚲": "bicycle", "✈️": "plane", "🚁": "helicopter", "⛽": "gas-pump", "🔧": "wrench", "🛠️": "screwdriver-wrench",
  "🔑": "key", "🔒": "lock", "🔓": "lock-open", "🚪": "door-open", "🏠": "house", "🏢": "building", "🏪": "store", "🛒": "cart-shopping", "📦": "box", "🎁": "gift",
  "👮": "user-shield", "🚨": "bell", "🔫": "gun", "💊": "pills", "🩺": "stethoscope", "👨🏽‍⚕️": "user-doctor", "👨‍⚕️": "user-doctor", "👩‍⚕️": "user-doctor",
  "👤": "user", "👥": "users", "📱": "mobile-screen", "📞": "phone", "📻": "radio", "📋": "clipboard-list", "📝": "pen", "📍": "location-dot", "🗺️": "map", "🔍": "magnifying-glass",
  "⚙️": "gear", "⚙": "gear", "✂️": "scissors", "💇": "scissors", "💈": "scissors", "🎨": "palette", "🖌️": "paintbrush", "💄": "wand-magic-sparkles", "🎭": "masks-theater", "🧑‍🎨": "palette",
  "⭐": "star", "★": "star", "❤️": "heart", "✅": "check", "❌": "xmark", "⚠️": "triangle-exclamation", "ℹ️": "circle-info", "🔙": "arrow-left", "➕": "plus", "➖": "minus", "🔥": "fire", "🍔": "burger", "🍺": "beer-mug-empty", "☕": "mug-hot", "🎣": "fish", "⛏️": "hammer", "🌿": "leaf", "🎰": "dice",
};

/** A Font Awesome name for a glyph splitTitle took out (named ones pass through), or undefined. */
export function glyphIcon(g: { icon: string; named?: boolean }): string | undefined {
  return g.named ? g.icon : EMOJI_ICON[g.icon] ?? EMOJI_ICON[g.icon.replace(/\uFE0F/g, "")];
}

/** The lever: "0" turns normalising off (lib/levers.ts reads it from the applied theme). */
export const TITLE_LEVER = "ox-title-normalise";
