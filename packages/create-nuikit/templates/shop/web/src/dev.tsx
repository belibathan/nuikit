// The game, faked for browser development. Press ` for the devtools: open the shop (Surfaces tab),
// watch what checkout sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see shopFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { shopFixtures, type ShopFixture } from "@/components/blocks/shop/fixtures";

const f = shopFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const mocks = defineMocks({
  callbacks: {
    "shop:buy": (req) => {
      console.info("[nui] shop:buy", JSON.stringify(req));
      return fail ? { ok: false, error: "You can't carry all that. Nothing was bought." } : { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "store") as ShopFixture;
    // client/main.lua opens it at a shop with /<resource> or E
    void openSurface("shop", f[name] ?? f.store);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ shop: f.store }} scene="dusk" />;
}
