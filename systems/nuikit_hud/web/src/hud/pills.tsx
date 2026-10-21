// Compact vitals (design v2 §4): health and armor as labelled pills with a thin level line, hunger,
// thirst and stress as status dots, voice as a mic dot. Each shows on change or past its threshold,
// then fades back (the same rule as the classic rings: vitals.tsx useShown). Icon + label or icon +
// level ring, never colour alone.
import type { NuiPlayer } from "nuikit-core/react";
import { MicIcon, RadioIcon } from "lucide-react";
import type { HudSettings, VitalMode } from "../nui";
import { ICONS, LABELS, useShown, vitalCritical, type Tone } from "./vitals";

interface VitalProps {
  tone: Tone;
  value: number | undefined;
  mode: VitalMode;
  low: number;
  high: number;
  linger: number;
}

function useVital({ tone, value, mode, low, high, linger }: VitalProps) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const critical = value !== undefined && vitalCritical(tone, v, low, high);
  const shown = useShown(value === undefined ? undefined : v, mode, critical, linger);
  return { v, critical, shown };
}

/** A labelled pill: icon, label, value, and a thin level line along its foot. */
export function VitalPill(props: VitalProps) {
  const { tone } = props;
  const { v, critical, shown } = useVital(props);
  return (
    <div
      data-slot="hud-vital"
      data-tone={tone}
      data-shown={shown || undefined}
      data-critical={critical || undefined}
      className="hud-pill"
      role="meter"
      aria-label={LABELS[tone]}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-hidden={!shown}
    >
      <span className="hud-pill-icon">{ICONS[tone]}</span>
      <span className="hud-pill-label">{LABELS[tone]}</span>
      <span className="hud-num hud-pill-value">{v}</span>
      <span className="hud-pill-level" aria-hidden>
        <span style={{ transform: `scaleX(${v / 100})` }} />
      </span>
    </div>
  );
}

/** A status dot: the vital's icon in a ring that fills with its level. */
export function VitalDot(props: VitalProps) {
  const { tone } = props;
  const { v, critical, shown } = useVital(props);
  return (
    <div
      data-slot="hud-vital"
      data-tone={tone}
      data-shown={shown || undefined}
      data-critical={critical || undefined}
      className="hud-dot"
      role="meter"
      aria-label={`${LABELS[tone]} ${v}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-hidden={!shown}
    >
      <svg viewBox="0 0 28 28" aria-hidden>
        <circle className="hud-dot-track" cx="14" cy="14" r="12.5" />
        <circle className="hud-dot-fill" cx="14" cy="14" r="12.5" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 14 14)" />
      </svg>
      <span className="hud-dot-icon">{ICONS[tone]}</span>
    </div>
  );
}

/** Voice: a mic dot, lit while talking; the range opens beside it for a moment when it changes. */
function VoiceDot({ voice, linger }: { voice: NuiPlayer["voice"]; linger: number }) {
  const range = voice.mode ?? (voice.range === undefined ? undefined : `${Math.round(voice.range * 10) / 10} m`);
  const changed = useShown(range, "auto", false, linger);
  if (range === undefined) return null;
  return (
    <div
      data-slot="hud-voice"
      data-active={voice.talking || undefined}
      data-open={changed || voice.talking || undefined}
      className="hud-mic"
      aria-label={voice.talking ? `Talking, ${range}` : `Voice range ${range}`}
    >
      <span className="hud-mic-icon">
        <MicIcon />
      </span>
      <span className="hud-mic-range">{range}</span>
    </div>
  );
}

/**
 * The compact vitals row, bottom left: the mic dot, health and armor pills, the status dots, and the
 * radio channel while on one.
 */
export function VitalsCompact({ player, settings }: { player: NuiPlayer; settings: HudSettings }) {
  const cfg = settings.vitals ?? {};
  if (cfg.enabled === false) return null;
  const low = cfg.low ?? 25;
  const high = cfg.high ?? 60;
  const linger = cfg.linger ?? 5000;
  const needs = settings.needs !== false;
  const mode = (m: VitalMode | undefined): VitalMode => (m === undefined ? "auto" : m);
  const voice = settings.voice !== false ? player.voice : undefined;
  const common = { low, high, linger };
  return (
    <div data-slot="hud-vitals" data-layout="compact" className="hud-vitals-c">
      {voice && <VoiceDot voice={voice} linger={linger} />}
      <VitalPill tone="health" value={player.health} mode={mode(cfg.health)} {...common} />
      <VitalPill tone="armor" value={player.armor} mode={mode(cfg.armor)} {...common} low={-1} />
      {needs && <VitalDot tone="hunger" value={player.hunger} mode={mode(cfg.hunger)} {...common} />}
      {needs && <VitalDot tone="thirst" value={player.thirst} mode={mode(cfg.thirst)} {...common} />}
      {needs && <VitalDot tone="stress" value={player.stress} mode={mode(cfg.stress)} {...common} />}
      {voice?.radio !== undefined && (
        <div data-slot="hud-radio" data-shown className="hud-pill hud-pill-radio" aria-label={`Radio ${voice.radio} MHz`}>
          <span className="hud-pill-icon">
            <RadioIcon />
          </span>
          <span className="hud-num hud-pill-label">{voice.radio}</span>
        </div>
      )}
    </div>
  );
}
