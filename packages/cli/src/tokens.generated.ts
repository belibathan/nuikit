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
    "description": "Every floating panel"
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
    "description": "The one main action per surface, the keycap face, selection"
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
    "description": "Hover tint"
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
    "description": "A text field's caret rim"
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
    "name": "radius",
    "group": "shape",
    "type": "dimension",
    "description": "The radius scale's base: every radius step derives from it"
  },
  {
    "name": "brand",
    "group": "base",
    "type": "color",
    "description": "The server's signature: active marks, needles, the accent's stops"
  },
  {
    "name": "brand-foreground",
    "group": "base",
    "type": "color",
    "description": "Text on brand"
  },
  {
    "name": "success",
    "group": "status",
    "type": "color",
    "description": "Positive status"
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
    "description": "Caution status"
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
    "description": "Neutral status"
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
    "description": "Surfaces drawn straight on the game: HUD chips, hotbar"
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
    "description": "Darkens the game; shadows and walls; always used with opacity"
  },
  {
    "name": "surface",
    "group": "base",
    "type": "color",
    "description": "The panel colour, tinted toward brand by surface.tint"
  },
  {
    "name": "world-foreground",
    "group": "base",
    "type": "color",
    "description": "Text drawn straight on the game, light in every theme"
  },
  {
    "name": "world-foreground-muted",
    "group": "base",
    "type": "color",
    "description": "Secondary text on the game"
  },
  {
    "name": "world-success",
    "group": "base",
    "type": "color",
    "description": "A gain drawn on the game"
  },
  {
    "name": "world-destructive",
    "group": "base",
    "type": "color",
    "description": "A loss drawn on the game"
  },
  {
    "name": "vital-health",
    "group": "vital",
    "type": "color",
    "description": "Health"
  },
  {
    "name": "vital-armor",
    "group": "vital",
    "type": "color",
    "description": "Armor"
  },
  {
    "name": "vital-hunger",
    "group": "vital",
    "type": "color",
    "description": "Hunger"
  },
  {
    "name": "vital-thirst",
    "group": "vital",
    "type": "color",
    "description": "Thirst"
  },
  {
    "name": "world-shadow",
    "group": "base",
    "type": "color",
    "description": "Text-shadow that keeps world-foreground legible over any frame"
  },
  {
    "name": "pause-surface",
    "group": "base",
    "type": "color",
    "description": "The slash pause panel's light surface (style.pause: slash)"
  },
  {
    "name": "pause-ink",
    "group": "base",
    "type": "color",
    "description": "Text on the slash pause panel"
  },
  {
    "name": "vital-stress",
    "group": "vital",
    "type": "color",
    "description": "Stress"
  },
  {
    "name": "role-health",
    "group": "base",
    "type": "color",
    "description": "Role health: the --hue-* ramp under data-hue=\"health\""
  },
  {
    "name": "role-health-deep",
    "group": "base",
    "type": "color",
    "description": "health, darker: the ramp's deep step"
  },
  {
    "name": "role-health-light",
    "group": "base",
    "type": "color",
    "description": "health, lighter: the ramp's gradient start"
  },
  {
    "name": "role-armor",
    "group": "base",
    "type": "color",
    "description": "Role armor: the --hue-* ramp under data-hue=\"armor\""
  },
  {
    "name": "role-armor-deep",
    "group": "base",
    "type": "color",
    "description": "armor, darker: the ramp's deep step"
  },
  {
    "name": "role-armor-light",
    "group": "base",
    "type": "color",
    "description": "armor, lighter: the ramp's gradient start"
  },
  {
    "name": "role-hunger",
    "group": "base",
    "type": "color",
    "description": "Role hunger: the --hue-* ramp under data-hue=\"hunger\""
  },
  {
    "name": "role-hunger-deep",
    "group": "base",
    "type": "color",
    "description": "hunger, darker: the ramp's deep step"
  },
  {
    "name": "role-hunger-light",
    "group": "base",
    "type": "color",
    "description": "hunger, lighter: the ramp's gradient start"
  },
  {
    "name": "role-thirst",
    "group": "base",
    "type": "color",
    "description": "Role thirst: the --hue-* ramp under data-hue=\"thirst\""
  },
  {
    "name": "role-thirst-deep",
    "group": "base",
    "type": "color",
    "description": "thirst, darker: the ramp's deep step"
  },
  {
    "name": "role-thirst-light",
    "group": "base",
    "type": "color",
    "description": "thirst, lighter: the ramp's gradient start"
  },
  {
    "name": "role-stress",
    "group": "base",
    "type": "color",
    "description": "Role stress: the --hue-* ramp under data-hue=\"stress\""
  },
  {
    "name": "role-stress-deep",
    "group": "base",
    "type": "color",
    "description": "stress, darker: the ramp's deep step"
  },
  {
    "name": "role-stress-light",
    "group": "base",
    "type": "color",
    "description": "stress, lighter: the ramp's gradient start"
  },
  {
    "name": "role-stamina",
    "group": "base",
    "type": "color",
    "description": "Role stamina: the --hue-* ramp under data-hue=\"stamina\""
  },
  {
    "name": "role-stamina-deep",
    "group": "base",
    "type": "color",
    "description": "stamina, darker: the ramp's deep step"
  },
  {
    "name": "role-stamina-light",
    "group": "base",
    "type": "color",
    "description": "stamina, lighter: the ramp's gradient start"
  },
  {
    "name": "role-oxygen",
    "group": "base",
    "type": "color",
    "description": "Role oxygen: the --hue-* ramp under data-hue=\"oxygen\""
  },
  {
    "name": "role-oxygen-deep",
    "group": "base",
    "type": "color",
    "description": "oxygen, darker: the ramp's deep step"
  },
  {
    "name": "role-oxygen-light",
    "group": "base",
    "type": "color",
    "description": "oxygen, lighter: the ramp's gradient start"
  },
  {
    "name": "role-info",
    "group": "base",
    "type": "color",
    "description": "Role info: the --hue-* ramp under data-hue=\"info\""
  },
  {
    "name": "role-info-deep",
    "group": "base",
    "type": "color",
    "description": "info, darker: the ramp's deep step"
  },
  {
    "name": "role-info-light",
    "group": "base",
    "type": "color",
    "description": "info, lighter: the ramp's gradient start"
  },
  {
    "name": "role-success",
    "group": "base",
    "type": "color",
    "description": "Role success: the --hue-* ramp under data-hue=\"success\""
  },
  {
    "name": "role-success-deep",
    "group": "base",
    "type": "color",
    "description": "success, darker: the ramp's deep step"
  },
  {
    "name": "role-success-light",
    "group": "base",
    "type": "color",
    "description": "success, lighter: the ramp's gradient start"
  },
  {
    "name": "role-warning",
    "group": "base",
    "type": "color",
    "description": "Role warning: the --hue-* ramp under data-hue=\"warning\""
  },
  {
    "name": "role-warning-deep",
    "group": "base",
    "type": "color",
    "description": "warning, darker: the ramp's deep step"
  },
  {
    "name": "role-warning-light",
    "group": "base",
    "type": "color",
    "description": "warning, lighter: the ramp's gradient start"
  },
  {
    "name": "role-danger",
    "group": "base",
    "type": "color",
    "description": "Role danger: the --hue-* ramp under data-hue=\"danger\""
  },
  {
    "name": "role-danger-deep",
    "group": "base",
    "type": "color",
    "description": "danger, darker: the ramp's deep step"
  },
  {
    "name": "role-danger-light",
    "group": "base",
    "type": "color",
    "description": "danger, lighter: the ramp's gradient start"
  },
  {
    "name": "role-police",
    "group": "base",
    "type": "color",
    "description": "Role police: the --hue-* ramp under data-hue=\"police\""
  },
  {
    "name": "role-police-deep",
    "group": "base",
    "type": "color",
    "description": "police, darker: the ramp's deep step"
  },
  {
    "name": "role-police-light",
    "group": "base",
    "type": "color",
    "description": "police, lighter: the ramp's gradient start"
  },
  {
    "name": "role-ems",
    "group": "base",
    "type": "color",
    "description": "Role ems: the --hue-* ramp under data-hue=\"ems\""
  },
  {
    "name": "role-ems-deep",
    "group": "base",
    "type": "color",
    "description": "ems, darker: the ramp's deep step"
  },
  {
    "name": "role-ems-light",
    "group": "base",
    "type": "color",
    "description": "ems, lighter: the ramp's gradient start"
  },
  {
    "name": "role-mech",
    "group": "base",
    "type": "color",
    "description": "Role mech: the --hue-* ramp under data-hue=\"mech\""
  },
  {
    "name": "role-mech-deep",
    "group": "base",
    "type": "color",
    "description": "mech, darker: the ramp's deep step"
  },
  {
    "name": "role-mech-light",
    "group": "base",
    "type": "color",
    "description": "mech, lighter: the ramp's gradient start"
  },
  {
    "name": "role-gang",
    "group": "base",
    "type": "color",
    "description": "Role gang: the --hue-* ramp under data-hue=\"gang\""
  },
  {
    "name": "role-gang-deep",
    "group": "base",
    "type": "color",
    "description": "gang, darker: the ramp's deep step"
  },
  {
    "name": "role-gang-light",
    "group": "base",
    "type": "color",
    "description": "gang, lighter: the ramp's gradient start"
  },
  {
    "name": "role-civ",
    "group": "base",
    "type": "color",
    "description": "Role civ: the --hue-* ramp under data-hue=\"civ\""
  },
  {
    "name": "role-civ-deep",
    "group": "base",
    "type": "color",
    "description": "civ, darker: the ramp's deep step"
  },
  {
    "name": "role-civ-light",
    "group": "base",
    "type": "color",
    "description": "civ, lighter: the ramp's gradient start"
  },
  {
    "name": "role-staff",
    "group": "base",
    "type": "color",
    "description": "Role staff: the --hue-* ramp under data-hue=\"staff\""
  },
  {
    "name": "role-staff-deep",
    "group": "base",
    "type": "color",
    "description": "staff, darker: the ramp's deep step"
  },
  {
    "name": "role-staff-light",
    "group": "base",
    "type": "color",
    "description": "staff, lighter: the ramp's gradient start"
  },
  {
    "name": "role-common",
    "group": "base",
    "type": "color",
    "description": "Role common: the --hue-* ramp under data-hue=\"common\""
  },
  {
    "name": "role-common-deep",
    "group": "base",
    "type": "color",
    "description": "common, darker: the ramp's deep step"
  },
  {
    "name": "role-common-light",
    "group": "base",
    "type": "color",
    "description": "common, lighter: the ramp's gradient start"
  },
  {
    "name": "role-uncommon",
    "group": "base",
    "type": "color",
    "description": "Role uncommon: the --hue-* ramp under data-hue=\"uncommon\""
  },
  {
    "name": "role-uncommon-deep",
    "group": "base",
    "type": "color",
    "description": "uncommon, darker: the ramp's deep step"
  },
  {
    "name": "role-uncommon-light",
    "group": "base",
    "type": "color",
    "description": "uncommon, lighter: the ramp's gradient start"
  },
  {
    "name": "role-rare",
    "group": "base",
    "type": "color",
    "description": "Role rare: the --hue-* ramp under data-hue=\"rare\""
  },
  {
    "name": "role-rare-deep",
    "group": "base",
    "type": "color",
    "description": "rare, darker: the ramp's deep step"
  },
  {
    "name": "role-rare-light",
    "group": "base",
    "type": "color",
    "description": "rare, lighter: the ramp's gradient start"
  },
  {
    "name": "role-epic",
    "group": "base",
    "type": "color",
    "description": "Role epic: the --hue-* ramp under data-hue=\"epic\""
  },
  {
    "name": "role-epic-deep",
    "group": "base",
    "type": "color",
    "description": "epic, darker: the ramp's deep step"
  },
  {
    "name": "role-epic-light",
    "group": "base",
    "type": "color",
    "description": "epic, lighter: the ramp's gradient start"
  },
  {
    "name": "role-legendary",
    "group": "base",
    "type": "color",
    "description": "Role legendary: the --hue-* ramp under data-hue=\"legendary\""
  },
  {
    "name": "role-legendary-deep",
    "group": "base",
    "type": "color",
    "description": "legendary, darker: the ramp's deep step"
  },
  {
    "name": "role-legendary-light",
    "group": "base",
    "type": "color",
    "description": "legendary, lighter: the ramp's gradient start"
  },
  {
    "name": "role-brand",
    "group": "base",
    "type": "color",
    "description": "Role brand: the --hue-* ramp under data-hue=\"brand\""
  },
  {
    "name": "role-brand-deep",
    "group": "base",
    "type": "color",
    "description": "brand, darker: the ramp's deep step"
  },
  {
    "name": "role-brand-light",
    "group": "base",
    "type": "color",
    "description": "brand, lighter: the ramp's gradient start"
  },
  {
    "name": "role-neutral",
    "group": "base",
    "type": "color",
    "description": "Role neutral: the --hue-* ramp under data-hue=\"neutral\""
  },
  {
    "name": "role-neutral-deep",
    "group": "base",
    "type": "color",
    "description": "neutral, darker: the ramp's deep step"
  },
  {
    "name": "role-neutral-light",
    "group": "base",
    "type": "color",
    "description": "neutral, lighter: the ramp's gradient start"
  },
  {
    "name": "font-sans",
    "group": "font",
    "type": "fontFamily",
    "description": "Sentences (the body voice)"
  },
  {
    "name": "font-display",
    "group": "font",
    "type": "fontFamily",
    "description": "Anything scanned: keys, titles, labels, captions (the body face unless a theme says otherwise)"
  },
  {
    "name": "font-numeric",
    "group": "font",
    "type": "fontFamily",
    "description": "Every number (always tabular)"
  },
  {
    "name": "font-mono",
    "group": "font",
    "type": "fontFamily",
    "description": "Codes and IDs a player might type"
  },
  {
    "name": "nk-scale",
    "group": "kit",
    "type": "number",
    "description": "UI size multiplier (players scale further, 0.85–1.25)"
  },
  {
    "name": "nk-density",
    "group": "kit",
    "type": "number",
    "description": "Spacing multiplier: 0.75 compact … 1.3 roomy"
  },
  {
    "name": "nk-space-1",
    "group": "kit",
    "type": "dimension",
    "description": "1 × the step"
  },
  {
    "name": "nk-space-2",
    "group": "kit",
    "type": "dimension",
    "description": "2 × the step"
  },
  {
    "name": "nk-space-3",
    "group": "kit",
    "type": "dimension",
    "description": "3 × the step"
  },
  {
    "name": "nk-space-4",
    "group": "kit",
    "type": "dimension",
    "description": "4 × the step"
  },
  {
    "name": "nk-space-6",
    "group": "kit",
    "type": "dimension",
    "description": "6 × the step"
  },
  {
    "name": "nk-space-8",
    "group": "kit",
    "type": "dimension",
    "description": "8 × the step"
  },
  {
    "name": "nk-space-unit",
    "group": "kit",
    "type": "dimension",
    "description": "The spacing step"
  },
  {
    "name": "nk-radius-key",
    "group": "kit",
    "type": "dimension",
    "description": "Keys and small tiles"
  },
  {
    "name": "nk-radius-chip",
    "group": "kit",
    "type": "dimension",
    "description": "Chips and badges"
  },
  {
    "name": "nk-radius-control",
    "group": "kit",
    "type": "dimension",
    "description": "Buttons, fields, rows, the keycap"
  },
  {
    "name": "nk-radius-surface",
    "group": "kit",
    "type": "dimension",
    "description": "Panels, sheets, dialogs"
  },
  {
    "name": "nk-height-key",
    "group": "kit",
    "type": "dimension",
    "description": "A key / small tile"
  },
  {
    "name": "nk-height-chip",
    "group": "kit",
    "type": "dimension",
    "description": "A chip / medium tile"
  },
  {
    "name": "nk-height-control",
    "group": "kit",
    "type": "dimension",
    "description": "Buttons and bar items / large tile"
  },
  {
    "name": "nk-height-row",
    "group": "kit",
    "type": "dimension",
    "description": "A list row"
  },
  {
    "name": "nk-height-field",
    "group": "kit",
    "type": "dimension",
    "description": "Text inputs, selects and dialog buttons"
  },
  {
    "name": "nk-icon-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Small icon"
  },
  {
    "name": "nk-icon-md",
    "group": "kit",
    "type": "dimension",
    "description": "Icon next to text (the default)"
  },
  {
    "name": "nk-icon-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Large icon"
  },
  {
    "name": "nk-icon-stroke",
    "group": "kit",
    "type": "number",
    "description": "Stroke width"
  },
  {
    "name": "nk-text-base",
    "group": "kit",
    "type": "dimension",
    "description": "Body size; every step derives from it"
  },
  {
    "name": "nk-text-key",
    "group": "kit",
    "type": "dimension",
    "description": "The scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-text-body",
    "group": "kit",
    "type": "dimension",
    "description": "Sentences"
  },
  {
    "name": "nk-text-label",
    "group": "kit",
    "type": "dimension",
    "description": "Labels and captions"
  },
  {
    "name": "nk-text-title",
    "group": "kit",
    "type": "dimension",
    "description": "Panel titles (≈ base × √ratio)"
  },
  {
    "name": "nk-text-section",
    "group": "kit",
    "type": "dimension",
    "description": "Section and sheet titles"
  },
  {
    "name": "nk-text-display",
    "group": "kit",
    "type": "dimension",
    "description": "Full-screen titles"
  },
  {
    "name": "nk-text-hud",
    "group": "kit",
    "type": "dimension",
    "description": "HUD values read in motion"
  },
  {
    "name": "nk-text-row",
    "group": "kit",
    "type": "dimension",
    "description": "A row or notice title (the label voice)"
  },
  {
    "name": "nk-text-desc",
    "group": "kit",
    "type": "dimension",
    "description": "A row or notice description (the body voice)"
  },
  {
    "name": "nk-leading-tight",
    "group": "kit",
    "type": "dimension",
    "description": "Small text: captions, labels, descriptions"
  },
  {
    "name": "nk-leading-normal",
    "group": "kit",
    "type": "dimension",
    "description": "Body-size text: rows, notices, slabs"
  },
  {
    "name": "nk-shape-skew",
    "group": "kit",
    "type": "number",
    "description": "The slant of faces (keys, the primary button, the selection; boxes and text stay upright): 0 = upright, at most ±20deg"
  },
  {
    "name": "nk-shape-slab",
    "group": "kit",
    "type": "number",
    "description": "Chips, badges and tags drawn as skewed slabs too (0deg = upright); at most ±20deg"
  },
  {
    "name": "nk-shape-cut",
    "group": "kit",
    "type": "dimension",
    "description": "Chamfered corners (top left, bottom right) as clip-path; 0 = off"
  },
  {
    "name": "nk-shape-stroke",
    "group": "kit",
    "type": "dimension",
    "description": "Hairline weight of plates, rims and fields"
  },
  {
    "name": "nk-type-ratio",
    "group": "kit",
    "type": "number",
    "description": "Step between type sizes: 1.125 calm … 1.333 dramatic"
  },
  {
    "name": "nk-type-weight-body",
    "group": "kit",
    "type": "number",
    "description": "Sentences"
  },
  {
    "name": "nk-type-weight-strong",
    "group": "kit",
    "type": "number",
    "description": "Captions, chips, slabs: text that must hold its own on the game"
  },
  {
    "name": "nk-type-weight-display",
    "group": "kit",
    "type": "number",
    "description": "Full-screen titles and big numbers"
  },
  {
    "name": "nk-type-tracking-display",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of full-screen titles"
  },
  {
    "name": "nk-type-tracking-label",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of captions"
  },
  {
    "name": "nk-type-case",
    "group": "kit",
    "type": "number",
    "description": "Anything scanned (keys, titles, labels, captions) in caps or as written"
  },
  {
    "name": "nk-type-slant",
    "group": "kit",
    "type": "number",
    "description": "The scanned voices upright or italic (a real italic where the face has one)"
  },
  {
    "name": "nk-type-overhang",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing pad of a slanted voice (the italic's overhang); 0em when upright"
  },
  {
    "name": "nk-type-scan-family",
    "group": "kit",
    "type": "fontFamily",
    "description": "Face of the scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-type-scan-style",
    "group": "kit",
    "type": "number",
    "description": "Slant of the scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-type-scan-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight of the scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-type-scan-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of the scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-type-scan-case",
    "group": "kit",
    "type": "number",
    "description": "Case of the scan voice (keys, buttons, tabs)"
  },
  {
    "name": "nk-type-scan-pad",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing pad of the scan voice (keys, buttons, tabs) (the italic overhang)"
  },
  {
    "name": "nk-type-title-family",
    "group": "kit",
    "type": "fontFamily",
    "description": "Face of the title voice (panel and row titles)"
  },
  {
    "name": "nk-type-title-style",
    "group": "kit",
    "type": "number",
    "description": "Slant of the title voice (panel and row titles)"
  },
  {
    "name": "nk-type-title-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight of the title voice (panel and row titles)"
  },
  {
    "name": "nk-type-title-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of the title voice (panel and row titles)"
  },
  {
    "name": "nk-type-title-case",
    "group": "kit",
    "type": "number",
    "description": "Case of the title voice (panel and row titles)"
  },
  {
    "name": "nk-type-title-pad",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing pad of the title voice (panel and row titles) (the italic overhang)"
  },
  {
    "name": "nk-type-label-family",
    "group": "kit",
    "type": "fontFamily",
    "description": "Face of the label voice (labels, row titles)"
  },
  {
    "name": "nk-type-label-style",
    "group": "kit",
    "type": "number",
    "description": "Slant of the label voice (labels, row titles)"
  },
  {
    "name": "nk-type-label-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight of the label voice (labels, row titles)"
  },
  {
    "name": "nk-type-label-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of the label voice (labels, row titles)"
  },
  {
    "name": "nk-type-label-case",
    "group": "kit",
    "type": "number",
    "description": "Case of the label voice (labels, row titles)"
  },
  {
    "name": "nk-type-label-pad",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing pad of the label voice (labels, row titles) (the italic overhang)"
  },
  {
    "name": "nk-type-num-family",
    "group": "kit",
    "type": "fontFamily",
    "description": "Face of the numeric voice"
  },
  {
    "name": "nk-type-num-style",
    "group": "kit",
    "type": "number",
    "description": "Slant of the numeric voice"
  },
  {
    "name": "nk-type-num-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight of the numeric voice"
  },
  {
    "name": "nk-type-num-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of the numeric voice"
  },
  {
    "name": "nk-type-num-case",
    "group": "kit",
    "type": "number",
    "description": "Case of the numeric voice"
  },
  {
    "name": "nk-type-num-pad",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing pad of the numeric voice (the italic overhang)"
  },
  {
    "name": "nk-type-body-family",
    "group": "kit",
    "type": "fontFamily",
    "description": "Face of the body voice (sentences)"
  },
  {
    "name": "nk-type-body-style",
    "group": "kit",
    "type": "number",
    "description": "Slant of the body voice (sentences)"
  },
  {
    "name": "nk-type-body-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight of the body voice (sentences)"
  },
  {
    "name": "nk-type-body-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing of the body voice (sentences)"
  },
  {
    "name": "nk-type-body-case",
    "group": "kit",
    "type": "number",
    "description": "Case of the body voice (sentences)"
  },
  {
    "name": "nk-surface-tint",
    "group": "kit",
    "type": "number",
    "description": "How much brand tints neutral surfaces"
  },
  {
    "name": "nk-surface-gradient",
    "group": "kit",
    "type": "number",
    "description": "Top-to-bottom light falloff (0 = flat)"
  },
  {
    "name": "nk-surface-elevation",
    "group": "kit",
    "type": "number",
    "description": "Shadow recipe: hard is a solid offset drop, no blur"
  },
  {
    "name": "nk-surface-glow",
    "group": "kit",
    "type": "number",
    "description": "Brand glow on active parts (alpha, 0 = off)"
  },
  {
    "name": "nk-surface-glow-budget",
    "group": "kit",
    "type": "number",
    "description": "How many parts may glow at once (0 = no limit)"
  },
  {
    "name": "nk-surface-backdrop",
    "group": "kit",
    "type": "number",
    "description": "Backdrop blur (FiveM draws it as a black box: off)"
  },
  {
    "name": "nk-surface-legibility",
    "group": "kit",
    "type": "number",
    "description": "day lifts surfaces for a bright sky; auto follows the game clock"
  },
  {
    "name": "nk-surface-legibility-lift",
    "group": "kit",
    "type": "number",
    "description": "How far day closes the gap to opaque"
  },
  {
    "name": "nk-surface-slash",
    "group": "kit",
    "type": "number",
    "description": "A decorative diagonal cut on menus"
  },
  {
    "name": "nk-material-hud-opacity",
    "group": "kit",
    "type": "number",
    "description": "Opacity of the hud material"
  },
  {
    "name": "nk-material-hud-texture",
    "group": "kit",
    "type": "number",
    "description": "Texture over the hud material"
  },
  {
    "name": "nk-material-menu-opacity",
    "group": "kit",
    "type": "number",
    "description": "Opacity of the menu material (floor 0.92 for text)"
  },
  {
    "name": "nk-material-menu-blur",
    "group": "kit",
    "type": "dimension",
    "description": "Backdrop blur behind menus (with surface.backdrop on)"
  },
  {
    "name": "nk-material-menu-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Corner radius of menus, sheets and dialogs"
  },
  {
    "name": "nk-material-menu-edge",
    "group": "kit",
    "type": "number",
    "description": "The machined top edge of menus (alpha)"
  },
  {
    "name": "nk-material-menu-texture",
    "group": "kit",
    "type": "number",
    "description": "Texture over the menu material"
  },
  {
    "name": "nk-hud-text",
    "group": "kit",
    "type": "number",
    "description": "Shadow under text drawn on the game (semantic depth.text draws it)"
  },
  {
    "name": "nk-motion",
    "group": "kit",
    "type": "number",
    "description": "1 = animations on, 0 = off (painted 0 under the player's reduced-motion pref)"
  },
  {
    "name": "nk-style-fill",
    "group": "kit",
    "type": "number",
    "description": "Fills, the selection face and levels: solid (flat, vivid) or soft (a tint)"
  },
  {
    "name": "nk-style-level",
    "group": "kit",
    "type": "number",
    "description": "How a level (0–1) is drawn by vitals, meters, holds"
  },
  {
    "name": "nk-style-hold",
    "group": "kit",
    "type": "number",
    "description": "How a press-and-hold shows its progress"
  },
  {
    "name": "nk-style-gauge",
    "group": "kit",
    "type": "number",
    "description": "How gauges are drawn"
  },
  {
    "name": "nk-style-focus",
    "group": "kit",
    "type": "number",
    "description": "Focus on parts that are not rows (rows and buttons light like hover)"
  },
  {
    "name": "nk-style-vital",
    "group": "kit",
    "type": "number",
    "description": "What a vital chip shows (expand: the tag opens on a change)"
  },
  {
    "name": "nk-style-vital-icon",
    "group": "kit",
    "type": "number",
    "description": "Vital icons: each vital's own colour, or the chip's ink"
  },
  {
    "name": "nk-style-vital-neighbours",
    "group": "kit",
    "type": "number",
    "description": "What a growing vital chip does to its neighbours"
  },
  {
    "name": "nk-style-pause",
    "group": "kit",
    "type": "number",
    "description": "The pause menu: a full-height sheet, or a light slash panel"
  },
  {
    "name": "nk-behavior-alert",
    "group": "kit",
    "type": "number",
    "description": "A level at or under this is an alert (vitals, durability)"
  },
  {
    "name": "nk-behavior-rest",
    "group": "kit",
    "type": "number",
    "description": "How long a changed HUD part stays open before it retracts (0 = never)"
  },
  {
    "name": "nk-behavior-notify-info",
    "group": "kit",
    "type": "number",
    "description": "How long an info notice stays"
  },
  {
    "name": "nk-behavior-notify-success",
    "group": "kit",
    "type": "number",
    "description": "How long a success notice stays"
  },
  {
    "name": "nk-behavior-notify-warning",
    "group": "kit",
    "type": "number",
    "description": "How long a warning stays"
  },
  {
    "name": "nk-behavior-notify-danger",
    "group": "kit",
    "type": "number",
    "description": "How long a danger notice stays"
  },
  {
    "name": "nk-hue-line",
    "group": "kit",
    "type": "number",
    "description": "A role's line (borders, tracks)"
  },
  {
    "name": "nk-hue-tint",
    "group": "kit",
    "type": "number",
    "description": "A role's tint (fills behind text)"
  },
  {
    "name": "nk-hue-glow",
    "group": "kit",
    "type": "number",
    "description": "A role's glow (under the glow budget)"
  },
  {
    "name": "nk-hue-alert",
    "group": "kit",
    "type": "number",
    "description": "A role's alert wash"
  },
  {
    "name": "nk-layer-dim",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: dim (a modal is the current surface + dim + dialog)"
  },
  {
    "name": "nk-layer-dialog",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: dialog (a modal is the current surface + dim + dialog)"
  },
  {
    "name": "nk-time-snap",
    "group": "kit",
    "type": "number",
    "description": "A press, a rim switching state (0.5d)"
  },
  {
    "name": "nk-time-fast",
    "group": "kit",
    "type": "number",
    "description": "Hover, a face rising, a deny beat (0.667d)"
  },
  {
    "name": "nk-time-base",
    "group": "kit",
    "type": "number",
    "description": "Panel enter, the selection tile, tab switch (d)"
  },
  {
    "name": "nk-time-slow",
    "group": "kit",
    "type": "number",
    "description": "Sheets, dialogs, a tile landing, toasts, a confirm pop (1.556d)"
  },
  {
    "name": "nk-time-fill",
    "group": "kit",
    "type": "number",
    "description": "A level filling or draining; HUD show-on-change (2.333d)"
  },
  {
    "name": "nk-time-exit",
    "group": "kit",
    "type": "number",
    "description": "Every exit (d × exit-factor)"
  },
  {
    "name": "nk-time-pulse",
    "group": "kit",
    "type": "number",
    "description": "One alert pulse"
  },
  {
    "name": "nk-ease-enter",
    "group": "kit",
    "type": "number",
    "description": "Anything arriving: enter, hover"
  },
  {
    "name": "nk-ease-exit",
    "group": "kit",
    "type": "number",
    "description": "Exits and things tucking away (speeds up as it leaves)"
  },
  {
    "name": "nk-ease-move",
    "group": "kit",
    "type": "number",
    "description": "On-screen moves: the selection tile, FLIP, a tab underline"
  },
  {
    "name": "nk-ease-expand",
    "group": "kit",
    "type": "number",
    "description": "Things opening and growing; full-screen enter"
  },
  {
    "name": "nk-ease-spring",
    "group": "kit",
    "type": "number",
    "description": "An overshoot without a spring (confirm pops, press release)"
  },
  {
    "name": "nk-ease-breathe",
    "group": "kit",
    "type": "number",
    "description": "Loops: alert pulses"
  },
  {
    "name": "nk-spring-snap",
    "group": "kit",
    "type": "number",
    "description": "Spring: selection, tab underline, needle catch-up"
  },
  {
    "name": "nk-spring-move",
    "group": "kit",
    "type": "number",
    "description": "Spring: toasts in, FLIP reflow, drawers, digit roll"
  },
  {
    "name": "nk-spring-soft",
    "group": "kit",
    "type": "number",
    "description": "Spring: full-screen content, large frame changes"
  },
  {
    "name": "nk-spring-pop",
    "group": "kit",
    "type": "number",
    "description": "Spring: rewards only"
  },
  {
    "name": "nk-stagger",
    "group": "kit",
    "type": "number",
    "description": "Delay per item"
  },
  {
    "name": "nk-gesture-lift",
    "group": "kit",
    "type": "dimension",
    "description": "A row's content and a slot sliding in on focus"
  },
  {
    "name": "nk-gesture-rise",
    "group": "kit",
    "type": "dimension",
    "description": "How far things rise as they enter"
  },
  {
    "name": "nk-gesture-land",
    "group": "kit",
    "type": "number",
    "description": "The scale a tile lands from"
  },
  {
    "name": "nk-gesture-deny",
    "group": "kit",
    "type": "dimension",
    "description": "The deny shake's distance"
  },
  {
    "name": "nk-gesture-press",
    "group": "kit",
    "type": "number",
    "description": "The scale of a pressed row or button"
  },
  {
    "name": "nk-gesture-confirm",
    "group": "kit",
    "type": "number",
    "description": "The short pop of a confirm"
  },
  {
    "name": "nk-plate-color",
    "group": "kit",
    "type": "color",
    "description": "The plate colour (drawn at its material's opacity through its channels)"
  },
  {
    "name": "nk-plate-hair",
    "group": "kit",
    "type": "color",
    "description": "The plate's hairline"
  },
  {
    "name": "nk-plate-drop",
    "group": "kit",
    "type": "number",
    "description": "The plate's drop: hard, no blur"
  },
  {
    "name": "nk-plate-bg",
    "group": "kit",
    "type": "color",
    "description": "The plate as drawn: its colour at the menu material's alpha"
  },
  {
    "name": "nk-plate-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The plate's radius"
  },
  {
    "name": "nk-fill-color",
    "group": "kit",
    "type": "color",
    "description": "The bar"
  },
  {
    "name": "nk-fill-track",
    "group": "kit",
    "type": "color",
    "description": "The track behind it"
  },
  {
    "name": "nk-fill-tint",
    "group": "kit",
    "type": "color",
    "description": "The soft tint: an outline button's hover, a row sweep"
  },
  {
    "name": "nk-fill-edge",
    "group": "kit",
    "type": "color",
    "description": "The bar's leading 1px edge"
  },
  {
    "name": "nk-fill-alert",
    "group": "kit",
    "type": "color",
    "description": "The bar at or under behavior.alert"
  },
  {
    "name": "nk-fill-height",
    "group": "kit",
    "type": "dimension",
    "description": "A level bar's thickness: fills, meters, gauge tracks"
  },
  {
    "name": "nk-accent-paint",
    "group": "kit",
    "type": "color",
    "description": "An active tile's face, the speedometer's level, the compass N (a colour or a gradient)"
  },
  {
    "name": "nk-accent-from",
    "group": "kit",
    "type": "color",
    "description": "First stop (SVG strokes)"
  },
  {
    "name": "nk-accent-via",
    "group": "kit",
    "type": "color",
    "description": "Middle stop"
  },
  {
    "name": "nk-accent-to",
    "group": "kit",
    "type": "color",
    "description": "Last stop"
  },
  {
    "name": "nk-gap-cluster",
    "group": "kit",
    "type": "dimension",
    "description": "Icon + text, key + label"
  },
  {
    "name": "nk-gap-items",
    "group": "kit",
    "type": "dimension",
    "description": "Items in a bar"
  },
  {
    "name": "nk-gap-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding of anything labelled"
  },
  {
    "name": "nk-gap-surface",
    "group": "kit",
    "type": "dimension",
    "description": "Padding of a surface (dialog body, sheet column)"
  },
  {
    "name": "nk-line-width",
    "group": "kit",
    "type": "dimension",
    "description": "Every hairline"
  },
  {
    "name": "nk-line-focus",
    "group": "kit",
    "type": "color",
    "description": "A text field's caret rim (and a checkbox's or switch's lit rim): the only focus line"
  },
  {
    "name": "nk-line-clip",
    "group": "kit",
    "type": "number",
    "description": "clip-path of panels: the shape.cut chamfer, or none"
  },
  {
    "name": "nk-line-clip-sm",
    "group": "kit",
    "type": "number",
    "description": "clip-path of chips, tiles and buttons: half the chamfer"
  },
  {
    "name": "nk-line-glow",
    "group": "kit",
    "type": "dimension",
    "description": "Blur radius of a row's glow (a chip's is 0.75 of it, a meter's 0.625)"
  },
  {
    "name": "nk-depth-elevation",
    "group": "kit",
    "type": "number",
    "description": "The box-shadow surface.elevation names (compileTheme writes the recipe)"
  },
  {
    "name": "nk-depth-text",
    "group": "kit",
    "type": "number",
    "description": "The text-shadow hud.text names (compileTheme writes the recipe)"
  },
  {
    "name": "nk-alpha-day",
    "group": "kit",
    "type": "number",
    "description": "1 while day legibility applies (set by kit.css rules)"
  },
  {
    "name": "nk-alpha-hud",
    "group": "kit",
    "type": "number",
    "description": "The HUD's alpha"
  },
  {
    "name": "nk-alpha-menu",
    "group": "kit",
    "type": "number",
    "description": "Menus', sheets' and dialogs' alpha"
  },
  {
    "name": "nk-restore-muted-foreground",
    "group": "kit",
    "type": "color",
    "description": "muted-foreground, as the theme set it"
  },
  {
    "name": "nk-restore-muted-foreground-rgb",
    "group": "kit",
    "type": "number",
    "description": "Its channels"
  },
  {
    "name": "nk-restore-muted-foreground-a",
    "group": "kit",
    "type": "number",
    "description": "Its alpha"
  },
  {
    "name": "nk-restore-background",
    "group": "kit",
    "type": "color",
    "description": "background, as the theme set it"
  },
  {
    "name": "nk-restore-background-rgb",
    "group": "kit",
    "type": "number",
    "description": "Its channels"
  },
  {
    "name": "nk-restore-background-a",
    "group": "kit",
    "type": "number",
    "description": "Its alpha"
  },
  {
    "name": "nk-screen-ratio",
    "group": "kit",
    "type": "number",
    "description": "The content box's width / height (wider screens keep it, centred)"
  },
  {
    "name": "nk-screen-max",
    "group": "kit",
    "type": "dimension",
    "description": "The content box's width"
  },
  {
    "name": "nk-screen-edge",
    "group": "kit",
    "type": "dimension",
    "description": "A zone's distance from the safe area (1rem at 4:3, 1.25rem at 16:10)"
  },
  {
    "name": "nk-screen-scale-min",
    "group": "kit",
    "type": "number",
    "description": "The rem floor as a fraction of the 1080p rem (720p and 4:3 stay readable)"
  },
  {
    "name": "nk-screen-area-l",
    "group": "kit",
    "type": "dimension",
    "description": "The box's left inset from the screen"
  },
  {
    "name": "nk-screen-area-r",
    "group": "kit",
    "type": "dimension",
    "description": "The box's right inset"
  },
  {
    "name": "nk-screen-area-t",
    "group": "kit",
    "type": "dimension",
    "description": "The box's top inset"
  },
  {
    "name": "nk-screen-area-b",
    "group": "kit",
    "type": "dimension",
    "description": "The box's bottom inset"
  },
  {
    "name": "nk-screen-safe-x",
    "group": "kit",
    "type": "dimension",
    "description": "A safe area inside the box, inline (TV overscan, a bezel)"
  },
  {
    "name": "nk-screen-safe-y",
    "group": "kit",
    "type": "dimension",
    "description": "A safe area inside the box, block"
  },
  {
    "name": "nk-zone-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between what a zone stacks"
  },
  {
    "name": "nk-region-max",
    "group": "kit",
    "type": "dimension",
    "description": "Its maximum width"
  },
  {
    "name": "nk-region-pad",
    "group": "kit",
    "type": "dimension",
    "description": "Its padding"
  },
  {
    "name": "nk-grid-cell",
    "group": "kit",
    "type": "dimension",
    "description": "A cell's size"
  },
  {
    "name": "nk-grid-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between cells"
  },
  {
    "name": "nk-control-plate-color",
    "group": "kit",
    "type": "color",
    "description": "The solid plate behind the face"
  },
  {
    "name": "nk-control-plate-dim",
    "group": "kit",
    "type": "color",
    "description": "The plate on the HUD"
  },
  {
    "name": "nk-control-plate-x",
    "group": "kit",
    "type": "dimension",
    "description": "How far the plate sits right of the face (0 = none)"
  },
  {
    "name": "nk-control-plate-y",
    "group": "kit",
    "type": "dimension",
    "description": "How far the plate sits below the face (0 = none)"
  },
  {
    "name": "nk-control-plate-press",
    "group": "kit",
    "type": "dimension",
    "description": "How far a held tile presses toward its plate"
  },
  {
    "name": "nk-control-wall-height",
    "group": "kit",
    "type": "dimension",
    "description": "How far the face sits above its wall (0 = flat; the primary button, the selection)"
  },
  {
    "name": "nk-control-wall-shade",
    "group": "kit",
    "type": "number",
    "description": "How dark the wall is (the scrim over the face colour)"
  },
  {
    "name": "nk-control-face-color",
    "group": "kit",
    "type": "color",
    "description": "The face"
  },
  {
    "name": "nk-control-face-ink",
    "group": "kit",
    "type": "color",
    "description": "The legend's colour on the face"
  },
  {
    "name": "nk-control-face-light",
    "group": "kit",
    "type": "color",
    "description": "The face's top hairline (transparent = flat)"
  },
  {
    "name": "nk-control-face-shade",
    "group": "kit",
    "type": "color",
    "description": "The face's bottom inner shade"
  },
  {
    "name": "nk-control-face-rim",
    "group": "kit",
    "type": "color",
    "description": "The face's rim"
  },
  {
    "name": "nk-control-face-rim-focus",
    "group": "kit",
    "type": "color",
    "description": "The rim while lit"
  },
  {
    "name": "nk-control-face-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The face's radius"
  },
  {
    "name": "nk-control-face-skew",
    "group": "kit",
    "type": "number",
    "description": "The face's slant (the box stays upright)"
  },
  {
    "name": "nk-control-face-shadow",
    "group": "kit",
    "type": "number",
    "description": "The face's inner light and shade"
  },
  {
    "name": "nk-control-face-clip",
    "group": "kit",
    "type": "number",
    "description": "The face's clip-path (the chamfer)"
  },
  {
    "name": "nk-control-face-confirm",
    "group": "kit",
    "type": "color",
    "description": "The face when confirmed"
  },
  {
    "name": "nk-control-face-confirm-ink",
    "group": "kit",
    "type": "color",
    "description": "The legend when confirmed"
  },
  {
    "name": "nk-control-face-active",
    "group": "kit",
    "type": "color",
    "description": "The face of an active tile (the mic while talking, N on the compass, a checked box)"
  },
  {
    "name": "nk-control-face-hold",
    "group": "kit",
    "type": "color",
    "description": "The hold fill over the face"
  },
  {
    "name": "nk-control-legend-font",
    "group": "kit",
    "type": "fontFamily",
    "description": "The legend's face"
  },
  {
    "name": "nk-control-legend-weight",
    "group": "kit",
    "type": "number",
    "description": "The legend's weight"
  },
  {
    "name": "nk-control-legend-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The italic overhang split to both sides"
  },
  {
    "name": "nk-control-legend-shift",
    "group": "kit",
    "type": "dimension",
    "description": "A nudge for a leaning face"
  },
  {
    "name": "nk-control-legend-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between a tile's glyphs"
  },
  {
    "name": "nk-control-legend-inset",
    "group": "kit",
    "type": "dimension",
    "description": "The legend's inline padding"
  },
  {
    "name": "nk-control-tag-delay",
    "group": "kit",
    "type": "number",
    "description": "The tag opens this long after the tile lands"
  },
  {
    "name": "nk-control-primary-color",
    "group": "kit",
    "type": "color",
    "description": "The keycap face under style.fill solid (the primary button, the lit row, the active tab)"
  },
  {
    "name": "nk-control-primary-ink",
    "group": "kit",
    "type": "color",
    "description": "Text on the keycap face"
  },
  {
    "name": "nk-control-primary-rim",
    "group": "kit",
    "type": "color",
    "description": "The keycap face's rim (transparent = none)"
  },
  {
    "name": "nk-control-primary-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The keycap's radius"
  },
  {
    "name": "nk-control-primary-tint",
    "group": "kit",
    "type": "number",
    "description": "The face's opacity under style.fill soft"
  },
  {
    "name": "nk-control-primary-inset",
    "group": "kit",
    "type": "dimension",
    "description": "How far a selection tile sits in from its item's sides (room for the skew)"
  },
  {
    "name": "nk-control-primary-lift",
    "group": "kit",
    "type": "dimension",
    "description": "How far the face rises on hover and focus"
  },
  {
    "name": "nk-control-primary-press",
    "group": "kit",
    "type": "number",
    "description": "How far a pressed keycap sinks, as a fraction of its wall"
  },
  {
    "name": "nk-control-primary-overhang",
    "group": "kit",
    "type": "dimension",
    "description": "How far a row's selection tile reaches past its text"
  },
  {
    "name": "nk-panel-bg",
    "group": "kit",
    "type": "color",
    "description": "The panel's fill: the surface at the menu material's alpha"
  },
  {
    "name": "nk-panel-fg",
    "group": "kit",
    "type": "color",
    "description": "Text in the panel"
  },
  {
    "name": "nk-panel-border",
    "group": "kit",
    "type": "color",
    "description": "The panel's hairline"
  },
  {
    "name": "nk-panel-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The panel's radius"
  },
  {
    "name": "nk-panel-blur",
    "group": "kit",
    "type": "dimension",
    "description": "Backdrop blur (with surface.backdrop on)"
  },
  {
    "name": "nk-panel-cut",
    "group": "kit",
    "type": "dimension",
    "description": "The chamfer's size"
  },
  {
    "name": "nk-panel-clip",
    "group": "kit",
    "type": "number",
    "description": "The panel's clip-path"
  },
  {
    "name": "nk-panel-gradient",
    "group": "kit",
    "type": "number",
    "description": "The light falloff"
  },
  {
    "name": "nk-panel-edge",
    "group": "kit",
    "type": "number",
    "description": "The machined top edge"
  },
  {
    "name": "nk-panel-shadow",
    "group": "kit",
    "type": "number",
    "description": "The panel's drop: the elevation recipe"
  },
  {
    "name": "nk-panel-divider",
    "group": "kit",
    "type": "number",
    "description": "The one hairline under a header"
  },
  {
    "name": "nk-panel-width",
    "group": "kit",
    "type": "dimension",
    "description": "Width (md)"
  },
  {
    "name": "nk-panel-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Width (sm)"
  },
  {
    "name": "nk-panel-width-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Width (lg)"
  },
  {
    "name": "nk-panel-header-height",
    "group": "kit",
    "type": "dimension",
    "description": "A header's minimum height"
  },
  {
    "name": "nk-panel-header-padding",
    "group": "kit",
    "type": "number",
    "description": "Surface padding; the title a step off its hairline"
  },
  {
    "name": "nk-panel-title-size",
    "group": "kit",
    "type": "dimension",
    "description": "A panel title's size"
  },
  {
    "name": "nk-panel-body-padding",
    "group": "kit",
    "type": "number",
    "description": "The body's padding"
  },
  {
    "name": "nk-panel-footer-padding",
    "group": "kit",
    "type": "number",
    "description": "On the panel itself, no rule above it"
  },
  {
    "name": "nk-panel-footer-rule",
    "group": "kit",
    "type": "number",
    "description": "A rule above the footer (none: spacing separates it)"
  },
  {
    "name": "nk-panel-actions-bracket",
    "group": "kit",
    "type": "dimension",
    "description": "L-shaped corner marks (0 = off)"
  },
  {
    "name": "nk-panel-actions-bracket-width",
    "group": "kit",
    "type": "dimension",
    "description": "The marks' weight"
  },
  {
    "name": "nk-panel-actions-bracket-color",
    "group": "kit",
    "type": "color",
    "description": "The marks' colour"
  },
  {
    "name": "nk-display-size",
    "group": "kit",
    "type": "dimension",
    "description": "Size"
  },
  {
    "name": "nk-display-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight"
  },
  {
    "name": "nk-display-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing"
  },
  {
    "name": "nk-display-case",
    "group": "kit",
    "type": "number",
    "description": "Case"
  },
  {
    "name": "nk-caption-font",
    "group": "kit",
    "type": "number",
    "description": "Face"
  },
  {
    "name": "nk-caption-size",
    "group": "kit",
    "type": "dimension",
    "description": "Size"
  },
  {
    "name": "nk-caption-weight",
    "group": "kit",
    "type": "number",
    "description": "Weight"
  },
  {
    "name": "nk-caption-case",
    "group": "kit",
    "type": "number",
    "description": "Case"
  },
  {
    "name": "nk-caption-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "Letter-spacing"
  },
  {
    "name": "nk-row-height",
    "group": "kit",
    "type": "dimension",
    "description": "A single-line row's minimum height"
  },
  {
    "name": "nk-row-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The row's radius"
  },
  {
    "name": "nk-row-clip",
    "group": "kit",
    "type": "number",
    "description": "The row's clip-path"
  },
  {
    "name": "nk-row-pad-y",
    "group": "kit",
    "type": "dimension",
    "description": "Block padding"
  },
  {
    "name": "nk-row-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding"
  },
  {
    "name": "nk-row-padding",
    "group": "kit",
    "type": "number",
    "description": "Both paddings"
  },
  {
    "name": "nk-row-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the icon tile, the text and the trail"
  },
  {
    "name": "nk-row-font-size",
    "group": "kit",
    "type": "dimension",
    "description": "The row's text size"
  },
  {
    "name": "nk-row-accent",
    "group": "kit",
    "type": "color",
    "description": "The colour that marks the active row or slot (an outline, a hold ring)"
  },
  {
    "name": "nk-row-icon-box",
    "group": "kit",
    "type": "dimension",
    "description": "The icon tile beside the title (the icon inside is icon.md)"
  },
  {
    "name": "nk-row-bar-width",
    "group": "kit",
    "type": "dimension",
    "description": "The focus bar's width (style.focus: bar)"
  },
  {
    "name": "nk-list-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between items: the wall plus breathing room"
  },
  {
    "name": "nk-list-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding: room for the tile's inset and skew"
  },
  {
    "name": "nk-menu-row-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between a trail's controls"
  },
  {
    "name": "nk-menu-row-image-size",
    "group": "kit",
    "type": "dimension",
    "description": "An image's box"
  },
  {
    "name": "nk-menu-row-progress-height",
    "group": "kit",
    "type": "dimension",
    "description": "The progress bar's height"
  },
  {
    "name": "nk-menu-row-details-width",
    "group": "kit",
    "type": "dimension",
    "description": "The details flyout's width"
  },
  {
    "name": "nk-menu-row-value-width",
    "group": "kit",
    "type": "dimension",
    "description": "The value column's minimum width"
  },
  {
    "name": "nk-selection-time",
    "group": "kit",
    "type": "number",
    "description": "How long the tile glides"
  },
  {
    "name": "nk-selection-ease",
    "group": "kit",
    "type": "number",
    "description": "The glide's curve"
  },
  {
    "name": "nk-field-marker-height",
    "group": "kit",
    "type": "dimension",
    "description": "The marker the caret reads its box from: a line's height"
  },
  {
    "name": "nk-field-marker-drop",
    "group": "kit",
    "type": "dimension",
    "description": "How far the marker sits below the baseline"
  },
  {
    "name": "nk-field-caret-color",
    "group": "kit",
    "type": "color",
    "description": "The drawn caret"
  },
  {
    "name": "nk-field-caret-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The drawn caret's corners"
  },
  {
    "name": "nk-field-caret-blink",
    "group": "kit",
    "type": "number",
    "description": "One breath of the caret at rest"
  },
  {
    "name": "nk-field-caret-blink-delay",
    "group": "kit",
    "type": "number",
    "description": "How long the caret stays solid after typing or moving"
  },
  {
    "name": "nk-field-caret-blink-dim",
    "group": "kit",
    "type": "number",
    "description": "The caret's opacity at the bottom of its breath"
  },
  {
    "name": "nk-field-caret-width",
    "group": "kit",
    "type": "dimension",
    "description": "The drawn caret's width"
  },
  {
    "name": "nk-field-caret-time",
    "group": "kit",
    "type": "number",
    "description": "The caret's glide"
  },
  {
    "name": "nk-field-caret-ease",
    "group": "kit",
    "type": "number",
    "description": "The caret's curve"
  },
  {
    "name": "nk-field-mirror-rise",
    "group": "kit",
    "type": "dimension",
    "description": "How far a typed character rises in"
  },
  {
    "name": "nk-field-mirror-in",
    "group": "kit",
    "type": "number",
    "description": "A typed character's entrance"
  },
  {
    "name": "nk-field-mirror-out",
    "group": "kit",
    "type": "number",
    "description": "A deleted character's exit"
  },
  {
    "name": "nk-form-field-label-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the name and its required mark"
  },
  {
    "name": "nk-form-field-label-size",
    "group": "kit",
    "type": "dimension",
    "description": "The label's size"
  },
  {
    "name": "nk-form-field-label-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The label's line height over a control"
  },
  {
    "name": "nk-form-field-label-leading-row",
    "group": "kit",
    "type": "dimension",
    "description": "The label's line height beside a control (checkbox, switch)"
  },
  {
    "name": "nk-form-field-hint-size",
    "group": "kit",
    "type": "dimension",
    "description": "The hint's size"
  },
  {
    "name": "nk-form-field-hint-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The hint's line height"
  },
  {
    "name": "nk-form-field-hint-color",
    "group": "kit",
    "type": "color",
    "description": "The hint's ink"
  },
  {
    "name": "nk-form-field-end-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the reset button and the value"
  },
  {
    "name": "nk-form-field-value-size",
    "group": "kit",
    "type": "dimension",
    "description": "The value text's size"
  },
  {
    "name": "nk-form-field-value-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The value text's line height"
  },
  {
    "name": "nk-form-field-value-color",
    "group": "kit",
    "type": "color",
    "description": "The value text's ink"
  },
  {
    "name": "nk-form-field-row-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the control, the label and the hint on a row (checkbox, switch)"
  },
  {
    "name": "nk-form-field-row-height",
    "group": "kit",
    "type": "dimension",
    "description": "A row's minimum height, so an icon-xs button never moves it"
  },
  {
    "name": "nk-form-field-trail-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the value and the control at a switch row's end"
  },
  {
    "name": "nk-form-field-control-height",
    "group": "kit",
    "type": "dimension",
    "description": "A segmented control's height (date, time)"
  },
  {
    "name": "nk-form-field-control-size",
    "group": "kit",
    "type": "dimension",
    "description": "A segmented control's text size"
  },
  {
    "name": "nk-form-field-control-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between a segmented control's parts"
  },
  {
    "name": "nk-form-field-control-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "A segmented control's inline padding"
  },
  {
    "name": "nk-form-field-control-pad-x-dense",
    "group": "kit",
    "type": "dimension",
    "description": "The same, dense (a range)"
  },
  {
    "name": "nk-form-field-control-affix-password",
    "group": "kit",
    "type": "dimension",
    "description": "Room at a password field's end for the reveal button"
  },
  {
    "name": "nk-form-field-control-affix-stepper",
    "group": "kit",
    "type": "dimension",
    "description": "Room at a number field's end for the inline stepper"
  },
  {
    "name": "nk-form-field-icon-size",
    "group": "kit",
    "type": "dimension",
    "description": "A control's leading icon"
  },
  {
    "name": "nk-form-field-icon-color",
    "group": "kit",
    "type": "color",
    "description": "A control's leading icon ink"
  },
  {
    "name": "nk-form-field-icon-inset",
    "group": "kit",
    "type": "dimension",
    "description": "How far a text or number field's icon sits from its start"
  },
  {
    "name": "nk-form-field-icon-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between a segmented control's icon and its first segment"
  },
  {
    "name": "nk-form-field-icon-pad",
    "group": "kit",
    "type": "dimension",
    "description": "A text or number field's start padding when it has an icon"
  },
  {
    "name": "nk-form-field-stepper-inset",
    "group": "kit",
    "type": "dimension",
    "description": "How far the inline stepper sits from the field's end"
  },
  {
    "name": "nk-form-field-stepper-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the stepper's two buttons"
  },
  {
    "name": "nk-form-field-reveal-inset",
    "group": "kit",
    "type": "dimension",
    "description": "How far the password reveal button sits from the field's end"
  },
  {
    "name": "nk-form-field-segment-sep",
    "group": "kit",
    "type": "color",
    "description": "A segmented control's separators (/ : -)"
  },
  {
    "name": "nk-form-field-meridiem-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the time segments and AM / PM"
  },
  {
    "name": "nk-form-field-meridiem-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "The AM / PM button's inline padding"
  },
  {
    "name": "nk-form-field-meridiem-size",
    "group": "kit",
    "type": "dimension",
    "description": "The AM / PM text size"
  },
  {
    "name": "nk-form-field-meridiem-weight",
    "group": "kit",
    "type": "number",
    "description": "The AM / PM weight"
  },
  {
    "name": "nk-form-field-meridiem-color",
    "group": "kit",
    "type": "color",
    "description": "The AM / PM ink at rest"
  },
  {
    "name": "nk-form-field-clear-size",
    "group": "kit",
    "type": "dimension",
    "description": "The clear button's box"
  },
  {
    "name": "nk-form-field-clear-bleed",
    "group": "kit",
    "type": "dimension",
    "description": "How far it reaches into the control's padding"
  },
  {
    "name": "nk-form-field-clear-color",
    "group": "kit",
    "type": "color",
    "description": "The clear button's ink"
  },
  {
    "name": "nk-form-field-date-picker-size",
    "group": "kit",
    "type": "dimension",
    "description": "The calendar button's box"
  },
  {
    "name": "nk-form-field-date-picker-bleed",
    "group": "kit",
    "type": "dimension",
    "description": "How far it reaches into the control's padding"
  },
  {
    "name": "nk-form-field-date-picker-color",
    "group": "kit",
    "type": "color",
    "description": "The calendar button's ink"
  },
  {
    "name": "nk-form-field-date-picker-cell",
    "group": "kit",
    "type": "dimension",
    "description": "A day, year or decade cell (the grid is seven cells wide)"
  },
  {
    "name": "nk-form-field-date-picker-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The popover's padding"
  },
  {
    "name": "nk-form-field-date-picker-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the popover's header and grid"
  },
  {
    "name": "nk-form-field-date-picker-step",
    "group": "kit",
    "type": "dimension",
    "description": "Between the header's buttons and between year and decade cells"
  },
  {
    "name": "nk-form-field-swatch-size",
    "group": "kit",
    "type": "dimension",
    "description": "The colour field's preview swatch"
  },
  {
    "name": "nk-form-field-swatch-inset",
    "group": "kit",
    "type": "dimension",
    "description": "How far the preview swatch sits from the field's start"
  },
  {
    "name": "nk-form-field-swatch-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The colour field's start padding (room for the swatch)"
  },
  {
    "name": "nk-form-field-swatch-empty",
    "group": "kit",
    "type": "number",
    "description": "The preview swatch while no colour is set"
  },
  {
    "name": "nk-form-field-swatches-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between preset swatches"
  },
  {
    "name": "nk-form-field-swatches-size",
    "group": "kit",
    "type": "dimension",
    "description": "A preset swatch's box"
  },
  {
    "name": "nk-form-field-description-size",
    "group": "kit",
    "type": "dimension",
    "description": "The description's size"
  },
  {
    "name": "nk-form-field-description-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The description's line height"
  },
  {
    "name": "nk-form-field-description-color",
    "group": "kit",
    "type": "color",
    "description": "The description's ink"
  },
  {
    "name": "nk-form-field-description-indent",
    "group": "kit",
    "type": "dimension",
    "description": "Its start inset under a checkbox row (aligned with the label)"
  },
  {
    "name": "nk-form-field-error-size",
    "group": "kit",
    "type": "dimension",
    "description": "The error's size"
  },
  {
    "name": "nk-form-field-error-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The error's line height"
  },
  {
    "name": "nk-form-field-error-color",
    "group": "kit",
    "type": "color",
    "description": "The error's ink"
  },
  {
    "name": "nk-form-field-error-indent",
    "group": "kit",
    "type": "dimension",
    "description": "Its start inset under a checkbox row (aligned with the label)"
  },
  {
    "name": "nk-stepper-delay",
    "group": "kit",
    "type": "number",
    "description": "The first repeat of a held keycap"
  },
  {
    "name": "nk-stepper-rate",
    "group": "kit",
    "type": "number",
    "description": "Then one repeat every"
  },
  {
    "name": "nk-notice-width",
    "group": "kit",
    "type": "dimension",
    "description": "Width (md)"
  },
  {
    "name": "nk-notice-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Width (sm)"
  },
  {
    "name": "nk-notice-width-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Width (lg)"
  },
  {
    "name": "nk-confirm-width",
    "group": "kit",
    "type": "dimension",
    "description": "Width (md)"
  },
  {
    "name": "nk-confirm-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Width (sm)"
  },
  {
    "name": "nk-confirm-width-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Width (lg)"
  },
  {
    "name": "nk-edge-sheet-header-height",
    "group": "kit",
    "type": "dimension",
    "description": "The header's minimum height"
  },
  {
    "name": "nk-dialog-shell-width",
    "group": "kit",
    "type": "dimension",
    "description": "Width (md)"
  },
  {
    "name": "nk-dialog-shell-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Width (sm)"
  },
  {
    "name": "nk-dialog-shell-width-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Width (lg)"
  },
  {
    "name": "nk-dialog-shell-top",
    "group": "kit",
    "type": "dimension",
    "description": "Where a top dialog anchors"
  },
  {
    "name": "nk-dialog-shell-header-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the title and the description"
  },
  {
    "name": "nk-dialog-shell-header-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding"
  },
  {
    "name": "nk-dialog-shell-header-pad-y",
    "group": "kit",
    "type": "dimension",
    "description": "Block padding"
  },
  {
    "name": "nk-dialog-shell-body-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The body's padding"
  },
  {
    "name": "nk-dialog-shell-footer-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the hints and the buttons"
  },
  {
    "name": "nk-dialog-shell-footer-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding"
  },
  {
    "name": "nk-dialog-shell-footer-pad-y",
    "group": "kit",
    "type": "dimension",
    "description": "Block padding"
  },
  {
    "name": "nk-dialog-shell-footer-bleed",
    "group": "kit",
    "type": "dimension",
    "description": "How far the hints reach back into the padding (the first item's own inset lines up with the title)"
  },
  {
    "name": "nk-empty-state-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the header and the actions (panel size)"
  },
  {
    "name": "nk-empty-state-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The panel size's padding"
  },
  {
    "name": "nk-empty-state-gap-screen",
    "group": "kit",
    "type": "dimension",
    "description": "Between the header and the actions (screen size)"
  },
  {
    "name": "nk-empty-state-pad-screen",
    "group": "kit",
    "type": "dimension",
    "description": "The screen size's padding, and the panel's from a medium viewport up"
  },
  {
    "name": "nk-empty-state-header-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the icon, the title and the description"
  },
  {
    "name": "nk-empty-state-icon-box",
    "group": "kit",
    "type": "dimension",
    "description": "The icon's box (panel size, no tile)"
  },
  {
    "name": "nk-empty-state-icon-box-screen",
    "group": "kit",
    "type": "dimension",
    "description": "The icon's box (screen size, no tile)"
  },
  {
    "name": "nk-empty-state-icon-glyph",
    "group": "kit",
    "type": "dimension",
    "description": "The glyph inside the box"
  },
  {
    "name": "nk-empty-state-icon-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Under the icon"
  },
  {
    "name": "nk-empty-state-icon-ink",
    "group": "kit",
    "type": "color",
    "description": "The icon's ink"
  },
  {
    "name": "nk-empty-state-icon-ink-error",
    "group": "kit",
    "type": "color",
    "description": "The icon's ink on an error"
  },
  {
    "name": "nk-empty-state-icon-tint-error",
    "group": "kit",
    "type": "color",
    "description": "The icon box's fill on an error"
  },
  {
    "name": "nk-empty-state-title-size-screen",
    "group": "kit",
    "type": "dimension",
    "description": "The title's size at screen size (the panel size takes the panel title)"
  },
  {
    "name": "nk-empty-state-description-size",
    "group": "kit",
    "type": "dimension",
    "description": "The description's size"
  },
  {
    "name": "nk-empty-state-description-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The description's line height"
  },
  {
    "name": "nk-empty-state-actions-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between actions"
  },
  {
    "name": "nk-radial-menu-size",
    "group": "kit",
    "type": "dimension",
    "description": "The wheel's diameter (the size prop overrides it)"
  },
  {
    "name": "nk-radial-menu-disabled-opacity",
    "group": "kit",
    "type": "number",
    "description": "A disabled wedge or item"
  },
  {
    "name": "nk-radial-menu-wedge-stroke",
    "group": "kit",
    "type": "number",
    "description": "A wedge's rim, in the wheel's 100-unit drawing (the wedge path insets by the same amount)"
  },
  {
    "name": "nk-radial-menu-indicator-stroke",
    "group": "kit",
    "type": "number",
    "description": "The lit wedge's rim, in drawing units"
  },
  {
    "name": "nk-radial-menu-item-width",
    "group": "kit",
    "type": "dimension",
    "description": "An item's width, a share of the wheel"
  },
  {
    "name": "nk-radial-menu-item-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between an item's icon and label"
  },
  {
    "name": "nk-radial-menu-item-icon",
    "group": "kit",
    "type": "dimension",
    "description": "An item's icon"
  },
  {
    "name": "nk-radial-menu-label-size",
    "group": "kit",
    "type": "dimension",
    "description": "An item's label and the centre's second line"
  },
  {
    "name": "nk-radial-menu-label-leading",
    "group": "kit",
    "type": "dimension",
    "description": "An item's label and the centre's second line: their line height"
  },
  {
    "name": "nk-radial-menu-label-weight",
    "group": "kit",
    "type": "number",
    "description": "An item's label weight"
  },
  {
    "name": "nk-radial-menu-dot-size",
    "group": "kit",
    "type": "dimension",
    "description": "The mark on an item that opens a submenu"
  },
  {
    "name": "nk-radial-menu-dot-opacity",
    "group": "kit",
    "type": "number",
    "description": "The submenu mark's opacity"
  },
  {
    "name": "nk-radial-menu-center-width",
    "group": "kit",
    "type": "dimension",
    "description": "The centre button's width, a share of the wheel"
  },
  {
    "name": "nk-radial-menu-center-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The centre button's padding"
  },
  {
    "name": "nk-radial-menu-center-icon",
    "group": "kit",
    "type": "dimension",
    "description": "The back or close icon"
  },
  {
    "name": "nk-radial-menu-title-size",
    "group": "kit",
    "type": "dimension",
    "description": "The centre's first line"
  },
  {
    "name": "nk-radial-menu-title-leading",
    "group": "kit",
    "type": "dimension",
    "description": "The centre's first line height"
  },
  {
    "name": "nk-radial-menu-title-weight",
    "group": "kit",
    "type": "number",
    "description": "The centre's first line weight"
  },
  {
    "name": "nk-selection-tabs-list-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between triggers: a lit tile never touches its neighbour"
  },
  {
    "name": "nk-selection-tabs-list-rest",
    "group": "kit",
    "type": "dimension",
    "description": "Room under the triggers besides the tile's wall"
  },
  {
    "name": "nk-selection-tabs-trigger-height",
    "group": "kit",
    "type": "dimension",
    "description": "A trigger's minimum height"
  },
  {
    "name": "nk-selection-tabs-trigger-pad-x",
    "group": "kit",
    "type": "dimension",
    "description": "A trigger's inline padding"
  },
  {
    "name": "nk-chip-height",
    "group": "kit",
    "type": "dimension",
    "description": "Height"
  },
  {
    "name": "nk-chip-square-size",
    "group": "kit",
    "type": "dimension",
    "description": "A tile chip's box"
  },
  {
    "name": "nk-chip-padding",
    "group": "kit",
    "type": "dimension",
    "description": "Inline padding"
  },
  {
    "name": "nk-chip-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Radius"
  },
  {
    "name": "nk-chip-hud-radius",
    "group": "kit",
    "type": "dimension",
    "description": "A square HUD tile's radius (hotbar, target eye)"
  },
  {
    "name": "nk-chip-bg",
    "group": "kit",
    "type": "color",
    "description": "The plate on the game"
  },
  {
    "name": "nk-chip-fg",
    "group": "kit",
    "type": "color",
    "description": "Text and icons"
  },
  {
    "name": "nk-chip-font-size",
    "group": "kit",
    "type": "dimension",
    "description": "Text size"
  },
  {
    "name": "nk-chip-weight",
    "group": "kit",
    "type": "number",
    "description": "Text weight"
  },
  {
    "name": "nk-chip-active-bg",
    "group": "kit",
    "type": "color",
    "description": "An active chip's fill (rises from the bottom)"
  },
  {
    "name": "nk-chip-active-fg",
    "group": "kit",
    "type": "color",
    "description": "An active chip's ink"
  },
  {
    "name": "nk-chip-glow",
    "group": "kit",
    "type": "number",
    "description": "An active chip's glow"
  },
  {
    "name": "nk-chip-clip",
    "group": "kit",
    "type": "number",
    "description": "The chip's clip-path"
  },
  {
    "name": "nk-chip-text-shadow",
    "group": "kit",
    "type": "number",
    "description": "Text drawn on the game"
  },
  {
    "name": "nk-chip-icon-size",
    "group": "kit",
    "type": "dimension",
    "description": "A pill chip's icon"
  },
  {
    "name": "nk-chip-icon-size-square",
    "group": "kit",
    "type": "dimension",
    "description": "A tile chip's icon"
  },
  {
    "name": "nk-vital-chip-size",
    "group": "kit",
    "type": "dimension",
    "description": "The chip's box"
  },
  {
    "name": "nk-vital-chip-size-sm",
    "group": "kit",
    "type": "dimension",
    "description": "A small chip's box (telltales, compass marks)"
  },
  {
    "name": "nk-vital-chip-glyph-ratio",
    "group": "kit",
    "type": "number",
    "description": "The face as a fraction of the box"
  },
  {
    "name": "nk-vital-chip-icon-ratio",
    "group": "kit",
    "type": "number",
    "description": "The icon as a fraction of the face"
  },
  {
    "name": "nk-vital-chip-label-size",
    "group": "kit",
    "type": "dimension",
    "description": "The tag's text size"
  },
  {
    "name": "nk-vital-chip-label-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between the face and the tag's text"
  },
  {
    "name": "nk-vital-chip-pop-overlap",
    "group": "kit",
    "type": "dimension",
    "description": "How far an open pop tucks behind the chip"
  },
  {
    "name": "nk-vital-chip-pop-pad",
    "group": "kit",
    "type": "dimension",
    "description": "An open pop's leading padding"
  },
  {
    "name": "nk-vital-chip-pop-max-width",
    "group": "kit",
    "type": "dimension",
    "description": "An open pop's width"
  },
  {
    "name": "nk-vital-chip-line-width",
    "group": "kit",
    "type": "dimension",
    "description": "The level line's thickness"
  },
  {
    "name": "nk-vital-chip-plate-drop",
    "group": "kit",
    "type": "dimension",
    "description": "How far the wall drops straight below the face"
  },
  {
    "name": "nk-vital-chip-plate-x",
    "group": "kit",
    "type": "dimension",
    "description": "The wall's sideways step"
  },
  {
    "name": "nk-meter-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The bar's radius"
  },
  {
    "name": "nk-meter-glow",
    "group": "kit",
    "type": "number",
    "description": "The fill's glow"
  },
  {
    "name": "nk-meter-segments",
    "group": "kit",
    "type": "number",
    "description": "1 = segmented, 0 = a continuous fill"
  },
  {
    "name": "nk-meter-track-color",
    "group": "kit",
    "type": "color",
    "description": "The track behind the bar"
  },
  {
    "name": "nk-meter-segment-size",
    "group": "kit",
    "type": "dimension",
    "description": "One segment's length"
  },
  {
    "name": "nk-meter-segment-gap",
    "group": "kit",
    "type": "dimension",
    "description": "The gap between segments"
  },
  {
    "name": "nk-meter-segment-color",
    "group": "kit",
    "type": "color",
    "description": "The gap's colour (the panel showing through)"
  },
  {
    "name": "nk-gauge-width",
    "group": "kit",
    "type": "dimension",
    "description": "The arc's thickness"
  },
  {
    "name": "nk-gauge-ticks",
    "group": "kit",
    "type": "number",
    "description": "Tick marks: 1 on, 0 off"
  },
  {
    "name": "nk-gauge-font",
    "group": "kit",
    "type": "number",
    "description": "The readout's face"
  },
  {
    "name": "nk-gauge-track-color",
    "group": "kit",
    "type": "color",
    "description": "The unlit arc"
  },
  {
    "name": "nk-gauge-fill-color",
    "group": "kit",
    "type": "color",
    "description": "The lit arc"
  },
  {
    "name": "nk-gauge-needle-color",
    "group": "kit",
    "type": "color",
    "description": "The needle"
  },
  {
    "name": "nk-gauge-redline-color",
    "group": "kit",
    "type": "color",
    "description": "The redline"
  },
  {
    "name": "nk-gauge-tick-color",
    "group": "kit",
    "type": "color",
    "description": "A minor tick"
  },
  {
    "name": "nk-gauge-tick-major",
    "group": "kit",
    "type": "color",
    "description": "A major tick"
  },
  {
    "name": "nk-dial-disc-opacity",
    "group": "kit",
    "type": "number",
    "description": "The disc's opacity under the arc"
  },
  {
    "name": "nk-ring-segments",
    "group": "kit",
    "type": "number",
    "description": "Segments in the ring"
  },
  {
    "name": "nk-ring-gap",
    "group": "kit",
    "type": "number",
    "description": "Degrees between segments"
  },
  {
    "name": "nk-ring-label-max-width",
    "group": "kit",
    "type": "dimension",
    "description": "The label's maximum width"
  },
  {
    "name": "nk-speedometer-digit-dim",
    "group": "kit",
    "type": "number",
    "description": "A leading zero's opacity"
  },
  {
    "name": "nk-speedometer-digit-tracking",
    "group": "kit",
    "type": "dimension",
    "description": "The digits' letter-spacing"
  },
  {
    "name": "nk-level-pip-size",
    "group": "kit",
    "type": "dimension",
    "description": "One pip's width (10% = ten pips)"
  },
  {
    "name": "nk-level-pip-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between pips"
  },
  {
    "name": "nk-level-hold-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The hold ring's thickness around a key"
  },
  {
    "name": "nk-level-fill-ink",
    "group": "kit",
    "type": "color",
    "description": "An icon's copy over a solid fill (vital chips, HUD keys): dark on the fill"
  },
  {
    "name": "nk-slab-height",
    "group": "kit",
    "type": "dimension",
    "description": "Height"
  },
  {
    "name": "nk-slab-padding",
    "group": "kit",
    "type": "number",
    "description": "Padding"
  },
  {
    "name": "nk-slab-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its parts"
  },
  {
    "name": "nk-slab-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Radius"
  },
  {
    "name": "nk-slab-clip",
    "group": "kit",
    "type": "number",
    "description": "clip-path"
  },
  {
    "name": "nk-slab-bg",
    "group": "kit",
    "type": "color",
    "description": "The plate"
  },
  {
    "name": "nk-slab-fg",
    "group": "kit",
    "type": "color",
    "description": "Text"
  },
  {
    "name": "nk-slab-border",
    "group": "kit",
    "type": "color",
    "description": "The rim"
  },
  {
    "name": "nk-slab-font-size",
    "group": "kit",
    "type": "dimension",
    "description": "Text size"
  },
  {
    "name": "nk-slab-weight",
    "group": "kit",
    "type": "number",
    "description": "Text weight"
  },
  {
    "name": "nk-slab-text-shadow",
    "group": "kit",
    "type": "number",
    "description": "Text shadow on the plate"
  },
  {
    "name": "nk-slab-tone",
    "group": "kit",
    "type": "number",
    "description": "The accent's channels (a screen sets it per state on any ancestor)"
  },
  {
    "name": "nk-slab-icon-size",
    "group": "kit",
    "type": "dimension",
    "description": "The icon tile's size"
  },
  {
    "name": "nk-slab-icon-bg",
    "group": "kit",
    "type": "color",
    "description": "The icon tile"
  },
  {
    "name": "nk-slab-icon-fg",
    "group": "kit",
    "type": "color",
    "description": "The icon"
  },
  {
    "name": "nk-slab-icon-radius",
    "group": "kit",
    "type": "dimension",
    "description": "The icon tile's radius"
  },
  {
    "name": "nk-slab-delta-font",
    "group": "kit",
    "type": "number",
    "description": "A delta's face"
  },
  {
    "name": "nk-slab-delta-up",
    "group": "kit",
    "type": "color",
    "description": "A gain"
  },
  {
    "name": "nk-slab-delta-down",
    "group": "kit",
    "type": "color",
    "description": "A loss"
  },
  {
    "name": "nk-slab-key-size",
    "group": "kit",
    "type": "dimension",
    "description": "A key chip's size"
  },
  {
    "name": "nk-slab-key-font-size",
    "group": "kit",
    "type": "dimension",
    "description": "A key chip's text"
  },
  {
    "name": "nk-slab-line-height",
    "group": "kit",
    "type": "dimension",
    "description": "The progress line's thickness"
  },
  {
    "name": "nk-slab-line-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Its radius"
  },
  {
    "name": "nk-slab-line-track",
    "group": "kit",
    "type": "color",
    "description": "Its track"
  },
  {
    "name": "nk-slab-stack-width",
    "group": "kit",
    "type": "dimension",
    "description": "The progress stack's width"
  },
  {
    "name": "nk-slab-stack-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its rows"
  },
  {
    "name": "nk-slab-band-padding",
    "group": "kit",
    "type": "number",
    "description": "The band's padding"
  },
  {
    "name": "nk-slab-band-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its lines"
  },
  {
    "name": "nk-slab-band-bg",
    "group": "kit",
    "type": "color",
    "description": "The game, darkened"
  },
  {
    "name": "nk-slab-band-tint",
    "group": "kit",
    "type": "number",
    "description": "The tone's alpha over the band"
  },
  {
    "name": "nk-slab-band-edge",
    "group": "kit",
    "type": "number",
    "description": "The tone's alpha on its edges"
  },
  {
    "name": "nk-slab-band-fg",
    "group": "kit",
    "type": "color",
    "description": "Text"
  },
  {
    "name": "nk-slab-band-title-size",
    "group": "kit",
    "type": "dimension",
    "description": "The band's line"
  },
  {
    "name": "nk-item-slot-width",
    "group": "kit",
    "type": "dimension",
    "description": "Width (md)"
  },
  {
    "name": "nk-item-slot-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Width (sm)"
  },
  {
    "name": "nk-item-slot-width-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Width (lg)"
  },
  {
    "name": "nk-item-slot-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its lines"
  },
  {
    "name": "nk-item-slot-top-height",
    "group": "kit",
    "type": "dimension",
    "description": "The meta line's height"
  },
  {
    "name": "nk-item-slot-corner-lock",
    "group": "kit",
    "type": "dimension",
    "description": "The lock icon"
  },
  {
    "name": "nk-key-prompt-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its parts"
  },
  {
    "name": "nk-key-prompt-max-width",
    "group": "kit",
    "type": "dimension",
    "description": "Maximum width"
  },
  {
    "name": "nk-key-prompt-min-height",
    "group": "kit",
    "type": "dimension",
    "description": "Minimum height (md)"
  },
  {
    "name": "nk-key-prompt-min-height-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Minimum height (sm)"
  },
  {
    "name": "nk-key-prompt-pad-left",
    "group": "kit",
    "type": "dimension",
    "description": "Leading padding"
  },
  {
    "name": "nk-key-prompt-pad-right",
    "group": "kit",
    "type": "dimension",
    "description": "Trailing padding"
  },
  {
    "name": "nk-key-prompt-pad-y",
    "group": "kit",
    "type": "dimension",
    "description": "Block padding"
  },
  {
    "name": "nk-key-prompt-key-height",
    "group": "kit",
    "type": "dimension",
    "description": "A key cap's height"
  },
  {
    "name": "nk-skill-check-size",
    "group": "kit",
    "type": "dimension",
    "description": "Size (md)"
  },
  {
    "name": "nk-skill-check-size-sm",
    "group": "kit",
    "type": "dimension",
    "description": "Size (sm)"
  },
  {
    "name": "nk-skill-check-size-lg",
    "group": "kit",
    "type": "dimension",
    "description": "Size (lg)"
  },
  {
    "name": "nk-skill-check-key-height",
    "group": "kit",
    "type": "dimension",
    "description": "The key's height"
  },
  {
    "name": "nk-skill-check-key-pad",
    "group": "kit",
    "type": "dimension",
    "description": "The key's padding"
  },
  {
    "name": "nk-countdown-line-width",
    "group": "kit",
    "type": "dimension",
    "description": "The line (md)"
  },
  {
    "name": "nk-countdown-line-width-sm",
    "group": "kit",
    "type": "dimension",
    "description": "The line (sm)"
  },
  {
    "name": "nk-countdown-line-width-hero",
    "group": "kit",
    "type": "dimension",
    "description": "The line (hero)"
  },
  {
    "name": "nk-stat-gap",
    "group": "kit",
    "type": "dimension",
    "description": "Between its parts"
  },
  {
    "name": "nk-stat-label-icon",
    "group": "kit",
    "type": "dimension",
    "description": "The label's icon"
  },
  {
    "name": "nk-nui-image-icon-max",
    "group": "kit",
    "type": "dimension",
    "description": "The fallback glyph's maximum size"
  },
  {
    "name": "sans",
    "group": "base",
    "type": "fontFamily",
    "description": "Sentences (the body voice)"
  },
  {
    "name": "display",
    "group": "base",
    "type": "fontFamily",
    "description": "Anything scanned: keys, titles, labels, captions (the body face unless a theme says otherwise)"
  },
  {
    "name": "numeric",
    "group": "base",
    "type": "fontFamily",
    "description": "Every number (always tabular)"
  },
  {
    "name": "mono",
    "group": "base",
    "type": "fontFamily",
    "description": "Codes and IDs a player might type"
  },
  {
    "name": "nk-motion-duration",
    "group": "kit",
    "type": "number",
    "description": "Base duration d: the ladder is snap 0.5d, fast 0.667d, base d, slow 1.556d, fill 2.333d"
  },
  {
    "name": "nk-motion-ease",
    "group": "kit",
    "type": "number",
    "description": "The curve of anything arriving"
  },
  {
    "name": "nk-motion-feel",
    "group": "kit",
    "type": "number",
    "description": "How it moves: crisp, snap (flash instead of press scale), smooth (longer springs), stepped"
  },
  {
    "name": "nk-motion-bounce",
    "group": "kit",
    "type": "number",
    "description": "Bounce folded into the snap, move and soft springs"
  },
  {
    "name": "nk-motion-exit-factor",
    "group": "kit",
    "type": "number",
    "description": "Every exit is this × its enter"
  },
  {
    "name": "nk-motion-reduced",
    "group": "kit",
    "type": "number",
    "description": "Under reduced motion every fade is at most this"
  },
  {
    "name": "nk-motion-profile",
    "group": "kit",
    "type": "number",
    "description": "full: as designed; reduced: no movement, short fades; instant: nothing animates"
  }
];
