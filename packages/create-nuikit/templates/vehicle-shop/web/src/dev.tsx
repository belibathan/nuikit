// The game, faked for browser development. Press ` for the devtools: open the showroom (Surfaces
// tab), watch what each button sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see vehicleShopFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { vehicleShopFixtures, type VehicleShopFixture } from "@/components/blocks/vehicle-shop/fixtures";

const f = vehicleShopFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail && name !== "vehicle-shop:preview" ? { ok: false, error: "The car couldn't be delivered. Your money was refunded." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "vehicle-shop:preview": (req) => answer("vehicle-shop:preview", req),
    "vehicle-shop:test-drive": (req) => answer("vehicle-shop:test-drive", req),
    "vehicle-shop:buy": (req) => answer("vehicle-shop:buy", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "pdm") as VehicleShopFixture;
    // client/main.lua opens it at a showroom with /<resource> or E
    void openSurface("vehicle-shop", f[name] ?? f.pdm);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ "vehicle-shop": f.pdm }} scene="dusk" />;
}
