/**
 * Text styles: one complete style per role. Each names a voice (face, slant, weight, tracking, case, overhang pad:
 * `type.<voice>.*`), a size (`text.*`) and a leading (`leading.*`), and may override the voice's weight, tracking or
 * case with another identity lever. gen-tokens writes every style once, as `@utility nk-text-<name>` in kit.css, plus
 * the older names as aliases. Slant comes only from here (through `type.<voice>.style`): a component or a screen
 * picks a style, never a font-style, family, weight, tracking or case of its own.
 */
export type Voice = "scan" | "title" | "label" | "num" | "body";

export interface TextStyle {
  description: string;
  voice: Voice;
  /** A `text.*` lever path. None: the style keeps its context's size (a voice modifier, like num on a stat). */
  size?: string;
  /** A `leading.*` lever path. None: the context's line height. */
  leading?: string;
  /** Override the voice's weight, tracking or case with another identity lever path. */
  weight?: string;
  tracking?: string;
  case?: string;
  /** Pad the end by the voice's overhang (a slanted face's last letter). */
  pad?: boolean;
  /** Tabular numerals. */
  tabular?: boolean;
  /** Secondary text: the muted foreground. */
  muted?: boolean;
  /** Size and leading win over a shadcn part's own text-* (CardTitle, DialogTitle). */
  important?: boolean;
  /** Older utility names that draw the same style. */
  aliases?: string[];
  /** Not in the one-type-style-per-element merge family: combines with a sized style (num on a stat). */
  modifier?: boolean;
}

export const TEXT_STYLES: Record<string, TextStyle> = {
  display: {
    description: "Full-screen titles: pause, loading, death",
    voice: "title",
    size: "text.display",
    leading: "leading.display",
    weight: "type.weight-display",
    tracking: "type.tracking-display",
    pad: true,
    aliases: ["nk-display"],
  },
  section: {
    description: "Section and sheet titles",
    voice: "title",
    size: "text.section",
    leading: "leading.title",
    pad: true,
  },
  title: {
    description: "Panel, dialog and card titles",
    voice: "title",
    size: "text.title",
    leading: "leading.title",
    pad: true,
    important: true,
    aliases: ["nk-title"],
  },
  label: {
    description: "Labels and meta lines, as written",
    voice: "label",
    size: "text.label",
    leading: "leading.tight",
    pad: true,
    muted: true,
    important: true,
    aliases: ["nk-label"],
  },
  caption: {
    description: "The short name of a value (Fuel, Balance, Voice): one to three words",
    voice: "label",
    size: "text.label",
    leading: "leading.tight",
    weight: "type.weight-strong",
    tracking: "type.tracking-label",
    pad: true,
    muted: true,
    important: true,
    aliases: ["nk-caption"],
  },
  scan: {
    description: "Keys, buttons, tabs: anything scanned",
    voice: "scan",
    size: "text.key",
    aliases: ["nk-scan"],
  },
  num: {
    description: "Numbers at their context's size: money, counts, timers (tabular)",
    voice: "num",
    pad: true,
    tabular: true,
    modifier: true,
    aliases: ["nk-num"],
  },
  figure: {
    description: "A number that is the point: a clock, a balance, the speed (tabular, display weight)",
    voice: "num",
    size: "text.figure",
    leading: "leading.figure",
    weight: "type.weight-display",
    pad: true,
    tabular: true,
  },
  hud: {
    description: "Values read in motion on the HUD (tabular)",
    voice: "num",
    size: "text.hud",
    leading: "leading.display",
    pad: true,
    tabular: true,
  },
  body: {
    description: "Sentences",
    voice: "body",
    size: "text.body",
    leading: "leading.normal",
    aliases: ["nk-body"],
  },
  desc: {
    description: "A row's or a notice's description",
    voice: "body",
    size: "text.desc",
    leading: "leading.normal",
    muted: true,
  },
};
