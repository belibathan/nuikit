// The game, faked for browser development. Press ` for the devtools: open the tracker (Surfaces tab,
// "jobtracker-manage" for the focused panel), watch what the page sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see jobTrackerFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { jobTrackerFixtures, type JobTrackerFixture } from "@/components/blocks/job-tracker/fixtures";

const f = jobTrackerFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const mocks = defineMocks({
  callbacks: {
    "jobtracker:step": (req) => {
      console.info("[nui] jobtracker:step", JSON.stringify(req));
      return fail ? { ok: false, error: "You're not at the right place for this step." } : { ok: true };
    },
    "jobtracker:abandon": () => {
      console.info("[nui] jobtracker:abandon");
      return fail ? { ok: false, error: "You don't have a job." } : { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "loading") as JobTrackerFixture;
    // client/main.lua shows it while the player has a job
    void openSurface("jobtracker", f[name] ?? f.loading);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ jobtracker: f.loading, "jobtracker-manage": f.loading }} scene="dusk" />;
}
