// The vitals row (both layouts): every vital (health, armor, hunger, thirst, stress) is the same chip,
// icon only, its level traced along the chip's own outline in the identity's chip shape (ChipOutline).
// Voice and radio are chips of the same family. Each vital shows on change or past its threshold, then
// fades back (vitals.tsx useShown). Icon + level + the critical state, never colour alone; the value
// is in aria-valuenow and the label.
import type { NuiPlayer } from "nuikit-core/react";
import { MicIcon, RadioIcon } from "lucide-react";
import type { HudSettings, VitalMode } from "../nui";
import { ChipOutline } from "./outline";
import { ICONS, LABELS, useShown, vitalCritical, type Tone } from "./vitals";

interface VitalProps {
  tone: Tone;
  value: number | undefined;
  mode: VitalMode;
  low: number;
  high: number;
  linger: number;
}

/** One vital: the icon in a chip whose edge fills with the level, clockwise from the top. */
export function VitalChip({ tone, value, mode, low, high, linger }: VitalProps) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const critical = value !== undefined && vitalCritical(tone, v, low, high);
  const shown = useShown(value === undefined ? undefined : v, mode, critical, linger);
  return (
    <div
      data-slot="hud-vital"
      data-tone={tone}
      data-shown={shown || undefined}
      data-critical={critical || undefined}
      className="hud-vchip"
      role="meter"
      aria-label={`${LABELS[tone]} ${v}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-hidden={!shown}
    >
      <span className="hud-vchip-face">
        <ChipOutline value={v} />
        <span className="hud-vchip-icon">{ICONS[tone]}</span>
      </span>
    </div>
  );
}

/** Voice: a mic chip, lit while talking; the range opens beside the icon for a moment when it changes. */
function VoiceChip({ voice, linger }: { voice: NuiPlayer["voice"]; linger: number }) {
  const range = voice.mode ?? (voice.range === undefined ? undefined : `${Math.round(voice.range * 10) / 10} m`);
  const changed = useShown(range, "auto", false, linger);
  if (range === undefined) return null;
  return (
    <div
      data-slot="hud-voice"
      data-active={voice.talking || undefined}
      data-open={changed || voice.talking || undefined}
      className="hud-vchip hud-vchip-wide"
      data-shown
      aria-label={voice.talking ? `Talking, ${range}` : `Voice range ${range}`}
    >
      <span className="hud-vchip-face">
        <ChipOutline />
        <span className="hud-vchip-icon">
          <MicIcon />
        </span>
        <span className="hud-vchip-text">{range}</span>
      </span>
    </div>
  );
}

/** The radio channel, while on one. */
function RadioChip({ radio }: { radio: number | string }) {
  return (
    <div data-slot="hud-radio" data-shown data-open className="hud-vchip hud-vchip-wide" aria-label={`Radio ${radio} MHz`}>
      <span className="hud-vchip-face">
        <ChipOutline />
        <span className="hud-vchip-icon">
          <RadioIcon />
        </span>
        <span className="hud-num hud-vchip-text">{radio}</span>
      </span>
    </div>
  );
}

/** The vitals row: voice, the vitals, and the radio channel while on one. */
export function VitalsRow({ player, settings, layout }: { player: NuiPlayer; settings: HudSettings; layout: "compact" | "classic" }) {
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
    <div data-slot="hud-vitals" data-layout={layout} className="hud-vitals-row">
      {voice && <VoiceChip voice={voice} linger={linger} />}
      <VitalChip tone="health" value={player.health} mode={mode(cfg.health)} {...common} />
      <VitalChip tone="armor" value={player.armor} mode={mode(cfg.armor)} {...common} low={-1} />
      {needs && <VitalChip tone="hunger" value={player.hunger} mode={mode(cfg.hunger)} {...common} />}
      {needs && <VitalChip tone="thirst" value={player.thirst} mode={mode(cfg.thirst)} {...common} />}
      {needs && <VitalChip tone="stress" value={player.stress} mode={mode(cfg.stress)} {...common} />}
      {voice?.radio !== undefined && <RadioChip radio={voice.radio} />}
    </div>
  );
}

/** The compact preset's vitals (bottom left, or beside a map in that corner). */
export function VitalsCompact({ player, settings }: { player: NuiPlayer; settings: HudSettings }) {
  return <VitalsRow player={player} settings={settings} layout="compact" />;
}
