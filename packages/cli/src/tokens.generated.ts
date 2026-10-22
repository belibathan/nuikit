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
    "name": "world-foreground",
    "group": "base",
    "type": "color",
    "description": "Text and icons drawn straight on the game, no panel (death text, unplated HUD values, nk-on-game). Light in every theme, light or dark"
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
    "description": "A gain drawn on the game or the HUD plate (slab deltas: +2, $250). Reads on the dark plate in every theme, light or dark"
  },
  {
    "name": "world-destructive",
    "group": "base",
    "type": "color",
    "description": "A loss drawn on the game or the HUD plate (slab deltas: −1)"
  },
  {
    "name": "role-health",
    "group": "base",
    "type": "color",
    "description": "Role colour health: the --hue-* ramp under data-hue=\"health\""
  },
  {
    "name": "role-armor",
    "group": "base",
    "type": "color",
    "description": "Role colour armor: the --hue-* ramp under data-hue=\"armor\""
  },
  {
    "name": "role-hunger",
    "group": "base",
    "type": "color",
    "description": "Role colour hunger: the --hue-* ramp under data-hue=\"hunger\""
  },
  {
    "name": "role-thirst",
    "group": "base",
    "type": "color",
    "description": "Role colour thirst: the --hue-* ramp under data-hue=\"thirst\""
  },
  {
    "name": "role-stress",
    "group": "base",
    "type": "color",
    "description": "Role colour stress: the --hue-* ramp under data-hue=\"stress\""
  },
  {
    "name": "role-stamina",
    "group": "base",
    "type": "color",
    "description": "Role colour stamina: the --hue-* ramp under data-hue=\"stamina\""
  },
  {
    "name": "role-oxygen",
    "group": "base",
    "type": "color",
    "description": "Role colour oxygen: the --hue-* ramp under data-hue=\"oxygen\""
  },
  {
    "name": "role-info",
    "group": "base",
    "type": "color",
    "description": "Role colour info: the --hue-* ramp under data-hue=\"info\""
  },
  {
    "name": "role-success",
    "group": "base",
    "type": "color",
    "description": "Role colour success: the --hue-* ramp under data-hue=\"success\""
  },
  {
    "name": "role-warning",
    "group": "base",
    "type": "color",
    "description": "Role colour warning: the --hue-* ramp under data-hue=\"warning\""
  },
  {
    "name": "role-danger",
    "group": "base",
    "type": "color",
    "description": "Role colour danger: the --hue-* ramp under data-hue=\"danger\""
  },
  {
    "name": "role-police",
    "group": "base",
    "type": "color",
    "description": "Role colour police: the --hue-* ramp under data-hue=\"police\""
  },
  {
    "name": "role-ems",
    "group": "base",
    "type": "color",
    "description": "Role colour ems: the --hue-* ramp under data-hue=\"ems\""
  },
  {
    "name": "role-mech",
    "group": "base",
    "type": "color",
    "description": "Role colour mech: the --hue-* ramp under data-hue=\"mech\""
  },
  {
    "name": "role-gang",
    "group": "base",
    "type": "color",
    "description": "Role colour gang: the --hue-* ramp under data-hue=\"gang\""
  },
  {
    "name": "role-civ",
    "group": "base",
    "type": "color",
    "description": "Role colour civ: the --hue-* ramp under data-hue=\"civ\""
  },
  {
    "name": "role-staff",
    "group": "base",
    "type": "color",
    "description": "Role colour staff: the --hue-* ramp under data-hue=\"staff\""
  },
  {
    "name": "role-common",
    "group": "base",
    "type": "color",
    "description": "Role colour common: the --hue-* ramp under data-hue=\"common\""
  },
  {
    "name": "role-uncommon",
    "group": "base",
    "type": "color",
    "description": "Role colour uncommon: the --hue-* ramp under data-hue=\"uncommon\""
  },
  {
    "name": "role-rare",
    "group": "base",
    "type": "color",
    "description": "Role colour rare: the --hue-* ramp under data-hue=\"rare\""
  },
  {
    "name": "role-epic",
    "group": "base",
    "type": "color",
    "description": "Role colour epic: the --hue-* ramp under data-hue=\"epic\""
  },
  {
    "name": "role-legendary",
    "group": "base",
    "type": "color",
    "description": "Role colour legendary: the --hue-* ramp under data-hue=\"legendary\""
  },
  {
    "name": "role-brand",
    "group": "base",
    "type": "color",
    "description": "Role colour brand: the --hue-* ramp under data-hue=\"brand\""
  },
  {
    "name": "role-neutral",
    "group": "base",
    "type": "color",
    "description": "Role colour neutral: the --hue-* ramp under data-hue=\"neutral\""
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
    "description": "1 = animations on, 0 = off. Painted as 0 when the theme or the player's reduced-motion pref turns motion down."
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
    "name": "nk-display-style",
    "group": "kit",
    "type": "number",
    "description": "Display, heading, title and numeric text upright or italic (a real italic face where the font has one)"
  },
  {
    "name": "nk-pause-style",
    "group": "kit",
    "type": "number",
    "description": "The pause menu: a full-height sheet, or a light slash panel with a diagonal edge into the scene"
  },
  {
    "name": "nk-skew",
    "group": "kit",
    "type": "number",
    "description": "Badges, chips, key caps, tags and the primary / selected bar drawn skewed (their text stays upright); 0deg = off, at most ±20deg"
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
    "description": "Shadow recipe of floating panels: none, soft, deep, or hard (a solid offset drop, no blur; tokens 1.3)"
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
  },
  {
    "name": "nk-motion-feel",
    "group": "kit",
    "type": "number",
    "description": "How the identity moves: crisp (Graphite), snap (Signal: no glide on selection, flash instead of press scale), smooth (Velvet: longer springs, a hint of bounce), stepped (Vector: values tick in steps)"
  },
  {
    "name": "nk-spring-bounce",
    "group": "kit",
    "type": "number",
    "description": "Bounce folded into the snap, move and soft springs (0 = critically damped; 0.3 is the most the kit allows)"
  },
  {
    "name": "nk-treatment",
    "group": "kit",
    "type": "number",
    "description": "How the palette is drawn: soft (Graphite), glass, plate or slab. Fills material, stroke, type, focus and motion defaults; any value the theme sets wins"
  },
  {
    "name": "nk-focus-style",
    "group": "kit",
    "type": "number",
    "description": "Every component's focus (controller and keyboard highlight)"
  },
  {
    "name": "nk-hold-style",
    "group": "kit",
    "type": "number",
    "description": "How a press-and-hold shows its progress"
  },
  {
    "name": "nk-confirm-scale",
    "group": "kit",
    "type": "number",
    "description": "The short pop of a confirm"
  },
  {
    "name": "nk-level-style",
    "group": "kit",
    "type": "number",
    "description": "How a level (--level, 0–1) is drawn by meters, vitals, holds, timers and cooldowns"
  },
  {
    "name": "nk-hue-line",
    "group": "kit",
    "type": "number",
    "description": "Alpha of a role's line (borders, tracks)"
  },
  {
    "name": "nk-hue-tint",
    "group": "kit",
    "type": "number",
    "description": "Alpha of a role's tint (fills behind text)"
  },
  {
    "name": "nk-hue-glow",
    "group": "kit",
    "type": "number",
    "description": "Alpha of a role's glow (under the glow budget)"
  },
  {
    "name": "nk-hue-alert",
    "group": "kit",
    "type": "number",
    "description": "Alpha of a role's alert wash (below the alert threshold)"
  },
  {
    "name": "nk-material-hud-opacity",
    "group": "kit",
    "type": "number",
    "description": "Surface opacity of HUD parts drawn over the game"
  },
  {
    "name": "nk-material-hud-blur",
    "group": "kit",
    "type": "dimension",
    "description": "Backdrop blur behind HUD parts drawn over the game"
  },
  {
    "name": "nk-material-hud-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Corner radius of HUD parts drawn over the game"
  },
  {
    "name": "nk-material-hud-edge",
    "group": "kit",
    "type": "number",
    "description": "Inner top highlight of HUD parts drawn over the game (alpha)"
  },
  {
    "name": "nk-material-hud-texture",
    "group": "kit",
    "type": "number",
    "description": "Texture over HUD parts drawn over the game"
  },
  {
    "name": "nk-material-menu-opacity",
    "group": "kit",
    "type": "number",
    "description": "Surface opacity of menus, sheets and dialogs"
  },
  {
    "name": "nk-material-menu-blur",
    "group": "kit",
    "type": "dimension",
    "description": "Backdrop blur behind menus, sheets and dialogs"
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
    "description": "Inner top highlight of menus, sheets and dialogs (alpha)"
  },
  {
    "name": "nk-material-menu-texture",
    "group": "kit",
    "type": "number",
    "description": "Texture over menus, sheets and dialogs"
  },
  {
    "name": "nk-material-overlay-opacity",
    "group": "kit",
    "type": "number",
    "description": "Surface opacity of full-screen overlays (pause, death, loading)"
  },
  {
    "name": "nk-material-overlay-blur",
    "group": "kit",
    "type": "dimension",
    "description": "Backdrop blur behind full-screen overlays (pause, death, loading)"
  },
  {
    "name": "nk-material-overlay-radius",
    "group": "kit",
    "type": "dimension",
    "description": "Corner radius of full-screen overlays (pause, death, loading)"
  },
  {
    "name": "nk-material-overlay-edge",
    "group": "kit",
    "type": "number",
    "description": "Inner top highlight of full-screen overlays (pause, death, loading) (alpha)"
  },
  {
    "name": "nk-material-overlay-texture",
    "group": "kit",
    "type": "number",
    "description": "Texture over full-screen overlays (pause, death, loading)"
  },
  {
    "name": "nk-backdrop",
    "group": "kit",
    "type": "number",
    "description": "Backdrop filters (blur behind materials, the death screen's desaturation): off by default, because NUI's Chromium draws them as black boxes over the game on many clients. on applies each surface's --nk-backdrop-filter"
  },
  {
    "name": "nk-slash",
    "group": "kit",
    "type": "number",
    "description": "A decorative diagonal cut on menus, at most once per full-screen moment"
  },
  {
    "name": "nk-legibility",
    "group": "kit",
    "type": "number",
    "description": "night: as designed. day: surfaces and hairlines lifted for a bright sky (not a light theme). auto: day while the game clock says so (html[data-nk-daytime], set by the HUD)"
  },
  {
    "name": "nk-legibility-lift",
    "group": "kit",
    "type": "number",
    "description": "How far day closes the gap to opaque (0 none, 1 fully opaque)"
  },
  {
    "name": "nk-alert-threshold",
    "group": "kit",
    "type": "number",
    "description": "A level at or under this is an alert (vitals, durability)"
  },
  {
    "name": "nk-fuel-threshold",
    "group": "kit",
    "type": "number",
    "description": "Fuel alert level"
  },
  {
    "name": "nk-notify-ms-info",
    "group": "kit",
    "type": "number",
    "description": "How long a info notice stays"
  },
  {
    "name": "nk-notify-ms-success",
    "group": "kit",
    "type": "number",
    "description": "How long a success notice stays"
  },
  {
    "name": "nk-notify-ms-warning",
    "group": "kit",
    "type": "number",
    "description": "How long a warning notice stays"
  },
  {
    "name": "nk-notify-ms-danger",
    "group": "kit",
    "type": "number",
    "description": "How long a danger notice stays"
  },
  {
    "name": "nk-hold-ms",
    "group": "kit",
    "type": "number",
    "description": "Press-and-hold time"
  },
  {
    "name": "nk-cooldown-ms",
    "group": "kit",
    "type": "number",
    "description": "Default cooldown after an action"
  },
  {
    "name": "nk-rest-delay",
    "group": "kit",
    "type": "number",
    "description": "How long an idle HUD part waits before it retracts (0 = never)"
  },
  {
    "name": "nk-motion-profile",
    "group": "kit",
    "type": "number",
    "description": "full: as designed. reduced: no movement, short fades. instant: nothing animates"
  },
  {
    "name": "nk-z-world",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: world. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-hud",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: hud. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-scrim",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: scrim. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-surface",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: surface. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-dim",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: dim. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-dialog",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: dialog. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-z-system",
    "group": "kit",
    "type": "number",
    "description": "Stacking layer: system. A modal is the current surface + dim + dialog"
  },
  {
    "name": "nk-hang-md",
    "group": "kit",
    "type": "dimension",
    "description": "How far a badge or gem breaks a panel edge"
  },
  {
    "name": "nk-hang-lg",
    "group": "kit",
    "type": "dimension",
    "description": "A large hang (a level badge on a card)"
  },
  {
    "name": "nk-focus-shift",
    "group": "kit",
    "type": "dimension",
    "description": "The focused row's nudge toward its content"
  },
  {
    "name": "nk-glow-budget",
    "group": "kit",
    "type": "number",
    "description": "How many elements may glow at once (the top surface's focused one first); 0 = no limit"
  }
];
