// The status row (both layouts), built from the kit's VitalChip anatomy (components/ui/vital-chip):
// one shape path per chip, its level (outline trace, liquid fill, bar), its label attachment and a pop.
//
// Hierarchy (docs/design.md): communication is what roleplay is about, so voice and radio are the
// primary layer: always there, first in the row, a step larger and heavier. The vitals are secondary
// self-management: each shows on change or past its threshold, then fades back (vitals.tsx useShown),
// and a change pops a callout with its name and the difference ("Hunger +25").
//
// The style comes from the theme tokens (--nk-chip-shape, --nk-level-style, --nk-label-attach,
// --nk-vital-icon) and a player's override (/hudstyle, kept in KVP by client/style.lua and sent as
// `hud:style`). Icon + level + the critical state, never colour alone; the value is in aria-valuenow.
import { onNui } from "nuikit-core";
import { fetchNui, type NuiPlayer } from "nuikit-core/react";
import { MicIcon, RadioIcon } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { HudSettings, VitalMode } from "../nui";
import { VitalChip } from "@/components/ui/vital-chip";
import { ICONS, LABELS, useShown, vitalCritical, type Tone } from "./vitals";

type PopMode = false | "change" | "threshold";

interface VitalProps {
  tone: Tone;
  value: number | undefined;
  mode: VitalMode;
  low: number;
  high: number;
  linger: number;
  pop: PopMode;
  force: { by: number; nonce: number } | null;
}

