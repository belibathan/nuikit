// The contract between client/main.lua (+ config.lua) and this UI.
import "nuikit-core";

export type PauseButton = "resume" | "map" | "settings" | "keybinds" | "help" | "disconnect";

export interface PauseData {
  server: { name?: string; tagline?: string; logo?: string };
  links: { label: string; value: string }[];
  buttons: PauseButton[];
  help: { key: string; label: string }[];
  serverId?: number;
  /** The FiveM name, shown when no character is loaded. */
  playerName?: string;
  /** From the server once it answers; undefined until then. */
  players?: number;
  maxPlayers?: number;
}

type Ok = { req: void; res: { ok: boolean } };

declare module "nuikit-core" {
  interface NuiSurfaces {
    pause: PauseData;
  }
  interface NuiCallbacks {
    "pause:resume": Ok;
    "pause:map": Ok;
    "pause:settings": Ok;
    "pause:keybinds": Ok;
    "pause:disconnect": Ok;
  }
}
