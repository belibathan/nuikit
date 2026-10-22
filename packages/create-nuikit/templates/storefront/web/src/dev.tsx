// The game, faked for browser development. Press ` for the devtools: open the storefront (Surfaces
// tab), watch what checkout and Manage send (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see storefrontFixtures: burgers, parts, closed, staff,
// broke); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { storefrontFixtures, type StorefrontFixture } from "@/components/blocks/storefront/fixtures";

const f = storefrontFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const mocks = defineMocks({
  callbacks: {
    "storefront:buy": (req) => {
      console.info("[nui] storefront:buy", JSON.stringify(req));
      return fail ? { ok: false, error: "You can't carry all that. Nothing was bought." } : { ok: true };
    },
    "storefront:manage": (req) => {
      console.info("[nui] storefront:manage", JSON.stringify(req));
      return fail ? { ok: false, error: "You don't work here." } : { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "burgers") as StorefrontFixture;
    // client/main.lua opens it at a counter with /<resource> or E
    void openSurface("storefront", f[name] ?? f.burgers);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ storefront: f.burgers }} scene="dusk" />;
}
