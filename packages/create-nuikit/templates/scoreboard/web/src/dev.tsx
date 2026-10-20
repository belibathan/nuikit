// The game, faked for browser development. Press ` for the devtools: open the board (Surfaces
// tab), swap the backdrop. ?fixture=<name> picks the starting state (see scoreboardFixtures).
import { openSurface } from "nuikit-core";
import { NuiDevtools } from "nuikit-core/devtools";
import { useEffect } from "react";
import { scoreboardFixtures, type ScoreboardFixture } from "@/components/blocks/scoreboard/fixtures";

const f = scoreboardFixtures;

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "full") as ScoreboardFixture;
    // client/main.lua opens it with HOME or /<resource>, then refreshes it from the server
    void openSurface("scoreboard", f[name] ?? f.full);
  }, []);
  return <NuiDevtools surfaces={{ scoreboard: f.full }} scene="dusk" />;
}
