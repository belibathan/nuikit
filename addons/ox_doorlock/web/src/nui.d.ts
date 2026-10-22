// ox_doorlock's messages (docs/ox-doorlock-protocol.md §1), typed for the devtools presets.
import "nuikit-core";
import type { Door } from "./lib/door";

declare module "nuikit-core" {
  interface NuiEvents {
    updateDoorData: Door[] | Record<string, Door> | Door | number;
    setSoundFiles: string[];
    setVisible: number | undefined;
    playSound: { sound: string; volume: number };
  }
}
