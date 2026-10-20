// The game, faked for browser development. Press ` for the devtools: open the inventory or the
// hotbar (Surfaces tab), watch what a drag or a use sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see inventoryFixtures, or `hotbar`); ?fail=1 makes every
// answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { hotbarFixtures, inventoryFixtures, type InventoryFixture } from "@/components/blocks/inventory/fixtures";

const f = inventoryFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail ? { ok: false, error: "That's too heavy for there." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "inventory:move": (req) => answer("inventory:move", req),
    "inventory:use": (req) => answer("inventory:use", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = new URLSearchParams(location.search).get("fixture") ?? "locker";
    // client/main.lua opens it with TAB (and the stash you stand at); the hotbar shows on 1–5
    if (name === "hotbar") void openSurface("hotbar", hotbarFixtures.hotbar);
    else void openSurface("inventory", f[name as InventoryFixture] ?? f.locker);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ inventory: f.locker, hotbar: hotbarFixtures.hotbar }} scene="dusk" />;
}
