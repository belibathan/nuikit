import { HUES } from "@/lib/color";

/**
 * ox_lib's getConfig: { primaryColor, primaryShade } from the ox:primaryColor / ox:primaryShade
 * convars. A nuikit theme wins when one is installed; otherwise the convar colour becomes the
 * shadcn --primary, so a server that set ox:primaryColor keeps its accent after the swap.
 */
export function applyOxConfig(config: { primaryColor?: string; primaryShade?: number } | undefined) {
  const hue = config?.primaryColor && HUES[config.primaryColor];
  if (!hue) return;
  const root = document.documentElement.style;
  root.setProperty("--primary", hue);
  root.setProperty("--primary-foreground", "#ffffff");
  root.setProperty("--ring", hue);
}
