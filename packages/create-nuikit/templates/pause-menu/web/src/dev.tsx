// The game, faked for browser development. Press ` for the devtools: open the menu (Surfaces tab),
// fire the player (Events tab), watch the callbacks the buttons send (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see pauseMenuFixtures); ?confirm=1 opens the
// Disconnect confirm.
import { closeSurface, emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { pauseMenuFixtures, type PauseMenuFixture } from "@/components/blocks/pause-menu/fixtures";

const f = pauseMenuFixtures;

const mocks = defineMocks({
  events: {
    // nuikit's bridge sends this whenever the player changes (nk.player in Lua)
    "nuikit:player": [f.full.player, f["no-character"].player],
  },
  // Play client/main.lua's part: every action closes the menu (Map, Settings and Key bindings then
  // open GTA's pages in game).
  callbacks: {
    "pause:action": (req) => {
      console.info("[nui] pause:action", JSON.stringify(req)); // what client/main.lua would receive
      void closeSurface("pause");
      return { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fixture = f[(params.get("fixture") ?? "full") as PauseMenuFixture] ?? f.full;
    emit("nuikit:player", fixture.player);
    // client/main.lua opens it when Esc is pressed
    void openSurface("pause", fixture.data);
    if (params.has("confirm")) {
      setTimeout(() => document.querySelector<HTMLElement>("[data-slot=menu-row].text-destructive")?.click(), 400);
    }
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ pause: f.full.data }} states={["dead"]} scene="dusk" />;
}
