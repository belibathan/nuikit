// The contract between client/main.lua and this UI: a snapshot of what the medical resource is doing.
import "nuikit-core";

export interface DeathData {
  phase: "laststand" | "dead";
  /** Which medical resource it came from. */
  medical: "qbx" | "qb" | "esx_death" | "esx" | "native";
  title?: string;
  subtitle?: string;
  /** Countdown: bleed-out in last stand, respawn/bleed-out when dead. Absent when the resource has none. */
  seconds?: number;
  total?: number;
  /** Timers mirrored from config rather than read live (QBCore, old ESX). */
  estimated?: boolean;
  /** Last stand: another player can revive you now. */
  helpable?: boolean;
  respawn?: {
    key: string;
    /** The medical resource accepts the key now. */
    available: boolean;
    /** Hospital bill, when the resource charges one. */
    cost?: number;
    /** Seconds until the key is accepted (ESX early-respawn timer). */
    wait?: number;
  };
  ems?: {
    key: string;
    state: "available" | "requested" | "cooldown";
    seconds?: number;
  };
  /** Config.band = false: no band along the bottom edge. */
  band?: false;
}

declare module "nuikit-core" {
  interface NuiSurfaces {
    death: DeathData;
  }
  interface NuiEvents {
    /** live (NUI.stream): how far E is held, 0–1 to 0.01, ≤30 a second while it moves; 0 when released */
    "death:hold": number;
  }
}
