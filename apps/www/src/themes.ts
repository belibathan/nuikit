// Theme presets, written exactly like a TweakCN / shadcn export (.dark block, oklch).
// The playground feeds them through applyTheme() from @nuikit/core.
export const themes: { name: string; swatch: string[]; css: string }[] = [
  {
    name: "nuikit",
    swatch: ["#955aff", "#22c55e", "#38bdf8"],
    css: `.dark {
  --radius: 0.75rem;
  --background: oklch(0.16 0.02 280);
  --card: oklch(0.21 0.03 280);
  --card-foreground: oklch(0.97 0.01 280);
  --popover: oklch(0.21 0.03 280);
  --primary: oklch(0.62 0.24 295);
  --primary-foreground: oklch(0.99 0 0);
  --muted: oklch(0.28 0.03 280);
  --muted-foreground: oklch(0.72 0.03 280);
  --accent: oklch(0.32 0.05 290);
  --destructive: oklch(0.66 0.22 22);
  --border: oklch(1 0 0 / 10%);
  --ring: oklch(0.62 0.24 295);
  --chart-1: oklch(0.7 0.19 150);
  --chart-2: oklch(0.75 0.15 230);
  --chart-3: oklch(0.8 0.16 80);
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
  {
    name: "shadcn",
    swatch: ["#e5e5e5", "#737373", "#ef4444"],
    css: `.dark {
  --radius: 0.625rem;
  --background: oklch(0.145 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
}`,
  },
];
