// Icons a script can name (the `icon` type in docs/intents.md): a lucide name from the set below,
// a Font Awesome name ('car', 'fas fa-car', ['fab', 'discord'], { prefix, iconName }), or an image
// URL. Lucide is bundled (it's what the kit draws with); Font Awesome's free sets are a chunk
// fetched the first time a script names one, so a server that never does never loads them.
import type { IntentIcon } from "nuikit-core/intents";
import {
  BanIcon,
  BoxIcon,
  BriefcaseIcon,
  Building2Icon,
  CarIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleHelpIcon,
  CircleXIcon,
  ClockIcon,
  CoinsIcon,
  CrosshairIcon,
  DollarSignIcon,
  DoorOpenIcon,
  EyeIcon,
  FuelIcon,
  GiftIcon,
  HandIcon,
  HeartIcon,
  HospitalIcon,
  HouseIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  LockOpenIcon,
  MapPinIcon,
  MessageSquareIcon,
  PackageIcon,
  PhoneIcon,
  PillIcon,
  RadioIcon,
  SearchIcon,
  SettingsIcon,
  ShieldIcon,
  ShirtIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SirenIcon,
  StarIcon,
  StoreIcon,
  TrashIcon,
  TriangleAlertIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon,
  WrenchIcon,
  XIcon,
  type IconComponent,
} from "@/components/ui/icons";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const LUCIDE: Record<string, IconComponent> = {
  ban: BanIcon,
  box: BoxIcon,
  briefcase: BriefcaseIcon,
  building: Building2Icon,
  car: CarIcon,
  check: CheckIcon,
  "circle-alert": CircleAlertIcon,
  "circle-check": CircleCheckIcon,
  "circle-help": CircleHelpIcon,
  "circle-x": CircleXIcon,
  clock: ClockIcon,
  coins: CoinsIcon,
  crosshair: CrosshairIcon,
  "dollar-sign": DollarSignIcon,
  "door-open": DoorOpenIcon,
  eye: EyeIcon,
  fuel: FuelIcon,
  gift: GiftIcon,
  hand: HandIcon,
  heart: HeartIcon,
  hospital: HospitalIcon,
  house: HouseIcon,
  home: HouseIcon,
  info: InfoIcon,
  key: KeyIcon,
  lock: LockIcon,
  "lock-open": LockOpenIcon,
  "map-pin": MapPinIcon,
  "message-square": MessageSquareIcon,
  package: PackageIcon,
  phone: PhoneIcon,
  pill: PillIcon,
  radio: RadioIcon,
  search: SearchIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
  shirt: ShirtIcon,
  "shopping-bag": ShoppingBagIcon,
  "shopping-cart": ShoppingCartIcon,
  siren: SirenIcon,
  star: StarIcon,
  store: StoreIcon,
  trash: TrashIcon,
  "triangle-alert": TriangleAlertIcon,
  truck: TruckIcon,
  user: UserIcon,
  users: UsersIcon,
  utensils: UtensilsIcon,
  wallet: WalletIcon,
  wrench: WrenchIcon,
  x: XIcon,
};

/** ox_lib's rule: a string is an image if it contains "://", ".png" or ".webp". */
export function isImageIcon(icon: IntentIcon | null | undefined): boolean {
  return typeof icon === "string" && (icon.includes("://") || icon.includes(".png") || icon.includes(".webp") || icon.includes(".jpg") || icon.includes(".svg"));
}

type FaLookup = { prefix: string; iconName: string };

function parseFa(icon: IntentIcon): FaLookup | null {
  if (Array.isArray(icon)) return icon.length >= 2 ? { prefix: icon[0]!, iconName: icon[1]!.replace(/^fa-/, "") } : null;
  if (typeof icon === "object") return icon;
  let prefix = "fas";
  let name: string | undefined;
  for (const part of icon.trim().split(/\s+/)) {
    if (part === "fas" || part === "fa-solid") prefix = "fas";
    else if (part === "far" || part === "fa-regular") prefix = "far";
    else if (part === "fab" || part === "fa-brands") prefix = "fab";
    else if (part.startsWith("fa-")) name = part.slice(3);
    else name = part;
  }
  return name ? { prefix, iconName: name } : null;
}

type FaModule = typeof import("./fa");
let faModule: FaModule | null = null;
let faLoading: Promise<FaModule> | null = null;

function loadFa(): Promise<FaModule> {
  if (!faLoading) faLoading = import("./fa").then((m) => (faModule = m));
  return faLoading;
}

