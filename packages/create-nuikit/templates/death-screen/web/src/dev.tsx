// The game, faked for browser development. Press ` for the devtools: open the screen in any state
// (Surfaces tab), fire the respawn hold (Events tab), swap the backdrop.
// ?fixture=<name> picks the starting state (handy for screenshots): see deathScreenFixtures.
import { emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { deathScreenFixtures, type DeathScreenFixture } from "@/components/blocks/death-screen/fixtures";

const mocks = defineMocks({
  events: {
    // what client/main.lua streams while E is held
    "death:hold": [0, 0.35, 0.7, 1],
  },
});

export default function Dev() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const name = (params.get("fixture") ?? "down") as DeathScreenFixture;
    // client/main.lua opens it when the player goes down or dies
    void openSurface("death", deathScreenFixtures[name] ?? deathScreenFixtures.down);
    // ?hold=0.6: E held part way (once the screen is up and following the stream)
    const hold = Number(params.get("hold"));
    if (hold > 0) setTimeout(() => emit("death:hold", hold), 300);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ death: deathScreenFixtures["dead-respawn"] }} scene="day" />;
}
