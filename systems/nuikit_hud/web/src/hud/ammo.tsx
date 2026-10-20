// Ammo (design v2 §4): `12 / 48` with a weapon glyph, only while armed with a gun or a throwable.
// client/weapon.lua reads the ped's weapon and ammo and sends `hud:weapon` only when they change.
// The glyphs are nuikit's own line drawings (2:1, stroke 1.5, round joins, currentColor) so they sit
// with the lucide icons around them.
import type { SVGProps } from "react";
import type { HudWeapon } from "../nui";

type P = SVGProps<SVGSVGElement>;
const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 32 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PATHS: Record<HudWeapon["kind"], string[]> = {
  pistol: ["M7 4.5h19v4H7z", "M9 8.5 7.5 13.5h4l1.5-5", "M14.5 8.5v1.5a1.5 1.5 0 0 0 1.5 1.5h1.5v-3"],
  smg: ["M5 5.5h18v3H5z", "M23 6.5h4", "M8 8.5 6.5 12.5h3.5l1-4", "M15.5 8.5v5h2.5v-5", "M5 6.5H3v2.5"],
  rifle: ["M8 5.5h17v3H8z", "M25 6.5h5", "M8 6 2.5 7.5v3L8 9", "M17.5 8.5l1 4.5h2.5l-1-4.5", "M12 8.5l-1 3.5h3l.5-3.5"],
  shotgun: ["M7 6h23v2.5H7z", "M7 6.5 2 8v2.5L7 9", "M14 8.5v2h6v-2", "M10 8.5 9 12h3l.5-3.5"],
  sniper: ["M8 6.5h16v3H8z", "M24 7.5h6", "M8 7 2.5 8.5v3L8 10", "M11 2.5h8v2h-8z", "M15 4.5v2", "M12 9.5l-1 3.5h3l.5-3.5"],
  heavy: ["M3 4.5h26v4.5H3z", "M29 5.5h1.5v2.5H29", "M12 9 11 13h3l1-4", "M20 9v3"],
  thrown: ["M16 15a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z", "M14.5 6.5V4.5h3v2", "M17.5 5h2.5l1.5 2.5", "M13 3.5a1.5 1.5 0 1 0 0-.01"],
};

export function WeaponGlyph({ kind, ...props }: { kind: HudWeapon["kind"] } & P) {
  return (
    <svg {...base} {...props}>
      {(PATHS[kind] ?? PATHS.pistol).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** The ammo readout: clip big, reserve small and dim, the glyph under them. Empty clip in the warning tone. */
export function Ammo({ weapon }: { weapon: HudWeapon | false | null }) {
  if (!weapon) return null;
  const empty = weapon.clip === 0;
  return (
    <div data-slot="hud-ammo" data-kind={weapon.kind} data-empty={empty || undefined} className="hud-ammo" aria-label={weapon.reserve === undefined ? `${weapon.clip} left` : `${weapon.clip} in clip, ${weapon.reserve} reserve`}>
      <span className="hud-ammo-count">
        <span className="hud-num hud-ammo-clip">{weapon.clip}</span>
        {weapon.reserve !== undefined && (
          <span className="hud-num hud-ammo-reserve">
            <span className="hud-ammo-sep">/</span>
            {weapon.reserve}
          </span>
        )}
      </span>
      <WeaponGlyph kind={weapon.kind} className="hud-ammo-glyph" />
    </div>
  );
}
