/** Role sets: a frame sets data-hue="<role>", its children read the --hue-* ramp. */
export const ROLE_SETS = {
  vitals: ["health", "armor", "hunger", "thirst", "stress", "stamina", "oxygen"],
  status: ["info", "success", "warning", "danger"],
  faction: ["police", "ems", "mech", "gang", "civ", "staff"],
  rarity: ["common", "uncommon", "rare", "epic", "legendary"],
  brand: ["brand"],
  neutral: ["neutral"],
} as const;
export const ROLES: readonly string[] = Object.values(ROLE_SETS).flat();

/** Where each role's colour comes from when a theme doesn't set --role-<name>: a palette token, or a fixed OKLCH. */
export const ROLE_DEFAULTS: Record<string, string | readonly [number, number, number]> = {
  health: "vital-health",
  armor: "vital-armor",
  hunger: "vital-hunger",
  thirst: "vital-thirst",
  stress: "vital-stress",
  stamina: "success",
  oxygen: "info",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "destructive",
  police: [0.62, 0.17, 255],
  ems: [0.64, 0.2, 25],
  mech: [0.74, 0.15, 60],
  gang: [0.6, 0.2, 305],
  civ: "muted-foreground",
  staff: "brand",
  common: "muted-foreground",
  uncommon: [0.72, 0.17, 145],
  rare: [0.66, 0.16, 250],
  epic: [0.62, 0.22, 305],
  legendary: [0.78, 0.16, 75],
  brand: "brand",
  neutral: "muted-foreground",
};
