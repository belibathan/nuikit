// The game, faked for browser development. Press ` for the devtools: open the sheet (Surfaces tab),
// watch what each row sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see jobSheetFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { jobSheetFixtures, type JobSheetFixture } from "@/components/blocks/job-sheet/fixtures";

const f = jobSheetFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail ? { ok: false, error: "Go on duty first." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "jobsheet:duty": (req) => answer("jobsheet:duty", req),
    "jobsheet:row": (req) => answer("jobsheet:row", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "officer") as JobSheetFixture;
    // client/main.lua opens it with /<resource> or F5
    void openSurface("jobsheet", f[name] ?? f.officer);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ jobsheet: f.officer }} scene="dusk" />;
}
