import { ClothingGrid } from "@/components/clothing-grid";
import { Fields, Stepper } from "@/components/controls";
import { Group, Groups } from "@/components/group";
import { useLoaded } from "@/lib/store";
import type { ShopConfig } from "@/lib/types";

type CL = ReturnType<typeof useLoaded>["locale"]["components"];
type PL = ReturnType<typeof useLoaded>["locale"]["props"];

// Display order and gating per docs/illenium-appearance-protocol.md §4.1.
const COMPONENTS: { id: number; label: keyof CL; flag?: keyof ShopConfig["componentConfig"] }[] = [
  { id: 0, label: "head" },
  { id: 1, label: "mask", flag: "masks" },
  { id: 7, label: "scarfAndChains", flag: "scarfAndChains" },
  { id: 11, label: "jackets", flag: "jackets" },
  { id: 8, label: "shirt", flag: "shirts" },
  { id: 9, label: "bodyArmor", flag: "bodyArmor" },
  { id: 5, label: "bags", flag: "bags" },
  { id: 3, label: "upperBody", flag: "upperBody" },
  { id: 4, label: "lowerBody", flag: "lowerBody" },
  { id: 6, label: "shoes", flag: "shoes" },
  { id: 10, label: "decals", flag: "decals" },
];
const PROPS: { id: number; label: keyof PL; flag: keyof ShopConfig["propConfig"] }[] = [
  { id: 0, label: "hats", flag: "hats" },
  { id: 1, label: "glasses", flag: "glasses" },
  { id: 2, label: "ear", flag: "ear" },
  { id: 6, label: "watches", flag: "watches" },
  { id: 7, label: "bracelets", flag: "bracelets" },
];

export function ComponentsSection() {
  const { locale, settings, current, baseline: stored, config, isFreemode, actions } = useLoaded();
  const L = locale.components;
  const visible = COMPONENTS.filter((c) => {
    if (c.id === 0) return !isFreemode;
    if (c.id === 7 && config.hasTracker) return false;
    return c.flag ? config.componentConfig?.[c.flag] !== false : true;
  });
  return (
    <Groups open={visible.slice(0, 1).map((c) => String(c.id))}>
      {visible.map((c) => {
        const s = settings.components.find((x) => x.component_id === c.id);
        const v = current.components.find((x) => x.component_id === c.id);
        const o = stored.components.find((x) => x.component_id === c.id);
        if (!s || !v) return null;
        return (
          <Group key={c.id} value={String(c.id)} title={L[c.label]} meta={v.drawable} changed={!!o && (o.drawable !== v.drawable || o.texture !== v.texture)}>
            <Fields cols={2}>
              <Stepper
                label={L.drawable}
                value={v.drawable}
                original={o?.drawable}
                min={s.drawable.min}
                max={s.drawable.max}
                blacklist={s.blacklist?.drawables}
                onChange={(x) => void actions.component(c.id, "drawable", x)}
              />
              <Stepper
                label={L.texture}
                value={v.texture}
                original={o && o.drawable === v.drawable ? o.texture : undefined}
                min={s.texture.min}
                max={s.texture.max}
                blacklist={s.blacklist?.textures}
                onChange={(x) => void actions.component(c.id, "texture", x)}
              />
            </Fields>
            <ClothingGrid mode="drawables" model={current.model} type="component" id={c.id} drawable={v.drawable} texture={v.texture} min={s.drawable.min} max={s.drawable.max} blacklist={s.blacklist?.drawables} onPick={(x) => void actions.component(c.id, "drawable", x)} />
            <ClothingGrid mode="textures" model={current.model} type="component" id={c.id} drawable={v.drawable} texture={v.texture} min={s.texture.min} max={s.texture.max} blacklist={s.blacklist?.textures} onPick={(x) => void actions.component(c.id, "texture", x)} />
          </Group>
        );
      })}
    </Groups>
  );
}

export function PropsSection() {
  const { locale, settings, current, baseline: stored, config, actions } = useLoaded();
  const L = locale.props;
  const visible = PROPS.filter((p) => config.propConfig?.[p.flag] !== false);
  return (
    <Groups open={visible.slice(0, 1).map((p) => String(p.id))}>
      {visible.map((p) => {
        const s = settings.props.find((x) => x.prop_id === p.id);
        const v = current.props.find((x) => x.prop_id === p.id);
        const o = stored.props.find((x) => x.prop_id === p.id);
        if (!s || !v) return null;
        const none = v.drawable < 0;
        return (
          <Group
            key={p.id}
            value={String(p.id)}
            title={L[p.label]}
            meta={none ? "None" : v.drawable}
            changed={!!o && (o.drawable !== v.drawable || o.texture !== v.texture)}
          >
            <Fields cols={2}>
              <Stepper
                label={L.drawable}
                hint={none ? "None" : undefined}
                value={v.drawable}
                original={o?.drawable}
                min={s.drawable.min}
                max={s.drawable.max}
                blacklist={s.blacklist?.drawables}
                onChange={(x) => void actions.prop(p.id, "drawable", x)}
              />
              <Stepper
                label={L.texture}
                value={v.texture}
                original={o && o.drawable === v.drawable ? o.texture : undefined}
                min={none ? v.texture : Math.max(0, s.texture.min)}
                max={none ? v.texture : s.texture.max}
                blacklist={s.blacklist?.textures}
                onChange={(x) => void actions.prop(p.id, "texture", x)}
              />
            </Fields>
            <ClothingGrid mode="drawables" model={current.model} type="prop" id={p.id} drawable={v.drawable} texture={v.texture} min={Math.max(0, s.drawable.min)} max={s.drawable.max} blacklist={s.blacklist?.drawables} onPick={(x) => void actions.prop(p.id, "drawable", x)} />
            {!none && <ClothingGrid mode="textures" model={current.model} type="prop" id={p.id} drawable={v.drawable} texture={v.texture} min={Math.max(0, s.texture.min)} max={s.texture.max} blacklist={s.blacklist?.textures} onPick={(x) => void actions.prop(p.id, "texture", x)} />}
          </Group>
        );
      })}
    </Groups>
  );
}
