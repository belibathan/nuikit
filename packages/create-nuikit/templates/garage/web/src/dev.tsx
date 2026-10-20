// The game, faked for browser development. Press ` for the devtools: open the panel (Surfaces tab),
// watch what each button sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see garageFixtures); ?fail=1 makes every answer an error.
import { closeSurface, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { garageFixtures, type GarageFixture } from "@/components/blocks/garage/fixtures";

const f = garageFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req?: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req ?? {}));
  return fail ? { ok: false, error: "Something is parked in the way." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "garage:takeOut": (req) => {
      const a = answer("garage:takeOut", req);
      if (a.ok) void closeSurface("garage"); // in game: the car spawns and the panel closes
      return a;
    },
    "garage:store": () => answer("garage:store"),
    "garage:release": (req) => answer("garage:release", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "full") as GarageFixture;
    // client/main.lua opens it at the nearest garage with /<resource> or F6
    void openSurface("garage", f[name] ?? f.full);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ garage: f.full }} scene="dusk" />;
}
