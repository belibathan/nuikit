// Where each part goes: the preset's placement with Config.parts on top (client/layout.lua resolves it
// and sends it in the settings; this mirror covers a client that doesn't).
import type { ReactNode } from "react";
import type { HudCorner, HudPart, HudParts, HudPreset } from "../nui";
import { useZoneShown } from "./situation";

export const PRESET_PARTS: Record<HudPreset, HudParts> = {
  compact: {
    map: "top-right",
    location: { at: "map", order: 1 },
    wallet: { at: "map", order: 2 },
    vitals: { at: "bottom-left", order: 1 },
    ammo: { at: "bottom-right", order: 1 },
    vehicle: { at: "bottom-right", order: 2 },
  },
  classic: {
    map: "bottom-left",
    location: { at: "map", order: 1 },
    vitals: { at: "map", order: 2 },
    wallet: { at: "top-right", order: 1 },
    ammo: { at: "top-right", order: 2 },
    vehicle: { at: "bottom-right", order: 1 },
  },
};

export type PartName = Exclude<keyof HudParts, "map">;
export const CORNERS: HudCorner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

export function resolveParts(preset: HudPreset, sent?: Partial<HudParts>): HudParts {
  return { ...PRESET_PARTS[preset], ...sent };
}

/** The parts' elements grouped by place, each group top to bottom. Hidden parts and empty elements drop out. */
export function placeParts(parts: HudParts, els: Record<PartName, ReactNode>) {
  const groups: Record<HudCorner | "map", { name: PartName; order: number; el: ReactNode }[]> = {
    "top-left": [],
    "top-right": [],
    "bottom-left": [],
    "bottom-right": [],
    map: [],
  };
  for (const name of Object.keys(els) as PartName[]) {
    const p: HudPart | undefined = parts[name];
    if (!p || p.at === false || !els[name]) continue;
    groups[p.at].push({ name, order: p.order, el: els[name] });
  }
  for (const g of Object.values(groups)) g.sort((a, b) => a.order - b.order);
  return groups;
}

/** The anchor and stack classes of a corner (hud.css). */
export const CORNER_CLASS: Record<HudCorner, string> = {
  "top-left": "hud-anchor-tl hud-stack",
  "top-right": "hud-anchor-tr hud-tr-stack",
  "bottom-left": "hud-anchor-bl hud-stack",
  "bottom-right": "hud-anchor-br hud-br-stack",
};

export const cornerSide = (c: HudCorner) => (c.endsWith("left") ? "left" : "right");

/**
 * Foundation 2 zone names: every part belongs to one, wherever Config.parts or /hud edit put it.
 * The HUD publishes its screen zones by these names (hud:zones → NUI.zone), and client/layout.lua
 * keeps a default box for each name, the HUD's and the rest (prompts, interaction, toasts).
 */
export type ZoneName = "status" | "map" | "vitals" | "vehicle" | "prompts" | "interaction" | "toasts";
export const PART_ZONE: Record<PartName | "map", ZoneName> = {
  map: "map",
  location: "status",
  wallet: "status",
  vitals: "vitals",
  ammo: "vehicle",
  vehicle: "vehicle",
};

/** A part as it is placed: a flex item that passes its place's alignment on, tagged with its zone. */
export function Part({ name, children }: { name: PartName; children: ReactNode }) {
  // a zone the situation leaves out slides away (situation.ts; Config.situations.retract)
  const shown = useZoneShown(PART_ZONE[name]);
  return (
    <div data-slot="hud-part" data-part={name} data-zone={PART_ZONE[name]} data-retracted={!shown || undefined} aria-hidden={!shown || undefined} className="hud-part">
      {children}
    </div>
  );
}
