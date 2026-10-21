// Font Awesome's free sets, loaded as one chunk the first time a script names an icon the kit's
// lucide set doesn't cover (see icon.tsx). Aliases (ellipsis-h → ellipsis) resolve through FA itself.
import { findIconDefinition, library, type IconDefinition, type IconName, type IconPrefix } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fas } from "@fortawesome/free-solid-svg-icons";

library.add(fas, far, fab);

const PREFIXES: Record<string, IconPrefix> = { fas: "fas", "fa-solid": "fas", far: "far", "fa-regular": "far", fab: "fab", "fa-brands": "fab" };

export function find(prefix: string, name: string): IconDefinition | null {
  const iconName = name.replace(/^fa-/, "") as IconName;
  const p = PREFIXES[prefix] ?? (prefix as IconPrefix);
  for (const candidate of [p, "fas", "far", "fab"] as IconPrefix[]) {
    const def = findIconDefinition({ prefix: candidate, iconName });
    if (def) return def;
  }
  return null;
}
