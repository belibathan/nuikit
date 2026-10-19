import { findIconDefinition, library, type IconLookup, type IconName, type IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@/lib/utils";

// Scripts pass Font Awesome class strings ('fa-solid fa-car', 'fas fa-box', 'fa-regular fa-hand',
// sometimes a bare 'car'), so every free icon is bundled; the game may be offline.
library.add(fas, far, fab);

const PREFIXES: Record<string, IconPrefix> = {
  fas: "fas",
  "fa-solid": "fas",
  far: "far",
  "fa-regular": "far",
  fab: "fab",
  "fa-brands": "fab",
};

/** FA classes that style an icon rather than name it. */
const MODIFIER = /^fa-(fw|xs|sm|lg|xl|2xs|2xl|[1-9]0?x|spin|spin-pulse|spin-reverse|pulse|beat|fade|beat-fade|bounce|shake|flip|flip-horizontal|flip-vertical|flip-both|rotate-\d+|border|inverse|li|ul|stack|stack-1x|stack-2x|pull-left|pull-right|sharp|light|thin|duotone)$/;

/** Resolve an ox_target icon string to a Font Awesome lookup, or null. */
export function lookup(icon: unknown): IconLookup | null {
  if (typeof icon !== "string" || !icon.trim()) return null;
  let prefix: IconPrefix | undefined;
  let name: string | undefined;
  for (const part of icon.trim().split(/\s+/)) {
    if (PREFIXES[part]) prefix = PREFIXES[part];
    else if (MODIFIER.test(part)) continue;
    else if (part.startsWith("fa-")) name = part.slice(3);
    else if (!part.startsWith("fa")) name = part;
  }
  if (!name) return null;
  for (const candidate of [prefix ?? "fas", "fas", "far", "fab"] as IconPrefix[]) {
    const def = findIconDefinition({ prefix: candidate, iconName: name as IconName });
    if (def) return def;
  }
  return null;
}

/** A Font Awesome icon from a class string. Without `color` it inherits the text colour. */
export function Icon({ icon, color, className }: { icon: unknown; color?: string; className?: string }) {
  const def = lookup(icon);
  if (!def) return null;
  return <FontAwesomeIcon icon={def} fixedWidth className={cn("shrink-0", className)} style={color ? { color } : undefined} />;
}
