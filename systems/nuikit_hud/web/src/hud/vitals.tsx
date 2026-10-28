// Vitals: health, armor, hunger, thirst, stress from the bridge (`nuikit:player`). In 'auto' each one
// shows when it changes or crosses its threshold, then fades back: the world is the hero.
// The shared pieces; the chips themselves are in pills.tsx (one chip for every vital, both layouts).
import { DropletIcon, FlameIcon, HeartPulseIcon, ShieldIcon, UtensilsIcon } from "@/components/ui/icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { VitalMode } from "../nui";

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
