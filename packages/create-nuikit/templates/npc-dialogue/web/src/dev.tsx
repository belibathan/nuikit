// The game, faked for browser development. Press ` for the devtools: open the dialogue (Surfaces tab),
// watch what a choice sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see dialogueFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { dialogueFixtures, type DialogueFixture } from "@/components/blocks/npc-dialogue/fixtures";

const f = dialogueFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive. Every choice ends the conversation here.
const mocks = defineMocks({
  callbacks: {
    "dialogue:choose": (req) => {
      console.info("[nui] dialogue:choose", JSON.stringify(req));
      return fail ? { ok: false, error: "You can't do that right now." } : { ok: true, ended: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "bartender") as DialogueFixture;
    // client/main.lua opens it at an NPC with /<resource> or E
    void openSurface("dialogue", f[name] ?? f.bartender);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ dialogue: f.bartender }} scene="dusk" />;
}
