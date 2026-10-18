/**
 * ox_lib passes Mantine colour keys for progress bars ('blue', 'red.6', 'dark.3').
 * Named hues map to fixed colours so meaning survives (red stays red); 'dark.*' and missing
 * values follow the theme. Raw CSS colours pass through.
 */
export const HUES: Record<string, string> = {
  gray: "#868e96",
  red: "#fa5252",
  pink: "#e64980",
  grape: "#be4bdb",
  violet: "#7950f2",
  indigo: "#4c6ef5",
  blue: "#228be6",
  cyan: "#15aabf",
  teal: "#12b886",
  green: "#40c057",
  lime: "#82c91e",
  yellow: "#fab005",
  orange: "#fd7e14",
};

export function schemeColor(scheme: string | undefined, fallback = "var(--primary)"): string {
  if (!scheme) return fallback;
  if (/^(#|rgb|hsl|oklch|var\()/.test(scheme)) return scheme;
  const name = scheme.split(".")[0]!;
  if (name === "dark") return fallback;
  return HUES[name] ?? fallback;
}
