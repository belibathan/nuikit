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

/*
 * nuikit kit layer: the sizing, spacing and surface rules every nuikit UI shares (docs/design.md).
 * Colours always come from the theme above; this only fixes proportions so every screen on the
 * server feels like one product.
 */
@layer base {
  /* 1rem = 16px at 1080p, scaling with the game's resolution (21px at 1440p, 32px at 4K). */
  html {
    font-size: clamp(12px, 1.4815vh, 32px);
    font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
}

/* Floating panel: menus, inventories, dialogs, cards on top of the game. */
@utility nk-panel {
  /* !important so it wins over a shadcn primitive's own surface (DialogContent's bg-background) */
  background-color: var(--popover) !important;
  color: var(--popover-foreground) !important;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px) !important;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25), 0 24px 64px -24px rgb(0 0 0 / 0.7);
}
/* Panel header: one line, title left, meta/actions right. */
@utility nk-panel-header {
  display: flex;
  text-align: left;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
@utility nk-panel-body {
  padding: 0.5rem;
}
@utility nk-panel-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border);
}
/* Title inside a panel header. */
@utility nk-title {
  /* !important: shadcn titles carry text-lg, which would otherwise win */
  font-size: 0.9375rem !important;
  font-weight: 600;
  line-height: 1.25rem !important;
  letter-spacing: -0.01em;
}
/* Small secondary label, sentence case. */
@utility nk-label {
  font-size: 0.75rem !important;
  line-height: 1rem !important;
  font-weight: 500;
  color: var(--muted-foreground);
}
/* Interactive row in a list: 40px tall at 1080p. */
@utility nk-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: calc(var(--radius) - 2px);
  font-size: 0.875rem;
  line-height: 1.25rem;
}
/* Numbers: money, timers, counts. */
@utility nk-num {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
/* HUD chip: always-on, no border, sits on the game. */
@utility nk-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  height: 1.75rem;
  padding: 0 0.625rem;
  border-radius: 9999px;
  background-color: rgb(0 0 0 / 0.45);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
}
/* Active chip (talking, selected). */
@utility nk-chip-active {
  background-color: var(--primary);
  color: var(--primary-foreground);
}
/* Square HUD tile on the game (hotbar slots, the target eye): the chip's surface, any size. */
@utility nk-hud {
  border-radius: calc(var(--radius) + 2px);
  background-color: rgb(0 0 0 / 0.45);
  color: #fff;
}
/* Bar track on the game world: theme-tinted tracks vanish over a bright sky. */
@utility nk-track {
  background-color: rgb(0 0 0 / 0.35);
}
/* Text and marks drawn straight on the game. */
@utility nk-shadow {
  text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.35));
}
/* Full-screen title (pause, loading, death): 32px at 1080p. */
@utility nk-display {
  font-size: 2rem;
  line-height: 2.5rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}
/* Scrolling list inside a panel. */
@utility nk-scroll {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-gutter: stable;
}
/* Distance from the screen edge for anything anchored to it. */
@utility nk-edge {
  --nk-edge: 1.5rem;
}
/* The one open animation. */
@utility nk-enter {
  animation: nk-enter 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes nk-enter {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .nk-enter { animation: none; }
}
