/**
 * ox_lib passes Mantine colour keys ('blue', 'red.6'), as the config's primaryColor.
 * Named hues map onto the theme's roles so meaning survives (red stays danger, green success) and no
 * palette of ours is left: reds are danger, greens success, yellows and oranges warning, the cool hues
 * info, and gray the muted text.
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
