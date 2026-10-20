// The game, faked for browser development. Press ` for the devtools: open the menu (Surfaces tab),
// watch what each button sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see jobMenuFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { jobMenuFixtures, type JobMenuFixture } from "@/components/blocks/job-menu/fixtures";

const f = jobMenuFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail ? { ok: false, error: "Only the boss can do that." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "job:duty": (req) => answer("job:duty", req),
    "job:action": (req) => answer("job:action", req),
    "job:hire": (req) => answer("job:hire", req),
    "job:fire": (req) => answer("job:fire", req),
    "job:grade": (req) => answer("job:grade", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "boss") as JobMenuFixture;
    // client/main.lua opens it with /<resource> or F5
    void openSurface("job", f[name] ?? f.boss);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ job: f.boss }} scene="dusk" />;
}
