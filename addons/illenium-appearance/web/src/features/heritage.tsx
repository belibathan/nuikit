import { Fields, RangeSlider, Stepper } from "@/components/controls";
import { Group, Groups } from "@/components/group";
import { useLoaded } from "@/lib/store";
import type { FaceFeature, HeadBlendKey } from "@/lib/types";

export function HeritageSection() {
  const { locale, settings, current, baseline: stored, actions } = useLoaded();
  const L = locale.headBlend;
  const s = settings.headBlend;
  const idx = (key: HeadBlendKey, label: string) => (
    <Stepper
      label={label}
      value={current.headBlend[key]}
      original={stored.headBlend[key]}
      min={s[key]?.min ?? 0}
      max={s[key]?.max ?? 45}
      onChange={(v) => actions.headBlend(key, v)}
    />
  );
  const mix = (key: HeadBlendKey, label: string, ends: [string, string]) => (
    <RangeSlider
      label={label}
      value={current.headBlend[key]}
      original={stored.headBlend[key]}
      min={s[key]?.min ?? 0}
      max={s[key]?.max ?? 1}
      step={s[key]?.factor ?? 0.1}
      ends={ends}
      percent
      onChange={(v) => actions.headBlend(key, v)}
    />
  );
  const changed = (keys: HeadBlendKey[]) => keys.some((k) => current.headBlend[k] !== stored.headBlend[k]);

  return (
    <Groups open={["shape", "skin"]}>
      <Group value="shape" title={L.shape.title} changed={changed(["shapeFirst", "shapeSecond", "shapeMix"])}>
        <Fields cols={2}>
          {idx("shapeFirst", L.shape.firstOption)}
          {idx("shapeSecond", L.shape.secondOption)}
        </Fields>
        {mix("shapeMix", L.shape.mix, [L.shape.firstOption, L.shape.secondOption])}
      </Group>
      <Group value="skin" title={L.skin.title} changed={changed(["skinFirst", "skinSecond", "skinMix"])}>
        <Fields cols={2}>
          {idx("skinFirst", L.skin.firstOption)}
          {idx("skinSecond", L.skin.secondOption)}
        </Fields>
        {mix("skinMix", L.skin.mix, [L.skin.firstOption, L.skin.secondOption])}
      </Group>
      <Group value="race" title={L.race.title} changed={changed(["shapeThird", "skinThird", "thirdMix"])}>
        <Fields cols={2}>
          {idx("shapeThird", L.race.shape)}
          {idx("skinThird", L.race.skin)}
        </Fields>
        {mix("thirdMix", L.race.mix, ["0", "1"])}
      </Group>
    </Groups>
  );
}

type FaceLocale = ReturnType<typeof useLoaded>["locale"]["faceFeatures"];
const FACE_GROUPS: { id: keyof Omit<FaceLocale, "title">; features: [FaceFeature, string][] }[] = [
  { id: "nose", features: [["noseWidth", "width"], ["nosePeakHigh", "height"], ["nosePeakSize", "size"], ["noseBoneHigh", "boneHeight"], ["nosePeakLowering", "peakHeight"], ["noseBoneTwist", "boneTwist"]] },
  { id: "eyebrows", features: [["eyeBrownHigh", "height"], ["eyeBrownForward", "depth"]] },
  { id: "cheeks", features: [["cheeksBoneHigh", "boneHeight"], ["cheeksBoneWidth", "boneWidth"], ["cheeksWidth", "width"]] },
  { id: "eyesAndMouth", features: [["eyesOpening", "eyesOpening"], ["lipsThickness", "lipsThickness"]] },
  { id: "jaw", features: [["jawBoneWidth", "width"], ["jawBoneBackSize", "size"]] },
  { id: "chin", features: [["chinBoneLowering", "lowering"], ["chinBoneLenght", "length"], ["chinBoneSize", "size"], ["chinHole", "hole"]] },
  { id: "neck", features: [["neckThickness", "thickness"]] },
];

export function FaceSection() {
  const { locale, settings, current, baseline: stored, actions } = useLoaded();
  const L = locale.faceFeatures;
  return (
    <Groups open={["nose"]}>
      {FACE_GROUPS.map((g) => {
        const gl = L[g.id] as Record<string, string>;
        return (
          <Group key={g.id} value={g.id} title={gl.title} changed={g.features.some(([f]) => current.faceFeatures[f] !== stored.faceFeatures[f])}>
            {g.features.map(([f, key]) => {
              const r = settings.faceFeatures[f];
              return (
                <RangeSlider
                  key={f}
                  label={gl[key] ?? f}
                  value={current.faceFeatures[f] ?? 0}
                  original={stored.faceFeatures[f]}
                  min={r?.min ?? -1}
                  max={r?.max ?? 1}
                  step={r?.factor ?? 0.1}
                  onChange={(v) => actions.faceFeature(f, v)}
                />
              );
            })}
          </Group>
        );
      })}
    </Groups>
  );
}
