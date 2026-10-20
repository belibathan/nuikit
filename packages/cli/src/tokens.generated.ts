// Written by scripts/gen-tokens.mjs from packages/core/tokens/*.json. null = file not found at build time.
export const GENERATED: { name: string; group: string; type: string; description: string }[] | null = [
  {
    "name": "background",
    "group": "base",
    "type": "color",
    "description": "Full-screen surfaces (pause, loading, death scrim)"
  },
  {
    "name": "foreground",
    "group": "base",
    "type": "color",
    "description": "Text on full-screen surfaces"
  },
  {
    "name": "card",
    "group": "base",
    "type": "color",
    "description": "Raised blocks on a full-screen surface"
  },
  {
    "name": "card-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on cards"
  },
  {
    "name": "popover",
    "group": "base",
    "type": "color",
    "description": "Every floating panel (nk-panel)"
  },
  {
    "name": "popover-foreground",
    "group": "base",
    "type": "color",
    "description": "Text in panels"
  },
  {
    "name": "primary",
    "group": "base",
    "type": "color",
    "description": "The one main action per surface, progress fills, selection"
  },
  {
    "name": "primary-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on primary"
  },
  {
    "name": "secondary",
    "group": "base",
    "type": "color",
    "description": "Secondary buttons"
  },
  {
    "name": "secondary-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on secondary"
  },
  {
    "name": "muted",
    "group": "base",
    "type": "color",
    "description": "Tracks, slots and wells inside a panel"
  },
  {
    "name": "muted-foreground",
    "group": "base",
    "type": "color",
    "description": "Secondary text"
  },
  {
    "name": "accent",
    "group": "base",
    "type": "color",
    "description": "Hover and keyboard highlight"
  },
  {
    "name": "accent-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on accent"
  },
  {
    "name": "destructive",
    "group": "base",
    "type": "color",
    "description": "Danger, damage, low values, death"
  },
  {
    "name": "destructive-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on destructive"
  },
  {
    "name": "border",
    "group": "base",
    "type": "color",
    "description": "Hairlines"
  },
  {
    "name": "input",
    "group": "base",
    "type": "color",
    "description": "Field borders"
  },
  {
    "name": "ring",
    "group": "base",
    "type": "color",
    "description": "Focus rings"
  },
  {
    "name": "chart-1",
    "group": "chart",
    "type": "color",
    "description": "Categorical colour 1"
  },
  {
    "name": "chart-2",
    "group": "chart",
    "type": "color",
    "description": "Categorical colour 2"
  },
  {
    "name": "chart-3",
    "group": "chart",
    "type": "color",
    "description": "Categorical colour 3"
  },
  {
    "name": "chart-4",
    "group": "chart",
    "type": "color",
    "description": "Categorical colour 4"
  },
  {
    "name": "chart-5",
    "group": "chart",
    "type": "color",
    "description": "Categorical colour 5"
  },
  {
    "name": "success",
    "group": "status",
    "type": "color",
    "description": "Positive status: done, paid, online"
  },
  {
    "name": "success-foreground",
    "group": "status",
    "type": "color",
    "description": "Text on success"
  },
  {
    "name": "warning",
    "group": "status",
    "type": "color",
    "description": "Caution status: low fuel, about to expire"
  },
  {
    "name": "warning-foreground",
    "group": "status",
    "type": "color",
    "description": "Text on warning"
  },
  {
    "name": "info",
    "group": "status",
    "type": "color",
    "description": "Neutral status: tips, notices"
  },
  {
    "name": "info-foreground",
    "group": "status",
    "type": "color",
    "description": "Text on info"
  },
  {
    "name": "hud",
    "group": "hud",
    "type": "color",
    "description": "Surfaces drawn straight on the game: HUD chips, hotbar, target eye"
  },
  {
    "name": "hud-foreground",
    "group": "hud",
    "type": "color",
    "description": "Text and icons on hud"
  },
  {
    "name": "scrim",
    "group": "base",
    "type": "color",
    "description": "Darkens the game behind full-screen screens, bar tracks and shadows on the game; always used with opacity"
  },
  {
    "name": "vital-health",
    "group": "vital",
    "type": "color",
    "description": "Health bar"
  },
  {
    "name": "vital-armor",
    "group": "vital",
    "type": "color",
    "description": "Armor bar"
  },
  {
    "name": "vital-hunger",
    "group": "vital",
    "type": "color",
    "description": "Hunger bar"
  },
  {
    "name": "vital-thirst",
    "group": "vital",
    "type": "color",
    "description": "Thirst bar"
  },
  {
    "name": "vital-stress",
    "group": "vital",
    "type": "color",
    "description": "Stress bar"
  },
  {
    "name": "brand",
    "group": "base",
    "type": "color",
    "description": "The server's signature colour: active indicators, gauge needles, focus, logos (not the action: that's primary)"
  },
  {
    "name": "brand-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on brand"
  },
  {
    "name": "radius",
    "group": "shape",
    "type": "dimension",
    "description": "Corner radius (panels radius + 4px, controls radius − 2px)"
  },
  {
    "name": "sans",
    "group": "base",
    "type": "fontFamily",
    "description": "Text"
  },
  {
    "name": "mono",
    "group": "base",
    "type": "fontFamily",
    "description": "Codes and IDs a player might type"
  },
  {
    "name": "display",
    "group": "base",
    "type": "fontFamily",
    "description": "Headings and big moments (titles, timers, the balance)"
  },
  {
    "name": "numeric",
    "group": "base",
    "type": "fontFamily",
    "description": "Every number on a gauge, money or timer (always tabular)"
  },
  {
    "name": "nk-scale",
    "group": "kit",
    "type": "number",
    "description": "UI size multiplier (unitless). Players can scale further (0.85–1.25)."
  },
  {
    "name": "nk-motion",
    "group": "kit",
    "type": "number",
    "description": "1 = animations on, 0 = off. Players can turn motion off."
  },
  {
    "name": "nk-type-ratio",
    "group": "kit",
    "type": "number",
    "description": "Step between type sizes: 1.125 calm … 1.333 dramatic"
  },
  {
    "name": "nk-weight-body",
    "group": "kit",
    "type": "number",
    "description": "Body text weight"
  },
  {
    "name": "nk-weight-strong",
    "group": "kit",
    "type": "number",
    "description": "Titles, key numbers, active rows"
  },
  {
    "name": "nk-weight-display",
    "group": "kit",
    "type": "number",
    "description": "Display type (full-screen titles, big numbers)"
  },
  {
    "name": "nk-tracking-display",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of display type"
  },
  {
    "name": "nk-label-case",
    "group": "kit",
    "type": "number",
    "description": "Captions (the short names of values) in uppercase or as written"
  },
  {
    "name": "nk-tracking-label",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of captions (uppercase wants 0.06–0.12em)"
  },
  {
    "name": "nk-border-width",
    "group": "kit",
    "type": "dimension",
    "description": "Hairline weight of panels, rows and fields"
  },
  {
    "name": "nk-cut",
    "group": "kit",
    "type": "dimension",
    "description": "Chamfered corners (top left, bottom right), drawn with clip-path; 0 = off"
  },
  {
    "name": "nk-surface-opacity",
    "group": "kit",
    "type": "number",
    "description": "Panel opacity over the game (floor 0.92 for text panels)"
  },
  {
    "name": "nk-surface-tint",
    "group": "kit",
    "type": "number",
    "description": "How much brand tints neutral surfaces (0–0.12)"
  },
  {
    "name": "nk-surface-gradient",
    "group": "kit",
    "type": "number",
    "description": "Top-to-bottom light falloff on panels (0 = flat)"
  },
  {
    "name": "nk-surface-edge",
    "group": "kit",
    "type": "number",
    "description": "Inner top highlight, the machined edge (alpha)"
  },
  {
    "name": "nk-elevation",
    "group": "kit",
    "type": "number",
    "description": "Shadow recipe of floating panels"
  },
  {
    "name": "nk-glow",
    "group": "kit",
    "type": "number",
    "description": "Brand glow on active parts and HUD fills (alpha, 0 = off)"
  },
  {
    "name": "nk-density",
    "group": "kit",
    "type": "number",
    "description": "Multiplies the kit's spacing scale: 0.875 compact (Graphite) … 1.15 roomy"
  },
  {
    "name": "nk-ease",
    "group": "kit",
    "type": "number",
    "description": "The one easing curve"
  },
  {
    "name": "nk-duration",
    "group": "kit",
    "type": "number",
    "description": "Base duration (panel enter, transitions); × nk-motion"
  },
  {
    "name": "nk-hud-opacity",
    "group": "kit",
    "type": "number",
    "description": "Minimum backplate opacity of HUD chips and tiles"
  },
  {
    "name": "nk-hud-text-shadow",
    "group": "kit",
    "type": "number",
    "description": "Shadow under text drawn on the game"
  },
  {
    "name": "nk-gauge-style",
    "group": "kit",
    "type": "number",
    "description": "How gauges are drawn"
  },
  {
    "name": "nk-gauge-track",
    "group": "kit",
    "type": "dimension",
    "description": "Gauge and meter track thickness"
  },
  {
    "name": "nk-gauge-ticks",
    "group": "kit",
    "type": "number",
    "description": "Tick marks on gauges: 1 on, 0 off"
  },
  {
    "name": "nk-row-indicator",
    "group": "kit",
    "type": "number",
    "description": "How the active row is marked"
  }
];
