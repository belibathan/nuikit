// The game, faked for browser development. Press ` for the devtools: open the bank (Surfaces tab),
// watch what each move sends (Log tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see bankFixtures); ?fail=1 makes every answer an error.
import { openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { bankFixtures, type BankFixture } from "@/components/blocks/bank/fixtures";

const f = bankFixtures;
const fail = new URLSearchParams(location.search).has("fail");

// Play client/main.lua's part, and log what it would receive.
const answer = (name: string, req: unknown) => {
  console.info(`[nui] ${name}`, JSON.stringify(req));
  return fail ? { ok: false, error: "No one with that ID or account is online." } : { ok: true };
};
const mocks = defineMocks({
  callbacks: {
    "bank:deposit": (req) => answer("bank:deposit", req),
    "bank:withdraw": (req) => answer("bank:withdraw", req),
    "bank:transfer": (req) => answer("bank:transfer", req),
  },
});

export default function Dev() {
  useEffect(() => {
    const name = (new URLSearchParams(location.search).get("fixture") ?? "full") as BankFixture;
    // client/main.lua opens it at a bank or an ATM with /<resource> or F9
    void openSurface("bank", f[name] ?? f.full);
  }, []);
  return <NuiDevtools {...mocks} surfaces={{ bank: f.full }} scene="dusk" />;
}
