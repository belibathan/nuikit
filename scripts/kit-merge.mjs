// The kit-aware cn(): a tailwind-merge config generated from packages/create-nuikit/kit.css.
//
// tailwind-merge runs in the browser and can't read the CSS, so it doesn't know the nk-* utilities: a stock
// class that sets the same property survives next to one (item-slot, 86cf7cd: nk-chip-active kept
// text-hud-foreground, white on white). This reads every `@utility nk-*` in kit.css, maps the properties it
// sets to tailwind-merge's class groups, and writes registry/nuikit/lib/utils.ts, which pnpm sync copies
// into every UI's lib/utils.ts (and the registry serves as the `utils` item).
//
// Rules the generated config encodes:
//   - every nk-* utility is its own class group, so a repeat collapses;
//   - a kit utility removes the EARLIER stock classes that set what it paints: colour and type (PAINT
//     below). Layout (display, size, padding, position…) stays the author's, and so do shape and
//     elevation for now (see PAINT);
//   - a stock class never removes a kit utility (it would take the utility's other properties with it);
//   - `@merge <family>` in the comment above a utility puts it in a family: a later member removes an
//     earlier one (one type style, one surface, one anchor per element);
//   - a font size still removes an earlier leading-* (tailwind-merge's default; countdown, 4f50a95). In
//     Tailwind v4 leading-* wins in any order, so that's stricter than the CSS, but turning it off would
//     change shipped line heights (shadcn's CardTitle leading-none under a text-* className). The rule
//     instead: a size variant sets its own leading (docs/design/contract.md).
//
// A property this file doesn't classify fails the sync, so a new utility gets a decision, not a guess.
import { getDefaultConfig } from "tailwind-merge";

/**
 * CSS property → the tailwind-merge groups a kit utility setting it overrides: what the kit paints.
 * Shape and elevation (radius, shadow, border, filter) aren't merged: shadcn bases carry rounded-*, border
 * and shadow-* under a kit className (DialogContent + nk-panel) and those win in the CSS today, so merging
 * them would change how shipped screens look. Revisit with visual baselines in place.
 */
const PAINT = {
  color: ["text-color"],
  "background-color": ["bg-color"],
  "font-family": ["font-family"],
  "font-size": ["font-size"],
  "line-height": ["leading"],
  "font-weight": ["font-weight"],
  "letter-spacing": ["tracking"],
  "text-transform": ["text-transform"],
  "font-variant-numeric": ["fvn-spacing"],
};
/** Properties a kit utility sets that stay out of merging: layout, shape, elevation, motion, engine details. */
const LAYOUT = new Set([
  "border-radius", "box-shadow", "text-shadow", "filter", "border", "border-top", "border-bottom", "background-image",
  "display", "position", "top", "right", "bottom", "left", "width", "height", "min-width", "min-height",
  "padding", "padding-left", "margin-left", "margin-top", "margin-inline", "margin-block", "gap", "flex", "flex-direction",
  "align-items", "justify-content", "text-align", "white-space", "overflow", "overflow-y", "scrollbar-width", "scrollbar-gutter",
  "clip-path", "transition-property", "transition-duration", "transition-timing-function", "transition", "animation",
  "transform", "transform-origin", "background-position", "background-size", "background-repeat", "background-origin",
  "content", "inset", "opacity", "pointer-events",
]);

/** Parse kit.css: every `@utility nk-*` with its top-level properties and its `@merge` family. */
export function parseKit(css) {
  const utilities = [];
  const re = /@utility\s+(nk-[\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    const name = m[1];
    // the comment right above the utility (if any) may carry `@merge <family>`
    const before = css.slice(0, m.index).trimEnd();
    const comment = before.endsWith("*/") ? before.slice(before.lastIndexOf("/*")) : "";
    const family = comment.match(/@merge\s+([\w-]+)/)?.[1] ?? null;
    // the block body, and its top-level declarations (nested & blocks and comments skipped)
    let depth = 1;
    let i = re.lastIndex;
    let top = "";
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === "/" && css[i + 1] === "*") {
        i = css.indexOf("*/", i + 2) + 2;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (depth === 1) top += ch;
      if (depth > 1 && ch === "{") top = top.replace(/[^;]*$/, ""); // drop the nested selector
      i++;
    }
    const properties = [...top.matchAll(/(?:^|;)\s*(-?-?[a-z][\w-]*)\s*:/g)].map((p) => p[1]).filter((p) => !p.startsWith("--"));
    utilities.push({ name, family, properties: [...new Set(properties)] });
  }
  return utilities;
}

/** The groups `group` covers, with tailwind-merge's own sub-groups (rounded → rounded-t → rounded-tl…). */
function expand(group, defaults, out = new Set()) {
  if (out.has(group)) return out;
  out.add(group);
  for (const g of defaults.conflictingClassGroups[group] ?? []) expand(g, defaults, out);
  return out;
}

/** The extendTailwindMerge config for kit.css: { classGroups, conflictingClassGroups }. */
export function kitMergeConfig(css) {
  const defaults = getDefaultConfig();
  const utilities = parseKit(css);
  const unknown = [];
  const classGroups = {};
  const conflictingClassGroups = {};
  for (const u of utilities) {
    classGroups[u.name] = [u.name];
    const groups = new Set();
    for (const p of u.properties) {
      if (PAINT[p]) for (const g of PAINT[p]) expand(g, defaults, groups);
      else if (!LAYOUT.has(p)) unknown.push(`${u.name}: ${p}`);
    }
    for (const other of utilities) if (u.family && other.family === u.family && other.name !== u.name) groups.add(other.name);
    for (const g of groups) if (!(g in defaults.classGroups) && !(g in classGroups) && !utilities.some((x) => x.name === g)) unknown.push(`${u.name}: tailwind-merge has no group "${g}"`);
    if (groups.size) conflictingClassGroups[u.name] = [...groups].sort();
  }
  if (unknown.length) {
    throw new Error(
      `scripts/kit-merge.mjs: classify these kit.css properties (PAINT merges them, LAYOUT leaves them alone):\n  ${unknown.join("\n  ")}`,
    );
  }
  return { utilities, classGroups, conflictingClassGroups };
}

/** registry/nuikit/lib/utils.ts, generated. */
export function kitMergeSource(css) {
  const { utilities, classGroups, conflictingClassGroups } = kitMergeConfig(css);
  const ids = utilities.map((u) => `\n  | ${JSON.stringify(u.name)}`).join("");
  const obj = (o) =>
    Object.entries(o)
      .map(([k, v]) => `      ${JSON.stringify(k)}: [${v.map((x) => JSON.stringify(x)).join(", ")}],`)
      .join("\n");
  return `// Generated from packages/create-nuikit/kit.css by pnpm sync (scripts/kit-merge.mjs): don't edit.
// cn() that knows the nk-* kit. A kit utility removes the earlier stock classes that set what it paints
// (colour and type), never layout or shape; one type style, surface or anchor per element.
import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

type KitClassGroup =${ids}

const twMerge = extendTailwindMerge<KitClassGroup>({
  extend: {
    classGroups: {
${obj(classGroups)}
    },
    conflictingClassGroups: {
${obj(conflictingClassGroups)}
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`;
}
