// The game, faked for browser development. Press ` for the devtools: open the target or the
// prompts (Surfaces tab), watch what a click sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the scene (see interactionFixtures; `picking` lets you click an option);
// ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { interactionFixtures, type InteractionFixture, type InteractionScene } from "@/components/blocks/interaction/fixtures";

const f = interactionFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const mocks = defineMocks({
  callbacks: {
    "interaction:select": (req) => {
      console.info("[nui] interaction:select", JSON.stringify(req));
      return fail ? { ok: false, error: "You're too far away." } : { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "vehicle") as InteractionFixture;
    const scene: InteractionScene = f[name] ?? f.vehicle;
    // client/main.lua opens the target while the key is held, and the prompts near a point
    if (scene.target) void openSurface("target", scene.target);
    if (scene.prompts) void openSurface("prompts", scene.prompts);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ target: f.vehicle.target, prompts: f.hold.prompts }} scene="dusk" />;
}
