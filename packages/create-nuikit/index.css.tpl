@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

/*
 * Theme: stock shadcn tokens. Paste any TweakCN / shadcn theme over the :root and .dark
 * blocks and every component (yours, shadcn's, nuikit's) follows. oklch is fine —
 * vite-plugin-nuikit lowers it for FiveM's Chromium 103 at build time.
 * In game the server theme (nuikit/theme.css, compiled by the nuikit resource) replaces these.
 */
/* {{theme}} */

/*
 * nuikit tokens v1 (docs/tokens.md): game semantics on top of shadcn's. These are the defaults
 * compileTheme() derives from the stock theme above; info follows primary.
 */
/* {{tokens}} */

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
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-hud: var(--hud);
  --color-hud-foreground: var(--hud-foreground);
  --color-scrim: var(--scrim);
  --color-vital-health: var(--vital-health);
  --color-vital-armor: var(--vital-armor);
  --color-vital-hunger: var(--vital-hunger);
  --color-vital-thirst: var(--vital-thirst);
  --color-vital-stress: var(--vital-stress);
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

/* NUI scale: the kit is designed at 1080p and grows with the game's resolution (docs/design.md). */
@layer base {
  /* 1rem = 16px at 1080p, scaling with the game's resolution (21px at 1440p, 32px at 4K),
     times --nk-scale (the theme's UI size × the player's UI scale preference). */
  html {
    font-size: calc(clamp(12px, 1.4815vh, 32px) * var(--nk-scale, 1));
    font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
}

/* {{kit}} */
