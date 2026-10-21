/**
 * Images by convention (docs/images.md): one place every nuikit UI asks "what does this item,
 * piece of clothing, vehicle or weapon look like?". `resolveImage(kind, key)` returns the candidate
 * URLs in order; a page tries them one after another (an <img> onError chain, lazy) and falls back
 * to an icon when none load. The templates are the conventions popular servers already use, and a
 * server can add or replace them with convars (`setr nuikit_images_<kind> "…"`), which the nuikit
 * resource publishes to every page through the NUI callback https://nuikit/images.
 *
 * Template placeholders, `{name}` style, URL-encoded on the way in:
 *   item / weapon: {name} (the item name as the inventory knows it), {lower} (lower case)
 *   clothing:      {model} (mp_m_freemode_01), {gender} (male/female), {g} (m/f), {type} (component/prop),
 *                  {kind} (D for a component, P for a prop), {prefix} ("" or "prop_"), {id} (component
 *                  or prop id), {drawable}, {texture}, {collection} (default "base")
 *   vehicle:       {model} (the spawn name, lower case), {hash}
 * A template list is separated by `;` and tried in order. An empty template is skipped.
 */
import { isBrowser } from "./index";

export type ImageKind = "item" | "weapon" | "clothing" | "vehicle";

export interface ClothingKey {
  /** The ped model: mp_m_freemode_01 or mp_f_freemode_01 (other models have no packs). */
  model: string;
  type: "component" | "prop";
  /** Component id (0–11) or prop id (0–7). */
  id: number;
  drawable: number;
  texture?: number;
  /** A clothing collection (base game: "base"). */
  collection?: string;
}

export type ImageKey = string | ClothingKey | { model: string; hash?: number | string };

export type ImageConfig = Record<ImageKind, string[]>;

/**
 * The conventions that work without configuration. Items: ox_inventory's own images, then
 * qb-inventory / ps-inventory / lj-inventory's html/images. Weapons are items. Vehicles: the FiveM
 * docs' images. Clothing has no default: packs differ, so a server names its own (docs/images.md).
 */
export const DEFAULT_IMAGES: ImageConfig = {
  item: [
    "nui://ox_inventory/web/images/{name}.png",
    "nui://qb-inventory/html/images/{name}.png",
    "nui://ps-inventory/html/images/{name}.png",
    "nui://lj-inventory/html/images/{name}.png",
  ],
  weapon: [],
  clothing: [],
  vehicle: ["https://docs.fivem.net/vehicles/{model}.webp"],
};

/** A template string from config: `;`-separated, trimmed, empties dropped. */
export function parseTemplates(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(parseTemplates);
  if (typeof value !== "string") return [];
  return value
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

let config: ImageConfig = { ...DEFAULT_IMAGES };
const listeners = new Set<() => void>();

/** What the server set, merged over the defaults: a server's templates come first, the defaults after. */
export function setImageConfig(server: Partial<Record<ImageKind, unknown>> & { replace?: boolean } | null | undefined): void {
  const next = { ...DEFAULT_IMAGES };
  if (server && typeof server === "object") {
    for (const kind of Object.keys(DEFAULT_IMAGES) as ImageKind[]) {
      const own = parseTemplates(server[kind]);
      if (own.length) next[kind] = server.replace ? own : [...own, ...DEFAULT_IMAGES[kind].filter((t) => !own.includes(t))];
    }
  }
  config = next;
  listeners.forEach((l) => l());
}

export function getImageConfig(): ImageConfig {
  return config;
}

export function onImageConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

let loading: Promise<ImageConfig> | null = null;

/**
 * Ask the nuikit resource for the server's image templates (once per page). In the browser, or
 * without nuikit, the defaults stay. Never rejects.
 */
export function loadImageConfig(): Promise<ImageConfig> {
  if (loading) return loading;
  loading = (async () => {
    if (isBrowser()) return config;
    try {
      const res = await fetch("https://nuikit/images", { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: "{}" });
      if (res.ok) {
        const text = await res.text();
        if (text) setImageConfig(JSON.parse(text));
      }
    } catch {
      /* no nuikit resource: the defaults */
    }
    return config;
  })();
  return loading;
}

const enc = (v: unknown) => encodeURIComponent(String(v ?? ""));

function fill(template: string, values: Record<string, unknown>): string | null {
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = values[k];
    if (v === undefined || v === null || v === "") {
      missing = true;
      return "";
    }
    return enc(v);
  });
  return missing ? null : out;
}

/** Placeholder values for a clothing key. */
export function clothingValues(k: ClothingKey): Record<string, unknown> {
  const female = /^mp_f_/i.test(k.model);
  return {
    model: k.model,
    gender: female ? "female" : "male",
    g: female ? "f" : "m",
    type: k.type,
    kind: k.type === "prop" ? "P" : "D",
    prefix: k.type === "prop" ? "prop_" : "",
    id: k.id,
    drawable: k.drawable,
    texture: k.texture ?? 0,
    collection: k.collection ?? "base",
  };
}

/**
 * Candidate URLs for an image, best first. Empty when nothing is configured for that kind (a
 * clothing pack, for instance): show the plain control or an icon then.
 */
export function resolveImage(kind: ImageKind, key: ImageKey, cfg: ImageConfig = config): string[] {
  let values: Record<string, unknown>;
  let templates: string[];
  if (kind === "clothing") {
    if (!key || typeof key !== "object" || !("type" in key)) return [];
    values = clothingValues(key);
    templates = cfg.clothing;
  } else if (kind === "vehicle") {
    const model = typeof key === "string" ? key : key && "model" in key ? key.model : "";
    if (!model) return [];
    values = { model: String(model).toLowerCase(), hash: typeof key === "object" && key && "hash" in key ? key.hash : undefined };
    templates = cfg.vehicle;
  } else {
    const name = typeof key === "string" ? key : "";
    if (!name) return [];
    values = { name, lower: name.toLowerCase() };
    // weapons are items: their own templates first, then the item ones
    templates = kind === "weapon" ? [...cfg.weapon, ...cfg.item] : cfg.item;
  }
  const out: string[] = [];
  for (const t of templates) {
    const url = fill(t, values);
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}

/** Whether a server configured clothing previews (the pickers show thumbnails only then). */
export const hasClothingImages = (cfg: ImageConfig = config) => cfg.clothing.length > 0;

/** For tests. */
export function __resetImages(): void {
  config = { ...DEFAULT_IMAGES };
  loading = null;
  listeners.clear();
}
