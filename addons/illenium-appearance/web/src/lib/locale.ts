// UI strings. Lua sends the server's locale (appearance_get_locales); these English strings fill any
// key it leaves out. Shape: docs/illenium-appearance-protocol.md §5.

export const FALLBACK = {
  modal: {
    save: { title: "Save changes?", description: "Your new look will be kept." },
    exit: { title: "Leave without saving?", description: "Every change you made here will be undone." },
    accept: "Confirm",
    decline: "Cancel",
  },
  ped: { title: "Ped", model: "Model" },
  headBlend: {
    title: "Heritage",
    shape: { title: "Face shape", firstOption: "Father", secondOption: "Mother", mix: "Resemblance" },
    skin: { title: "Skin tone", firstOption: "Father", secondOption: "Mother", mix: "Blend" },
    race: { title: "Third parent", shape: "Shape", skin: "Skin", mix: "Influence" },
  },
  faceFeatures: {
    title: "Face",
    nose: { title: "Nose", width: "Width", height: "Peak height", size: "Peak length", boneHeight: "Bridge height", boneTwist: "Bridge twist", peakHeight: "Tip lowering" },
    eyebrows: { title: "Brow ridge", height: "Height", depth: "Depth" },
    cheeks: { title: "Cheeks", boneHeight: "Bone height", boneWidth: "Bone width", width: "Fullness" },
    eyesAndMouth: { title: "Eyes & lips", eyesOpening: "Eye opening", lipsThickness: "Lip thickness" },
    jaw: { title: "Jaw", width: "Width", size: "Depth" },
    chin: { title: "Chin", lowering: "Height", length: "Length", size: "Width", hole: "Cleft" },
    neck: { title: "Neck", thickness: "Thickness" },
  },
  headOverlays: {
    title: "Hair & makeup",
    hair: { title: "Hair", style: "Style", color: "Colour", highlight: "Highlight", texture: "Variant", fade: "Fade" },
    opacity: "Intensity",
    style: "Style",
    color: "Colour",
    secondColor: "Second colour",
    blemishes: "Blemishes",
    beard: "Facial hair",
    eyebrows: "Eyebrows",
    ageing: "Ageing",
    makeUp: "Eye makeup",
    blush: "Blush",
    complexion: "Complexion",
    sunDamage: "Sun damage",
    lipstick: "Lipstick",
    moleAndFreckles: "Moles & freckles",
    chestHair: "Chest hair",
    bodyBlemishes: "Body blemishes",
    eyeColor: "Eye colour",
  },
  components: {
    title: "Clothing",
    drawable: "Item",
    texture: "Variant",
    head: "Head",
    mask: "Mask",
    upperBody: "Arms & gloves",
    lowerBody: "Legs",
    bags: "Bags & parachutes",
    shoes: "Shoes",
    scarfAndChains: "Scarves & chains",
    shirt: "Undershirt",
    bodyArmor: "Body armour",
    decals: "Decals",
    jackets: "Tops",
  },
  props: { title: "Accessories", drawable: "Item", texture: "Variant", hats: "Hats & helmets", glasses: "Glasses", ear: "Ears", watches: "Watches", bracelets: "Bracelets" },
  tattoos: {
    title: "Tattoos",
    items: { ZONE_TORSO: "Torso", ZONE_HEAD: "Head", ZONE_LEFT_ARM: "Left arm", ZONE_RIGHT_ARM: "Right arm", ZONE_LEFT_LEG: "Left leg", ZONE_RIGHT_LEG: "Right leg" },
    apply: "Apply",
    delete: "Remove",
    deleteAll: "Remove all tattoos",
    opacity: "Intensity",
  },
};

export type Locale = typeof FALLBACK;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge Lua's strings over the fallback; non-string leaves from Lua are ignored. */
export function mergeLocale<T>(base: T, incoming: unknown): T {
  if (!isObject(incoming) || !isObject(base)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(base as Record<string, unknown>)) {
    const next = incoming[k];
    if (isObject(v)) out[k] = mergeLocale(v, next);
    else if (typeof next === "string" && next.trim() !== "") out[k] = next;
  }
  return out as T;
}

/** Game names for eye colour indices (no locale key exists for them). */
export const EYE_COLOR_NAMES = [
  "Green",
  "Emerald",
  "Light blue",
  "Ocean blue",
  "Light brown",
  "Dark brown",
  "Hazel",
  "Dark grey",
  "Light grey",
  "Pink",
  "Yellow",
  "Purple",
  "Blackout",
  "Shades of grey",
  "Tequila sunrise",
  "Atomic",
  "Warp",
  "ECola",
  "Space ranger",
  "Ying yang",
  "Bullseye",
  "Lizard",
  "Dragon",
  "Extra terrestrial",
  "Goat",
  "Smiley",
  "Possessed",
  "Demon",
  "Infected",
  "Alien",
  "Undead",
  "Zombie",
];
