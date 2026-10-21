// challenge → `skill-check`, centred. One round per difficulty entry; a miss ends it (false), the
// last hit resolves true. The page reads the key: nuikit's Lua gives this frame keyboard focus
// (surface intent:challenge, no cursor) while a challenge is open.
import type { ChallengeProps, IntentDifficulty } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useMemo, useState } from "react";
import { SKILL_CHECK_PRESETS, SkillCheck, skillCheckZone } from "@/components/ui/skill-check";

function ChallengeRenderer({ intents, ctx }: RendererProps<"challenge">) {
  const top = intents[intents.length - 1];
  if (!top) return null;
  return <OneChallenge key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

type Round = { zoneStart: number; zoneSize: number; speed: number; key: string };

function rounds(props: ChallengeProps): Round[] {
  const list: IntentDifficulty[] = Array.isArray(props.difficulty) ? props.difficulty : [props.difficulty ?? "easy"];
  const keys = props.keys?.length ? props.keys : ["E"];
  return list.map((d) => {
    const preset = typeof d === "string" ? SKILL_CHECK_PRESETS[d] ?? SKILL_CHECK_PRESETS.easy : { zoneSize: d.areaSize, speed: Math.max(0.0001, d.speedMultiplier) };
    return { zoneStart: skillCheckZone(preset.zoneSize).start, zoneSize: preset.zoneSize, speed: preset.speed, key: keys[Math.floor(Math.random() * keys.length)]!.toUpperCase() };
  });
}

function OneChallenge({ id, props, ctx }: { id: string; props: ChallengeProps; ctx: RendererProps<"challenge">["ctx"] }) {
  const all = useMemo(() => rounds(props), [props]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<"success" | "fail" | undefined>();
  const round = all[index]!;
  const strict = !!props.keys?.length;

  // The component judges the round's own key. Other keys: with a `keys` list, the listed ones fail
  // the round and the rest are ignored; without one, any key fails it (ox).
  useEffect(() => {
    if (result) return;
    const listed = (props.keys ?? []).map((k) => k.toUpperCase());
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (k === round.key) return;
      if (strict && !listed.includes(k)) return;
      e.preventDefault();
      finish(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strict, result, index]);

  const finish = (hit: boolean) => {
    ctx.emit(id, "round", { index: index + 1, hit });
    if (hit && index + 1 < all.length) {
      setIndex(index + 1);
      return;
    }
    setResult(hit ? "success" : "fail");
    setTimeout(() => ctx.resolve(id, hit), 250);
  };

  return (
    <div data-intent="challenge" className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <SkillCheck
          key={index}
          size={props.size ?? "default"}
          zoneStart={round.zoneStart}
          zoneSize={round.zoneSize}
          speed={round.speed}
          keyLabel={round.key}
          running={!result}
          listen
          result={result}
          onResult={(hit) => finish(hit)}
        />
        {props.label && <span className="nk-shadow text-sm font-medium text-(color:--hud-foreground)">{props.label}</span>}
        {all.length > 1 && (
          <span className="nk-shadow nk-num text-xs text-(color:--hud-foreground) opacity-80">
            {index + 1} / {all.length}
          </span>
        )}
      </div>
    </div>
  );
}

export default defineReactRenderer({ kind: "challenge", Component: ChallengeRenderer, version: 1 });
