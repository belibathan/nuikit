@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/*
 * Theme: stock shadcn tokens. Paste any TweakCN / shadcn theme over the :root and .dark
 * blocks and every component (yours, shadcn's, nuikit's) follows. oklch is fine —
 * vite-plugin-nuikit lowers it for FiveM's Chromium 103 at build time.
 */
/* {{theme}} */

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  /* NUI draws over the game: the page itself must stay transparent. */
  html,
  body {
    background: transparent;
    @apply text-foreground select-none;
  }
  input,
  textarea {
    @apply select-text;
  }
}
