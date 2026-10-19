/** Colour literal and class matching shared by the CSS, markup and script scanners. */
import { COLOR_TOKEN_NAMES } from "./tokens";

export interface ColorHit {
  index: number;
  text: string;
}

/** rgb(0 0 0), hsl(…), oklch(…) with a literal first argument (not var()/calc()/${…}). */
const FUNC = /(?<![a-zA-Z0-9-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*(?:[-+]?[\d.]|none\b)[^()]*\)/gi;
const HEX = /(?<![\w&#/$.-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;

export function colorLiterals(text: string): ColorHit[] {
  const hits: ColorHit[] = [];
  for (const m of text.matchAll(FUNC)) hits.push({ index: m.index!, text: m[0] });
  for (const m of text.matchAll(HEX)) hits.push({ index: m.index!, text: m[0] });
  return hits.sort((a, b) => a.index - b.index);
}

/** Black or white at any alpha: allowed for shadows and scrims under a shadow property. */
export function isNeutralShadow(literal: string): boolean {
  const v = literal.toLowerCase().replace(/_/g, " ").trim();
  if (/^#(?:000|fff)[0-9a-f]?$|^#(?:000000|ffffff)(?:[0-9a-f]{2})?$/.test(v)) return true;
  const m = /^([a-z]+)\((.*)\)$/.exec(v);
  if (!m) return false;
  const parts = m[2]!.split(/[\s,/]+/).filter(Boolean).map((p) => parseFloat(p));
  const [a, b, c] = parts;
  if (m[1]!.startsWith("rgb")) return (a === 0 && b === 0 && c === 0) || (a === 255 && b === 255 && c === 255);
  if (m[1]!.startsWith("hsl")) return c === 0 || c === 100;
  if (m[1]!.startsWith("okl") || m[1] === "lab" || m[1] === "lch") return a === 0 || a === 1 || a === 100;
  return false;
}

export const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe";
const UTIL = "bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder|inset-shadow|inset-ring";
/** bg-emerald-500, hover:text-red-400/80, !border-x-zinc-800 */
const PALETTE_CLASS = new RegExp(`(?<![\\w-])(?:[\\w-]+:)*!?(?:${UTIL})-(?:${PALETTE})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\\/[\\w.]+)?(?![\\w-])`, "g");

export function paletteClasses(text: string): ColorHit[] {
  return [...text.matchAll(PALETTE_CLASS)].map((m) => ({ index: m.index!, text: m[0] }));
}

const tokenAlt = COLOR_TOKEN_NAMES.slice()
  .sort((a, b) => b.length - a.length)
  .map((t) => t.replace(/[-]/g, "\\-"))
  .join("|");
/** bg-primary, text-muted-foreground, border-border, ring-ring/50 … and the kit's nk-* utilities. */
const TOKEN_CLASS = new RegExp(`(?<![\\w-])(?:[\\w-]+:)*!?(?:${UTIL})-(?:${tokenAlt})(?:\\/[\\w.]+)?(?![\\w-])|(?<![\\w-])nk-[a-z][a-z-]*(?![\\w-])`, "g");
const TOKEN_VAR = new RegExp(`var\\(\\s*--(?:${tokenAlt}|nk-[a-z-]+|radius|font-sans|font-mono)\\b`, "g");

export function tokenRefs(text: string): number {
  return (text.match(TOKEN_CLASS)?.length ?? 0) + (text.match(TOKEN_VAR)?.length ?? 0);
}

/** CSS named colours (minus black, white, transparent, currentColor): flagged only in colour properties. */
export const NAMED = new Set(
  "aliceblue antiquewhite aqua aquamarine azure beige bisque blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat whitesmoke yellow yellowgreen".split(
    " ",
  ),
);
export const COLOR_PROPS = /^(color|background|background-color|border|border-(?:top|right|bottom|left|block|inline)(?:-color)?|border-color|outline|outline-color|fill|stroke|caret-color|accent-color|text-decoration|text-decoration-color|column-rule|column-rule-color|stop-color|flood-color|lighting-color)$/i;
