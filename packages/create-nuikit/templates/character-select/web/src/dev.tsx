// The game, faked for browser development. Press ` for the devtools: open the screen (Surfaces
// tab), watch what each choice sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see characterSelectFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { characterSelectFixtures, type CharacterSelectFixture } from "@/components/blocks/character-select/fixtures";

const f = characterSelectFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail ? { ok: false, error: "That isn't one of your characters." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "character:play": (req) => answer("character:play", req),
    "character:create": (req) => answer("character:create", req),
    "character:delete": (req) => answer("character:delete", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "three") as CharacterSelectFixture;
    // client/main.lua opens it when the player joins, and on /<resource>
    void openSurface("character-select", f[name] ?? f.three);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ "character-select": f.three }} scene="dusk" />;
}
