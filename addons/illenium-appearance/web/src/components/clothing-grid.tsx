// Preview thumbnails for drawables and textures, when the server names a clothing image pack
// (setr nuikit_images_clothing, docs/images.md). Each tile picks the value its stepper would; the
// selected one is ringed. Without a pack nothing renders and the steppers stay the only control.
import { hasClothingImages } from "nuikit-core";
import { NuiImage, useImageConfig } from "@/components/ui/nui-image";
import { cn } from "@/lib/utils";

export function ClothingGrid({
  model,
  type,
  id,
  drawable,
  texture,
  min,
  max,
  blacklist,
  mode,
  onPick,
}: {
  model: string;
  type: "component" | "prop";
  id: number;
  drawable: number;
  texture: number;
  min: number;
  max: number;
  blacklist?: number[];
  /** drawables: a tile per drawable (texture 0); textures: a tile per texture of the current drawable */
  mode: "drawables" | "textures";
  onPick: (value: number) => void;
}) {
  const config = useImageConfig();
  if (!hasClothingImages(config) || !/^mp_[mf]_freemode_01$/i.test(model) || max < min) return null;
  const blocked = new Set(blacklist ?? []);
  const values: number[] = [];
  for (let v = min; v <= max && values.length < 400; v++) if (!blocked.has(v)) values.push(v);
  const current = mode === "drawables" ? drawable : texture;

  return (
    <div className={cn("grid gap-1.5", mode === "drawables" ? "grid-cols-4" : "grid-cols-6")} role="radiogroup">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === current}
          aria-label={`${mode === "drawables" ? "Item" : "Variant"} ${v}`}
          onClick={() => v !== current && onPick(v)}
          data-selected={v === current || undefined}
          className="ia-thumb"
        >
          <NuiImage
            kind="clothing"
            imageKey={{ model, type, id, drawable: mode === "drawables" ? v : drawable, texture: mode === "drawables" ? 0 : v }}
            className="size-full"
            fallback={<span />}
          />
          <span className="ia-thumb-num nk-num">{v}</span>
        </button>
      ))}
    </div>
  );
}
