import { Fields, RangeSlider, Stepper, Swatches } from "@/components/controls";
import { Group, Groups } from "@/components/group";
import { EYE_COLOR_NAMES } from "@/lib/locale";
import { useLoaded } from "@/lib/store";
import type { HeadOverlay } from "@/lib/types";

// Display order: the ones people change most first.
const OVERLAYS: HeadOverlay[] = [
  "eyebrows",
  "beard",
  "makeUp",
  "blush",
  "lipstick",
  "blemishes",
  "ageing",
  "complexion",
  "sunDamage",
  "moleAndFreckles",
  "chestHair",
  "bodyBlemishes",
];

export function HairSection() {
  const { locale, settings, current, baseline: stored, config, isFreemode, actions } = useLoaded();
  const L = locale.headOverlays;
  const hs = settings.hair;
  const fades = settings.tattoos.items.ZONE_HAIR ?? [];
  const fadeIndex = (t = current.tattoos) => Math.max(0, fades.findIndex((f) => f.name === t.ZONE_HAIR?.[0]?.name));
  const hairChanged = (["style", "texture", "color", "highlight"] as const).some((k) => current.hair[k] !== stored.hair[k]);

  return (
    <Groups open={["hair"]}>
      <Group value="hair" title={L.hair.title} meta={`${current.hair.style}·${current.hair.texture}`} changed={hairChanged}>
        <Fields cols={2}>
          <Stepper
            label={L.hair.style}
            value={current.hair.style}
            original={stored.hair.style}
            min={hs.style.min}
            max={hs.style.max}
            blacklist={hs.blacklist?.drawables}
            onChange={(v) => void actions.hair("style", v)}
          />
          <Stepper
            label={L.hair.texture}
            value={current.hair.texture}
            original={stored.hair.texture}
            min={hs.texture.min}
            max={hs.texture.max}
            blacklist={hs.blacklist?.textures}
            onChange={(v) => void actions.hair("texture", v)}
          />
        </Fields>
        {isFreemode && (
          <>
            {!config.automaticFade && fades.length > 0 && (
              <Stepper
                label={L.hair.fade}
                hint={fades[fadeIndex()]?.label}
                value={fadeIndex()}
                original={fadeIndex(stored.tattoos)}
                min={0}
                max={fades.length - 1}
                onChange={(v) => void actions.fade(v)}
              />
            )}
            <Swatches label={L.hair.color} colors={hs.color.items} value={current.hair.color} original={stored.hair.color} onChange={(v) => void actions.hair("color", v)} />
            <Swatches
              label={L.hair.highlight}
              colors={hs.highlight.items}
              value={current.hair.highlight}
              original={stored.hair.highlight}
              onChange={(v) => void actions.hair("highlight", v)}
            />
          </>
        )}
      </Group>

      {isFreemode && (
        <Group value="eyeColor" title={L.eyeColor} meta={EYE_COLOR_NAMES[current.eyeColor]} changed={current.eyeColor !== stored.eyeColor}>
          <Stepper
            label={L.style}
            hint={EYE_COLOR_NAMES[current.eyeColor]}
            value={current.eyeColor}
            original={stored.eyeColor}
            min={settings.eyeColor.min}
            max={settings.eyeColor.max}
            onChange={actions.eyeColor}
          />
        </Group>
      )}

      {isFreemode &&
        OVERLAYS.map((o) => {
          const os = settings.headOverlays[o];
          const v = current.headOverlays[o];
          const sv = stored.headOverlays[o];
          if (!os || !v) return null;
          const changed = !!sv && (v.style !== sv.style || v.opacity !== sv.opacity || v.color !== sv.color || v.secondColor !== sv.secondColor);
          return (
            <Group key={o} value={o} title={L[o]} meta={v.opacity > 0 ? `${v.style} · ${Math.round(v.opacity * 100)}%` : "off"} changed={changed}>
              <Stepper label={L.style} value={v.style} original={sv?.style} min={os.style.min} max={os.style.max} onChange={(x) => actions.headOverlay(o, "style", x)} />
              <RangeSlider
                label={L.opacity}
                value={v.opacity}
                original={sv?.opacity}
                min={os.opacity.min}
                max={os.opacity.max}
                step={os.opacity.factor ?? 0.1}
                percent
                onChange={(x) => actions.headOverlay(o, "opacity", x)}
              />
              {os.color && (
                <Swatches label={L.color} colors={os.color.items} value={v.color} original={sv?.color} onChange={(x) => actions.headOverlay(o, "color", x)} />
              )}
              {os.color && o === "makeUp" && (
                <Swatches
                  label={L.secondColor}
                  colors={os.color.items}
                  value={v.secondColor}
                  original={sv?.secondColor}
                  onChange={(x) => actions.headOverlay(o, "secondColor", x)}
                />
              )}
            </Group>
          );
        })}
    </Groups>
  );
}
