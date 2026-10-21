// What a GTA blip is, from its sprite: a readable name and a kind (the legend's categories, each with
// a lucide icon). GTA can't read a blip's custom name back, so this is how the map names the blips
// other resources made; a resource can still pass the real name (exports.nuikit_pause:nameBlip).
// Sprite numbers: docs.fivem.net/docs/game-references/blips (and what Qbox, ox and the common
// standalone resources use).
import {
  AnchorIcon,
  BanknoteIcon,
  Building2Icon,
  BusIcon,
  CarIcon,
  CarTaxiFrontIcon,
  CircleDotIcon,
  CrosshairIcon,
  DropletsIcon,
  FlagIcon,
  FuelIcon,
  GemIcon,
  HammerIcon,
  HospitalIcon,
  HouseIcon,
  LandmarkIcon,
  NewspaperIcon,
  PenToolIcon,
  PlaneIcon,
  ScissorsIcon,
  ShieldIcon,
  ShipIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SkullIcon,
  SquareParkingIcon,
  SyringeIcon,
  Trash2Icon,
  TruckIcon,
  WavesIcon,
  WineIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import type { MapBlip } from "../nui";

export type BlipKind = "services" | "money" | "shops" | "style" | "garages" | "vehicles" | "fuel" | "jobs" | "property" | "live" | "other";

/** The legend: in this order, with the icon its rows use. */
export const KINDS: { kind: BlipKind; label: string; icon: LucideIcon }[] = [
  { kind: "services", label: "Services", icon: HospitalIcon },
  { kind: "money", label: "Banks", icon: LandmarkIcon },
  { kind: "shops", label: "Shops", icon: ShoppingBagIcon },
  { kind: "style", label: "Clothing and style", icon: ShirtIcon },
  { kind: "garages", label: "Garages", icon: SquareParkingIcon },
  { kind: "vehicles", label: "Vehicles", icon: CarIcon },
  { kind: "fuel", label: "Gas stations", icon: FuelIcon },
  { kind: "jobs", label: "Jobs", icon: TruckIcon },
  { kind: "property", label: "Property", icon: HouseIcon },
  { kind: "live", label: "Moving", icon: CircleDotIcon },
  { kind: "other", label: "Other", icon: CircleDotIcon },
];

type Sprite = [label: string, kind: BlipKind, icon: LucideIcon];

const SPRITES: Record<number, Sprite> = {
  // services
  60: ["Police station", "services", ShieldIcon],
  61: ["Hospital", "services", HospitalIcon],
  153: ["Hospital", "services", HospitalIcon],
  487: ["City hall", "services", Building2Icon],
  // money
  108: ["Bank", "money", LandmarkIcon],
  207: ["Bank", "money", LandmarkIcon],
  277: ["ATM", "money", BanknoteIcon],
  500: ["Cash", "money", BanknoteIcon],
  // shops
  52: ["Store", "shops", ShoppingBagIcon],
  59: ["Convenience store", "shops", ShoppingBagIcon],
  93: ["Liquor store", "shops", WineIcon],
  110: ["Ammu-Nation", "shops", CrosshairIcon],
  402: ["Hardware store", "shops", HammerIcon],
  431: ["Pawn shop", "shops", GemIcon],
  // clothing and style
  71: ["Barber", "style", ScissorsIcon],
  73: ["Clothing store", "style", ShirtIcon],
  366: ["Clothing store", "style", ShirtIcon],
  75: ["Tattoo parlor", "style", PenToolIcon],
  102: ["Plastic surgeon", "style", SyringeIcon],
  // garages
  50: ["Garage", "garages", SquareParkingIcon],
  357: ["Garage", "garages", SquareParkingIcon],
  473: ["Garage", "garages", SquareParkingIcon],
  356: ["Boathouse", "garages", AnchorIcon],
  360: ["Hangar", "garages", PlaneIcon],
  359: ["Depot", "garages", SquareParkingIcon],
  68: ["Impound", "garages", TruckIcon],
  524: ["Impound", "garages", TruckIcon],
  // vehicles
  326: ["Car dealer", "vehicles", CarIcon],
  225: ["Vehicle", "vehicles", CarIcon],
  226: ["Motorbike", "vehicles", CarIcon],
  410: ["Boat dealer", "vehicles", ShipIcon],
  251: ["Aircraft dealer", "vehicles", PlaneIcon],
  72: ["Mod shop", "vehicles", WrenchIcon],
  446: ["Mechanic", "vehicles", WrenchIcon],
  100: ["Car wash", "vehicles", DropletsIcon],
  // fuel
  361: ["Gas station", "fuel", FuelIcon],
  415: ["Gas station", "fuel", FuelIcon],
  // jobs
  477: ["Trucking", "jobs", TruckIcon],
  513: ["Bus depot", "jobs", BusIcon],
  198: ["Taxi", "jobs", CarTaxiFrontIcon],
  318: ["Garbage depot", "jobs", Trash2Icon],
  67: ["Tow yard", "jobs", TruckIcon],
  459: ["News station", "jobs", NewspaperIcon],
  729: ["Diving", "jobs", WavesIcon],
  // property
  40: ["Home", "property", HouseIcon],
  475: ["Apartments", "property", HouseIcon],
  476: ["Office", "property", Building2Icon],
  492: ["Property", "property", HouseIcon],
  // activities and the rest that stays put
  38: ["Race", "other", FlagIcon],
  315: ["Race", "other", FlagIcon],
  // things that move (players, units, vehicles)
  56: ["Police unit", "live", ShieldIcon],
  274: ["Down", "live", SkullIcon],
  421: ["Tank", "live", CarIcon],
  422: ["Helicopter", "live", PlaneIcon],
  423: ["Plane", "live", PlaneIcon],
  424: ["Jet", "live", PlaneIcon],
  426: ["Armed vehicle", "live", CarIcon],
  427: ["Boat", "live", ShipIcon],
  750: ["Military vehicle", "live", TruckIcon],
  757: ["Off-road vehicle", "live", CarIcon],
};

export interface BlipLook {
  label: string;
  kind: BlipKind;
  icon: LucideIcon;
  /** the kind's legend name */
  kindLabel: string;
}

const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.kind, k.label])) as Record<BlipKind, string>;

