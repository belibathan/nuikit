// Dashboard telltales lucide doesn't have, drawn for nuikit in lucide's grid (24, stroke 2, round),
// so they sit next to lucide icons without looking borrowed. currentColor only.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Seat with a belt across it. */
export function SeatbeltIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M8 21v-6.5a4 4 0 0 1 8 0V21" />
      <path d="M7.5 9.5 17 19" />
      <path d="M6 21h12" />
    </svg>
  );
}

/** Low beam: the lamp with beams angled down. */
export function LowBeamIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6c-3 0-5 2.7-5 6s2 6 5 6c.8 0 1.5-.6 1.5-1.4V7.4C13.5 6.6 12.8 6 12 6Z" />
      <path d="M17 7.5l4 1.5M17 11l4 1.5M17 14.5l4 1.5" />
    </svg>
  );
}

/** High beam: the lamp with level beams. */
export function HighBeamIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6c-3 0-5 2.7-5 6s2 6 5 6c.8 0 1.5-.6 1.5-1.4V7.4C13.5 6.6 12.8 6 12 6Z" />
      <path d="M17 8h4M17 12h4M17 16h4" />
    </svg>
  );
}

/** Parking brake: a P in a ring, with brackets. */
export function HandbrakeIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <path d="M10.5 15V9h2a1.75 1.75 0 0 1 0 3.5h-2" />
      <path d="M4.2 7.5a9.5 9.5 0 0 0 0 9M19.8 7.5a9.5 9.5 0 0 1 0 9" />
    </svg>
  );
}

/** Engine block. */
export function EngineIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M7 8h7l2 2h2v2h2v-2h1v6h-1v-2h-2v2h-2l-2 2H8l-2-2H4v-4h2V9Z" />
      <path d="M10 5.5h4M12 5.5V8" />
    </svg>
  );
}

/** Cruise: a dial with an arrow onto it. */
export function CruiseIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M5.6 17.5a8 8 0 1 1 12.8 0" />
      <path d="M12 13l3.5-4" />
      <circle cx="12" cy="13" r="1" />
      <path d="M8 20h8" />
    </svg>
  );
}

/** Car body, for body damage. */
export function BodyIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M5 16H4a1 1 0 0 1-1-1v-3l2.2-4.4A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.1L21 12v3a1 1 0 0 1-1 1h-1" />
      <path d="M3.5 12h17" />
      <circle cx="7.5" cy="16.5" r="1.75" />
      <circle cx="16.5" cy="16.5" r="1.75" />
      <path d="M9.25 16.5h5.5" />
    </svg>
  );
}

/** Landing gear: a wheel under a strut. */
export function GearDownIcon(props: P) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16" />
      <path d="M12 5v9" />
      <circle cx="12" cy="17.5" r="3" />
    </svg>
  );
}
