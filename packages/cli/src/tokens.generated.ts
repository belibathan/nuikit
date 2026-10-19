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
  }
];
