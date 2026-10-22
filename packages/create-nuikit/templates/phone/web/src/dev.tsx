// The game, faked for browser development. Press ` for the devtools: open the phone (Surfaces tab),
// watch what it sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see phoneFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { phoneFixtures, type PhoneFixture } from "@/components/blocks/phone/fixtures";

const f = phoneFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive. The page sends no number and no
// sender: the server knows who is asking.
const mocks = defineMocks({
  callbacks: {
    "phone:addContact": (req) => {
      console.info("[nui] phone:addContact", JSON.stringify(req));
      return fail ? { ok: false, error: "Your contacts are full (50)." } : { ok: true };
    },
    "phone:send": (req) => {
      console.info("[nui] phone:send", JSON.stringify(req));
      return fail ? { ok: false, error: "Slow down." } : { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "full") as PhoneFixture;
    // client/main.lua opens it with /<resource> or the key
    void openSurface("phone", f[name] ?? f.full);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ phone: f.full }} scene="dusk" />;
}
