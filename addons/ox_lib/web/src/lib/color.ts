/**
 * ox_lib passes Mantine colour keys for progress bars ('blue', 'red.6', 'dark.3').
 * Named hues map onto the theme's roles so meaning survives (red stays danger, green success) and no
 * palette of ours is left: reds are danger, greens success, yellows and oranges warning, the cool hues
 * info, and gray the muted text. 'dark.*' and missing values follow the theme. Raw CSS colours pass through.
 */
export const HUES: Record<string, string> = {
  gray: "var(--muted-foreground)",
  red: "var(--destructive)",
  pink: "var(--destructive)",
  grape: "var(--info)",
  violet: "var(--info)",
  indigo: "var(--info)",
  blue: "var(--info)",
  cyan: "var(--info)",
  teal: "var(--success)",
  green: "var(--success)",
  lime: "var(--success)",
  yellow: "var(--warning)",
  orange: "var(--warning)",
};

export function schemeColor(scheme: string | undefined, fallback = "var(--primary)"): string {
  if (!scheme) return fallback;
  if (/^(#|rgb|hsl|oklch|var\()/.test(scheme)) return scheme;
  const name = scheme.split(".")[0]!;
  if (name === "dark") return fallback;
  return HUES[name] ?? fallback;
}