/** A Font Awesome icon as an inline SVG, fetched on first use. */
function FaIcon({ lookup, className, style, animation }: { lookup: FaLookup; className?: string; style?: CSSProperties; animation?: string }) {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!faModule) void loadFa().then(() => rerender((n) => n + 1));
  }, []);
  if (!faModule) return <span className={cn("inline-block size-4", className)} aria-hidden />;
  const def = faModule.find(lookup.prefix, lookup.iconName);
  if (!def) return null;
  const [w, h, , , path] = def.icon;
  const paths = Array.isArray(path) ? path : [path];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} fill="currentColor" aria-hidden className={cn("size-4 shrink-0", animation && `nk-fa-${animation}`, className)} style={style}>
      {paths.map((d, i) => (
        <path key={i} d={d} opacity={paths.length > 1 && i === 0 ? 0.4 : undefined} />
      ))}
    </svg>
  );
}

/**
 * Draw an intent icon. Without `color` it inherits the text colour, so it follows the theme;
 * `color` is for scripts that insist (ox iconColor). Returns null for nothing drawable.
 */
export function Icon({
  icon,
  color,
  animation,
  allowImage = true,
  className,
  style,
  fallback = null,
}: {
  icon: IntentIcon | null | undefined;
  color?: string;
  animation?: string;
  allowImage?: boolean;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}) {
  if (!icon) return <>{fallback}</>;
  const s = color ? { ...style, color } : style;
  if (isImageIcon(icon)) {
    if (!allowImage) return <>{fallback}</>;
    return <img src={icon as string} alt="" className={cn("size-4 shrink-0 object-contain", className)} style={s} />;
  }
  if (typeof icon === "string") {
    const L = LUCIDE[icon.toLowerCase().replace(/^lucide:/, "")];
    if (L) return <L className={cn("size-4 shrink-0", animation && `nk-fa-${animation}`, className)} style={s} aria-hidden />;
  }
  const lookup = parseFa(icon);
  if (!lookup) return <>{fallback}</>;
  // Font Awesome aliases scripts use for the kit's own status icons.
  const alias = FA_TO_LUCIDE[lookup.iconName];
  if (alias && lookup.prefix === "fas") {
    const L = LUCIDE[alias]!;
    return <L className={cn("size-4 shrink-0", animation && `nk-fa-${animation}`, className)} style={s} aria-hidden />;
  }
  return <FaIcon lookup={lookup} className={className} style={s} animation={animation} />;
}

const FA_TO_LUCIDE: Record<string, string> = {
  "circle-info": "info",
  "info-circle": "info",
  "circle-check": "circle-check",
  "check-circle": "circle-check",
  "circle-xmark": "circle-x",
  "times-circle": "circle-x",
  "circle-exclamation": "circle-alert",
  "exclamation-circle": "circle-alert",
  "triangle-exclamation": "triangle-alert",
  "exclamation-triangle": "triangle-alert",
  xmark: "x",
  times: "x",
  check: "check",
  user: "user",
  users: "users",
  car: "car",
  key: "key",
  lock: "lock",
  "lock-open": "lock-open",
  wrench: "wrench",
  shield: "shield",
  heart: "heart",
  phone: "phone",
  gear: "settings",
  cog: "settings",
  "magnifying-glass": "search",
  search: "search",
  trash: "trash",
  "trash-can": "trash",
  gift: "gift",
  briefcase: "briefcase",
  house: "house",
  home: "house",
  "shopping-cart": "shopping-cart",
  "cart-shopping": "shopping-cart",
  "shopping-bag": "shopping-bag",
  "bag-shopping": "shopping-bag",
  store: "store",
  box: "box",
  "location-dot": "map-pin",
  "map-marker-alt": "map-pin",
  "gas-pump": "fuel",
  "hand-holding": "hand",
  hand: "hand",
  "door-open": "door-open",
  shirt: "shirt",
  "sack-dollar": "coins",
  "money-bill": "dollar-sign",
  "dollar-sign": "dollar-sign",
  wallet: "wallet",
  coins: "coins",
  utensils: "utensils",
  "hospital-user": "hospital",
  clock: "clock",
  star: "star",
  ban: "ban",
  eye: "eye",
  crosshairs: "crosshair",
  pills: "pill",
  truck: "truck",
  comment: "message-square",
  "walkie-talkie": "radio",
};
