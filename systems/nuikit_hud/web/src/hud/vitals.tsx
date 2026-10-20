// Vitals: health, armor, hunger, thirst, stress from the bridge (`nuikit:player`). In 'auto' each one
// shows when it changes or crosses its threshold, then fades back: the world is the hero (research §2.2).
// Icon + colour + value, never colour alone.
import type { NuiPlayer } from "nuikit-core/react";
import { DropletIcon, FlameIcon, HeartPulseIcon, MicIcon, RadioIcon, ShieldIcon, UtensilsIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { HudSettings, VitalMode } from "../nui";

export type Tone = "health" | "armor" | "hunger" | "thirst" | "stress";

export const ICONS: Record<Tone, ReactNode> = {
  health: <HeartPulseIcon />,
  armor: <ShieldIcon />,
  hunger: <UtensilsIcon />,
  thirst: <DropletIcon />,
  stress: <FlameIcon />,
};

export const LABELS: Record<Tone, string> = { health: "Health", armor: "Armor", hunger: "Hunger", thirst: "Thirst", stress: "Stress" };

/** Whether a vital is past its threshold: low for most, high for stress. */
export function vitalCritical(tone: Tone, value: number, low = 25, high = 60) {
  return tone === "stress" ? value >= high : value <= low;
}

/**
 * Shown now? 'always' yes; false never; 'auto' while it changed in the last `linger` ms, or while it's
 * past its threshold. Everything shows for `linger` when the HUD first appears.
 */
export function useShown(value: unknown, mode: VitalMode, critical: boolean, linger: number) {
  const [until, setUntil] = useState(() => Date.now() + linger);
  const first = useRef(true);
  const [, tick] = useState(0);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setUntil(Date.now() + linger);
  }, [value, linger]);
  useEffect(() => {
    const left = until - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => tick((n) => n + 1), left + 20);
    return () => clearTimeout(t);
  }, [until]);
  if (value === undefined || mode === false) return false;
  if (mode === "always") return true;
  return critical || Date.now() < until;
}

/** One vital: a ring that fills with the level, its icon inside, the value beside it. */
export function Vital({ tone, value, mode, low, high, linger }: { tone: Tone; value: number | undefined; mode: VitalMode; low: number; high: number; linger: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value ?? 0)));
  const critical = value !== undefined && vitalCritical(tone, v, low, high);
  const shown = useShown(value === undefined ? undefined : v, mode, critical, linger);
  return (
    <div
      data-slot="hud-vital"
      data-tone={tone}
      data-shown={shown || undefined}
      data-critical={critical || undefined}
      className="hud-vital hud-chip"
      role="meter"
      aria-label={LABELS[tone]}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      aria-hidden={!shown}
    >
      <span className="hud-vital-ring">
        <svg viewBox="0 0 28 28" aria-hidden>
          <circle className="hud-vital-track" cx="14" cy="14" r="11.5" />
          <circle className="hud-vital-fill" cx="14" cy="14" r="11.5" pathLength={100} strokeDasharray={`${v} 100`} transform="rotate(-90 14 14)" />
        </svg>
        <span className="hud-vital-icon">{ICONS[tone]}</span>
      </span>
      <span className="hud-num hud-vital-value">{v}</span>
    </div>
  );
}

/** The row of vitals and voice. */
export function Vitals({ player, settings }: { player: NuiPlayer; settings: HudSettings }) {
  const cfg = settings.vitals ?? {};
  if (cfg.enabled === false) return null;
  const low = cfg.low ?? 25;
  const high = cfg.high ?? 60;
  const linger = cfg.linger ?? 5000;
  const needs = settings.needs !== false;
  const mode = (m: VitalMode | undefined): VitalMode => (m === undefined ? "auto" : m);
  return (
    <div data-slot="hud-vitals" className="hud-vitals">
      <Vital tone="health" value={player.health} mode={mode(cfg.health)} low={low} high={high} linger={linger} />
      <Vital tone="armor" value={player.armor} mode={mode(cfg.armor)} low={-1} high={high} linger={linger} />
      {needs && <Vital tone="hunger" value={player.hunger} mode={mode(cfg.hunger)} low={low} high={high} linger={linger} />}
      {needs && <Vital tone="thirst" value={player.thirst} mode={mode(cfg.thirst)} low={low} high={high} linger={linger} />}
      {needs && <Vital tone="stress" value={player.stress} mode={mode(cfg.stress)} low={low} high={high} linger={linger} />}
      {settings.voice !== false && <Voice voice={player.voice} linger={linger} />}
    </div>
  );
}

/** Voice range (shows while talking or when it changes) and the radio channel (while on one). */
function Voice({ voice, linger }: { voice: NuiPlayer["voice"]; linger: number }) {
  // The voice resource's own label wins; distances differ between native audio and 3D audio.
  const range = voice.mode ?? (voice.range === undefined ? undefined : `${Math.round(voice.range * 10) / 10} m`);
  const shownRange = useShown(range, "auto", voice.talking, linger);
  return (
    <>
      {range !== undefined && (
        <div
          data-slot="hud-voice"
          data-shown={shownRange || undefined}
          data-active={voice.talking || undefined}
          className="hud-vital hud-chip hud-voice"
          aria-label={voice.talking ? "Talking" : "Voice range"}
        >
          <span className="hud-voice-icon">
            <MicIcon />
          </span>
          <span className="hud-vital-value">{range}</span>
        </div>
      )}
      {voice.radio !== undefined && (
        <div data-slot="hud-radio" data-shown className="hud-vital hud-chip hud-voice" aria-label="Radio">
          <span className="hud-voice-icon">
            <RadioIcon />
          </span>
          <span className="hud-num hud-vital-value">{voice.radio} MHz</span>
        </div>
      )}
    </>
  );
}
