// Theme presets, written exactly like a TweakCN / shadcn export (.dark block, oklch).
// "Neutral" is the stock `shadcn init` theme and the default; the rest are examples.
// The playground feeds them through applyTheme() from nuikit.
import { compileTheme, toRgba } from "nuikit-core";

// Every identity in packages/core/themes (nuikit-core/themes/*.css; read relatively so vitest sees the
// files too). A new file there shows up in the pickers on its own.
const files = import.meta.glob("../../../packages/core/themes/*.css", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

/** The identities first in the pickers (Default, the flagship, leads); any other file there follows in name order. */
const ORDER = ["default", "neon-pop"];

/** A theme id as a display name: "neon-pop" → "Neon Pop". */
const title = (id: string) => id.split("-").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ");

const hex = (v: string | undefined) => {
  const c = v ? toRgba(v) : null;
  return c ? `#${c.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}` : "#000000";
};

/**
 * The nuikit identities (tokens 1.1+, docs/tokens.md#identities): colour plus type, shape, surface,
 * density, motion and HUD style. First in the pickers on /blocks and /theme; the swatch is the
 * compiled brand, foreground and background.
 */
export const identities: { name: string; swatch: string[]; css: string }[] = Object.entries(files)
  // the site has no nuikit resource to serve an identity's rule file (@import "https://cfx-nui-nuikit/…"): drop
  // the line, so no request fails; index.css imports Default's rules directly
  .map(([path, css]) => ({ id: path.split("/").pop()!.replace(/.css$/, ""), css: css.replace(/^@import url\("https:\/\/cfx-nui-[^\n]*\n/gm, "") }))
  .sort((x, y) => (ORDER.indexOf(x.id) + 1 || 99) - (ORDER.indexOf(y.id) + 1 || 99) || x.id.localeCompare(y.id))
  .map(({ id, css }) => {
    const v = compileTheme(css, { mode: "dark" }).vars;
    return { name: title(id), swatch: [hex(v.brand ?? v.primary), hex(v.foreground), hex(v.background)], css };
  });

export const themes: { name: string; swatch: string[]; css: string }[] = [
  {
    name: "Neutral",
    swatch: ["#e5e5e5", "#737373", "#171717"],
    css: `.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
}`,
  },
  {
    name: "Vice",
    swatch: ["#ff3d9a", "#22e3ff", "#ffd23f"],
    css: `.dark {
  --radius: 0.25rem;
  --background: oklch(0.15 0.04 330);
  --card: oklch(0.2 0.06 320);
  --card-foreground: oklch(0.97 0.02 330);
  --popover: oklch(0.2 0.06 320);
  --primary: oklch(0.68 0.25 350);
  --primary-foreground: oklch(0.15 0.04 330);
  --muted: oklch(0.27 0.06 320);
  --muted-foreground: oklch(0.78 0.06 330);
  --accent: oklch(0.3 0.08 320);
  --destructive: oklch(0.65 0.24 25);
  --border: oklch(0.85 0.15 200 / 25%);
  --ring: oklch(0.85 0.15 200);
  --chart-1: oklch(0.85 0.15 200);
  --chart-2: oklch(0.82 0.16 90);
  --chart-3: oklch(0.75 0.2 140);
}`,
  },
  {
    name: "Ember",
    swatch: ["#ff7a1a", "#facc15", "#a3e635"],
    css: `.dark {
  --radius: 0.5rem;
  --background: oklch(0.17 0.01 60);
  --card: oklch(0.21 0.015 60);
  --card-foreground: oklch(0.96 0.01 80);
  --popover: oklch(0.21 0.015 60);
  --primary: oklch(0.72 0.19 50);
  --primary-foreground: oklch(0.18 0.02 50);
  --muted: oklch(0.27 0.015 60);
  --muted-foreground: oklch(0.72 0.02 70);
  --accent: oklch(0.3 0.03 60);
  --destructive: oklch(0.63 0.23 27);
  --border: oklch(1 0 0 / 9%);
  --ring: oklch(0.72 0.19 50);
  --chart-1: oklch(0.8 0.18 130);
  --chart-2: oklch(0.85 0.16 95);
  --chart-3: oklch(0.75 0.14 210);
}`,
  },
  {
    name: "Los Santos",
    swatch: ["#22c55e", "#e5e7eb", "#60a5fa"],
    css: `.dark {
  --radius: 0rem;
  --background: oklch(0.14 0.01 160);
  --card: oklch(0.12 0.01 160);
  --card-foreground: oklch(0.96 0.01 160);
  --popover: oklch(0.12 0.01 160);
  --primary: oklch(0.72 0.19 150);
  --primary-foreground: oklch(0.14 0.02 160);
  --muted: oklch(0.24 0.01 160);
  --muted-foreground: oklch(0.7 0.02 160);
  --accent: oklch(0.26 0.02 160);
  --destructive: oklch(0.62 0.22 25);
  --border: oklch(1 0 0 / 14%);
  --ring: oklch(0.72 0.19 150);
  --chart-1: oklch(0.85 0.1 150);
  --chart-2: oklch(0.7 0.14 250);
  --chart-3: oklch(0.83 0.15 85);
}`,
  },
];