/** A blip's name, kind and icon: its owner's name if it passed one, else what its sprite means. */
export function blipLook(b: MapBlip): BlipLook {
  const known = SPRITES[b.s];
  // an entity blip moves with its entity: grouped as moving, whatever its sprite
  const kind: BlipKind = b.e !== undefined && b.e !== 4 && b.e !== 0 ? "live" : (known?.[1] ?? "other");
  const label = b.name || known?.[0] || "Marker";
  return { label, kind, icon: known?.[2] ?? CircleDotIcon, kindLabel: KIND_LABEL[kind] };
}

// nuikit-ignore-start color/hardcoded (GTA's own blip palette: the theme can't know it)
const PALETTE: Record<number, string> = {
  1: "#e03232", 2: "#71cb71", 3: "#5db6e5", 5: "#eec64e", 6: "#c25050", 7: "#9c6eaf", 8: "#fe7ac3",
  9: "#f59d79", 10: "#b18f83", 11: "#8dcea7", 12: "#70a8ae", 13: "#d3d1e7", 14: "#8f7e98", 15: "#6ac4bf",
  16: "#d5c398", 17: "#ea8e50", 18: "#97cae9", 19: "#b26287", 20: "#8f8d79", 21: "#a6755e", 22: "#afa8a8",
  23: "#e88e9b", 24: "#bbd65b", 25: "#0c7b56", 26: "#7bc4ff", 27: "#ab3ce6", 28: "#cda80c", 29: "#4561ab",
  30: "#29a5b8", 31: "#b89b7b", 32: "#c8e0fe", 33: "#f0f096", 34: "#ed8ca1", 35: "#f98a8a", 36: "#fbeea5",
  38: "#2c6db8", 39: "#9a9a9a", 40: "#4c4c4c", 46: "#ecf029", 47: "#ffa357", 48: "#f2f2f2", 49: "#ea7272",
  50: "#8d72c6", 51: "#e5916a", 52: "#559d64", 53: "#7ab4e5", 57: "#3da9cc", 59: "#d14848", 66: "#eec64e",
  69: "#7ac943", 81: "#f2a40c", 83: "#a54ccf", 84: "#c13e4a", 85: "#f0f0f0",
};
// nuikit-ignore-end

/** The blip's GTA colour as a CSS colour, or undefined for white / unknown (the theme's ink then). */
export function blipColour(c: number): string | undefined {
  return PALETTE[c];
}
