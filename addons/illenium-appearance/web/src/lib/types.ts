// Wire types for illenium-appearance's NUI protocol (docs/illenium-appearance-protocol.md §3–4).

export type RGB = [number, number, number];
export type Range = { min: number; max: number };
export type FloatRange = { min: number; max: number; factor?: number };
export type Blacklist = { drawables: number[]; textures: number[] };

export const FACE_FEATURES = [
  "noseWidth",
  "nosePeakHigh",
  "nosePeakSize",
  "noseBoneHigh",
  "nosePeakLowering",
  "noseBoneTwist",
  "eyeBrownHigh",
  "eyeBrownForward",
  "cheeksBoneHigh",
  "cheeksBoneWidth",
  "cheeksWidth",
  "eyesOpening",
  "lipsThickness",
  "jawBoneWidth",
  "jawBoneBackSize",
  "chinBoneLowering",
  "chinBoneLenght",
  "chinBoneSize",
  "chinHole",
  "neckThickness",
] as const;
export type FaceFeature = (typeof FACE_FEATURES)[number];

export const HEAD_OVERLAYS = [
  "blemishes",
  "beard",
  "eyebrows",
  "ageing",
  "makeUp",
  "blush",
  "complexion",
  "sunDamage",
  "lipstick",
  "moleAndFreckles",
  "chestHair",
  "bodyBlemishes",
] as const;
export type HeadOverlay = (typeof HEAD_OVERLAYS)[number];

export const TATTOO_ZONES = ["ZONE_TORSO", "ZONE_HEAD", "ZONE_LEFT_ARM", "ZONE_RIGHT_ARM", "ZONE_LEFT_LEG", "ZONE_RIGHT_LEG"] as const;
export type TattooZone = (typeof TATTOO_ZONES)[number] | "ZONE_HAIR";

export interface Tattoo {
  name: string;
  label: string;
  hashMale: string;
  hashFemale: string;
  zone: TattooZone;
  collection: string;
  cost?: number;
  opacity?: number;
}
export type Tattoos = Partial<Record<TattooZone, Tattoo[]>>;

export interface HeadBlend {
  shapeFirst: number;
  shapeSecond: number;
  shapeThird: number;
  skinFirst: number;
  skinSecond: number;
  skinThird: number;
  shapeMix: number;
  skinMix: number;
  thirdMix: number;
}
export type HeadBlendKey = keyof HeadBlend;

export interface OverlayValue {
  style: number;
  opacity: number;
  color: number;
  secondColor: number;
}

export interface Hair {
  style: number;
  color: number;
  highlight: number;
  texture: number;
}

export interface Component {
  component_id: number;
  drawable: number;
  texture: number;
}
export interface Prop {
  prop_id: number;
  drawable: number;
  texture: number;
}

export interface Appearance {
  model: string;
  headBlend: HeadBlend;
  faceFeatures: Record<FaceFeature, number>;
  headOverlays: Record<HeadOverlay, OverlayValue>;
  components: Component[];
  props: Prop[];
  hair: Hair;
  tattoos: Tattoos;
  eyeColor: number;
}

export interface ComponentSettings {
  component_id: number;
  drawable: Range;
  texture: Range;
  blacklist: Blacklist;
}
export interface PropSettings {
  prop_id: number;
  drawable: Range;
  texture: Range;
  blacklist: Blacklist;
}
export interface HairSettings {
  style: Range;
  texture: Range;
  color: { items: RGB[] };
  highlight: { items: RGB[] };
  blacklist: Blacklist;
}
export interface OverlaySettings {
  style: Range;
  opacity: FloatRange;
  color?: { items: RGB[] };
}

export interface AppearanceSettings {
  ped: { model: { items: string[] } };
  components: ComponentSettings[];
  props: PropSettings[];
  headBlend: Record<HeadBlendKey, FloatRange>;
  faceFeatures: Record<FaceFeature, FloatRange>;
  headOverlays: Record<HeadOverlay, OverlaySettings>;
  hair: HairSettings;
  eyeColor: Range;
  tattoos: { items: Tattoos; opacity: FloatRange };
}

export interface ShopConfig {
  ped: boolean;
  headBlend: boolean;
  faceFeatures: boolean;
  headOverlays: boolean;
  components: boolean;
  props: boolean;
  tattoos: boolean;
  componentConfig: Record<
    "masks" | "upperBody" | "lowerBody" | "bags" | "shoes" | "scarfAndChains" | "bodyArmor" | "shirts" | "decals" | "jackets",
    boolean
  >;
  propConfig: Record<"hats" | "glasses" | "ear" | "watches" | "bracelets", boolean>;
  enableExit: boolean;
  hasTracker: boolean;
  automaticFade: boolean;
}

export type CameraKey = "head" | "body" | "bottom";
export type ClothesKey = "head" | "body" | "bottom";