/** One vital: the icon in a chip whose level shows the value; a pop when it changes. */
export function VitalItem({ tone, value, mode, low, high, linger, pop, force }: VitalProps) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const critical = value !== undefined && vitalCritical(tone, v, low, high);
  const shownByRule = useShown(value === undefined ? undefined : v, mode, critical, linger);
  // a pop keeps the chip on screen while it shows (a test pop on a hidden vital included)
  const [popping, setPopping] = useState(false);
  const onShow = useCallback((s: boolean) => setPopping(s), []);
  const shown = (shownByRule || popping) && mode !== false && value !== undefined;
  return (
    <div data-slot="hud-vital" data-tone={tone} data-shown={shown || undefined} data-critical={critical || undefined} className="hud-vchip" aria-hidden={!shown}>
      <VitalChip.Root value={v} tone={tone} role="meter" aria-label={`${LABELS[tone]} ${v}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
        <VitalChip.Shape>
          <VitalChip.Icon>{ICONS[tone]}</VitalChip.Icon>
        </VitalChip.Shape>
        <VitalChip.Pop label={LABELS[tone]} mode={pop} critical={critical} force={force} onShow={onShow} />
      </VitalChip.Root>
    </div>
  );
}

/** Voice: the primary chip, always there; lit while talking; the range shows when it changes. */
function VoiceChip({ voice, linger }: { voice: NuiPlayer["voice"]; linger: number }) {
  const range = voice.mode ?? (voice.range === undefined ? undefined : `${Math.round(voice.range * 10) / 10} m`);
  const changed = useShown(range, "auto", false, linger);
  if (range === undefined) return null;
  return (
    <div data-slot="hud-voice" data-active={voice.talking || undefined} data-shown className="hud-vchip hud-comms" aria-label={voice.talking ? `Talking, ${range}` : `Voice range ${range}`}>
      <VitalChip.Root open={changed || voice.talking} icon="uniform">
        <VitalChip.Shape>
          <VitalChip.Icon>
            <MicIcon />
          </VitalChip.Icon>
          <VitalChip.Label>{range}</VitalChip.Label>
        </VitalChip.Shape>
        <VitalChip.Label>{range}</VitalChip.Label>
      </VitalChip.Root>
    </div>
  );
}

/** The radio channel, while on one: primary, always shown with its channel. */
function RadioChip({ radio }: { radio: number | string }) {
  return (
    <div data-slot="hud-radio" data-shown className="hud-vchip hud-comms" aria-label={`Radio ${radio} MHz`}>
      <VitalChip.Root open icon="uniform">
        <VitalChip.Shape>
          <VitalChip.Icon>
            <RadioIcon />
          </VitalChip.Icon>
          <VitalChip.Label className="hud-num">{String(radio)}</VitalChip.Label>
        </VitalChip.Shape>
        <VitalChip.Label className="hud-num">{String(radio)}</VitalChip.Label>
      </VitalChip.Root>
    </div>
  );
}

/** A player's style override (/hudstyle): the four tokens set on <html>, so every chip reads them. */
const TOKENS = { shape: "--nk-chip-shape", level: "--nk-level-style", attach: "--nk-label-attach", icon: "--nk-vital-icon" } as const;
type StyleOverride = Partial<Record<keyof typeof TOKENS, string>> | null;
function applyStyle(s: StyleOverride) {
  const root = document.documentElement.style;
  for (const [k, token] of Object.entries(TOKENS)) {
    const v = s?.[k as keyof typeof TOKENS];
    if (v) root.setProperty(token, v);
    else root.removeProperty(token);
  }
}

/** Overrides from Lua: the stored one when the page loads, then every /hudstyle. Test pops (/hudpop). */
function useHudStyle() {
  const [force, setForce] = useState<Partial<Record<Tone, { by: number; nonce: number }>>>({});
  useEffect(() => {
    void fetchNui("hud:style:get" as never)
      .then((r: unknown) => applyStyle((r as { style?: StyleOverride } | null)?.style ?? null))
      .catch(() => {});
    const offStyle = onNui("hud:style" as never, (s: unknown) => applyStyle(s as StyleOverride));
    const offPop = onNui("hud:pop" as never, (p: unknown) => {
      const { tone, by } = (p ?? {}) as { tone?: Tone; by?: number };
      if (!tone || !Number.isFinite(by)) return;
      setForce((f) => ({ ...f, [tone]: { by: Number(by), nonce: (f[tone]?.nonce ?? 0) + 1 } }));
    });
    return () => {
      offStyle();
      offPop();
    };
  }, []);
  return force;
}

/** The status row: voice and radio first (primary), then the vitals (secondary). */
export function VitalsRow({ player, settings, layout }: { player: NuiPlayer; settings: HudSettings; layout: "compact" | "classic" }) {
  const force = useHudStyle();
  const cfg = settings.vitals ?? {};
  if (cfg.enabled === false) return null;
  const low = cfg.low ?? 25;
  const high = cfg.high ?? 60;
  const linger = cfg.linger ?? 5000;
  const pop: PopMode = cfg.pop === undefined ? "change" : cfg.pop;
  const needs = settings.needs !== false;
  const mode = (m: VitalMode | undefined): VitalMode => (m === undefined ? "auto" : m);
  const voice = settings.voice !== false ? player.voice : undefined;
  const common = { low, high, linger, pop };
  const item = (tone: Tone, value: number | undefined, m: VitalMode | undefined, extra?: Partial<VitalProps>) => (
    <VitalItem tone={tone} value={value} mode={mode(m)} {...common} force={force[tone] ?? null} {...extra} />
  );
  return (
    <div data-slot="hud-vitals" data-layout={layout} className="hud-vitals-row" style={{} as CSSProperties}>
      {voice && <VoiceChip voice={voice} linger={linger} />}
      {voice?.radio !== undefined && <RadioChip radio={voice.radio} />}
      {item("health", player.health, cfg.health)}
      {item("armor", player.armor, cfg.armor, { low: -1 })}
      {needs && item("hunger", player.hunger, cfg.hunger)}
      {needs && item("thirst", player.thirst, cfg.thirst)}
      {needs && item("stress", player.stress, cfg.stress)}
    </div>
  );
}

/** The compact preset's vitals (bottom left, or beside a map in that corner). */
export function VitalsCompact({ player, settings }: { player: NuiPlayer; settings: HudSettings }) {
  return <VitalsRow player={player} settings={settings} layout="compact" />;
}
