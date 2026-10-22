// The game, faked for browser development. Press ` for the devtools: open the MDT (Surfaces tab),
// watch what it sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see mdtFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { mdtFixtures, mdtRecords, mdtSearch, type MdtFixture } from "@/components/blocks/mdt/fixtures";

const f = mdtFixtures;
const fail = new URLSearchParams(location.search).has("fail");
const down = { ok: false, error: "Go on duty to use the terminal." };
let filed = [...f.police.reports];

// Play client/main.lua + server/main.lua's part, and log what the server would receive.
const mocks = defineMocks({
  callbacks: {
    "mdt:search": (req) => {
      console.info("[nui] mdt:search", JSON.stringify(req));
      return fail ? down : { ok: true, results: mdtSearch(req.kind, req.query) };
    },
    "mdt:record": (req) => {
      console.info("[nui] mdt:record", JSON.stringify(req));
      const record = mdtRecords.find((r) => r.id === req.id && r.kind === req.kind);
      return fail ? down : record ? { ok: true, record } : { ok: false, error: "Record not found." };
    },
    "mdt:report": (req) => {
      console.info("[nui] mdt:report", JSON.stringify(req));
      if (fail) return down;
      const person = mdtRecords.find((r) => r.id === req.person)?.title;
      // The server stamps the author and the time.
      filed = [{ id: `r${filed.length + 10}`, title: req.title, text: req.text, person, author: "J. Ortega", time: Math.floor(Date.now() / 1000) }, ...filed];
      return { ok: true, reports: filed };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "police") as MdtFixture;
    // client/main.lua opens it with /<resource> or F6
    void openSurface("mdt", f[name] ?? f.police);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ mdt: f.police }} scene="dusk" />;
}
