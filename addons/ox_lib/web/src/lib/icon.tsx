import { findIconDefinition, library, type IconLookup, type IconName, type IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Scripts pass Font Awesome names ('car', 'fa-car', 'fas fa-car', 'fa-solid fa-car', 'fab fa-discord')
// or an image URL, so every free FA icon has to be available.
library.add(fas, far, fab);

export type IconInput = string | [string, string] | { prefix: string; iconName: string } | undefined | null;

const PREFIXES: Record<string, IconPrefix> = {
  fas: "fas",
  "fa-solid": "fas",
  far: "far",
  "fa-regular": "far",
  fab: "fab",
  "fa-brands": "fab",
};

export function isImage(icon: IconInput): icon is string {
  return typeof icon === "string" && /^(https?:|nui:|data:|\.{0,2}\/)/.test(icon);
}

/** Resolve any ox_lib icon value to a Font Awesome lookup, or null. */
export function lookup(icon: IconInput): IconLookup | null {
  if (!icon) return null;
  if (Array.isArray(icon)) return find(icon[0], icon[1]);
  if (typeof icon === "object") return find(icon.prefix, icon.iconName);
  if (isImage(icon)) return null;
  const parts = icon.trim().split(/\s+/);
  let prefix: IconPrefix | undefined;
  let name: string | undefined;
  for (const part of parts) {
    if (PREFIXES[part]) prefix = PREFIXES[part];
    else if (part.startsWith("fa-")) name = part.slice(3);
    else name = part;
  }
  return name ? find(prefix ?? "fas", name) : null;
}

function find(prefix: string, name: string): IconLookup | null {
  const iconName = name.replace(/^fa-/, "") as IconName;
  const p = (PREFIXES[prefix] ?? prefix) as IconPrefix;
  for (const candidate of [p, "fas", "far", "fab"] as IconPrefix[]) {
    const def = findIconDefinition({ prefix: candidate, iconName });
    if (def) return def;
  }
  return null;
}

export type IconAnimation = "spin" | "spinPulse" | "spinReverse" | "pulse" | "beat" | "fade" | "beatFade" | "bounce" | "shake";

/**
 * An ox_lib icon: a Font Awesome name or an image URL. `color` accepts any CSS colour;
 * without it the icon inherits text colour, so it follows the theme.
 */
export function Icon({
  icon,
  color,
  animation,
  className,
  style,
}: {
  icon: IconInput;
  color?: string;
  animation?: IconAnimation | string;
  className?: string;
  style?: CSSProperties;
}) {
  if (isImage(icon)) return <img src={icon} alt="" className={cn("size-4 shrink-0 object-contain", className)} style={style} />;
  const def = lookup(icon);
  if (!def) return null;
  const a = animation as IconAnimation | undefined;
  return (
    <FontAwesomeIcon
      icon={def}
      fixedWidth
      className={cn("shrink-0", className)}
      style={{ color: color ?? undefined, ...style }}
      spin={a === "spin"}
      spinPulse={a === "spinPulse"}
      spinReverse={a === "spinReverse"}
      pulse={a === "pulse"}
      beat={a === "beat"}
      fade={a === "fade"}
      beatFade={a === "beatFade"}
      bounce={a === "bounce"}
      shake={a === "shake"}
    />
  );
}
