// qbx_scoreboard's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload qbx_scoreboard's Lua really sends (docs/qbx-scoreboard-protocol.md).
// The game sends them flat ({ action, ...fields }); devtools wraps them as { action, data }, which
// the page accepts too. Jump straight to a state with ?state=open|busy|nocops|nosetup|full|noactivities|closed.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const items = {
  storerobbery: "Store Robbery",
  bankrobbery: "Bank Robbery",
  jewellery: "Jewelry",
  pacific: "Pacific Bank",
  paleto: "Paleto Bay Bank",
  // a long third-party label, and more rows so the list runs past a screen
  fleeca: "🏦 | Fleeca Bank, Vinewood Hills branch (upgraded)",
  humane: "Humane Labs Raid",
  cargoplane: "Cargo plane",
  prison: "Bolingbroke breakout",
  yacht: "Yacht heist",
  casino: "Diamond Casino",
  gang: "Gang takeover",
  carjack: "Carjacking ring",
  taxi: "Taxi hijack",
  cayo: "Cayo Perico",
  yacht2: "Scuba drop",
};
const minimum: Record<keyof typeof items, number> = {
  storerobbery: 2,
  bankrobbery: 3,
  jewellery: 2,
  pacific: 5,
  paleto: 4,
  fleeca: 3,
  humane: 0,
  cargoplane: 4,
  prison: 6,
  yacht: 4,
  casino: 8,
  gang: 2,
  carjack: 1,
  taxi: 0,
  cayo: 10,
  yacht2: 3,
};
const cops = (busy: string[] = []) =>
  Object.fromEntries(
    (Object.keys(items) as (keyof typeof items)[]).map((k) => [k, { minimumPolice: minimum[k], label: items[k], busy: busy.includes(k) }]),
  );

const OPEN = {
  open: { players: 37, maxPlayers: 64, requiredCops: cops(), currentCops: 3 },
  busy: { players: 52, maxPlayers: 64, requiredCops: cops(["bankrobbery", "jewellery"]), currentCops: 6 },
  nocops: { players: 9, maxPlayers: 48, requiredCops: cops(), currentCops: 0 },
  full: { players: 128, maxPlayers: 128, requiredCops: cops(["paleto"]), currentCops: 12 },
  nosetup: { players: 21, maxPlayers: 64, requiredCops: cops(), currentCops: 2 },
  noactivities: { players: 3, maxPlayers: 32, requiredCops: {}, currentCops: 0 },
  // a big server: 1,234 players of 2,048 slots, a full activity list
  big: { players: 1234, maxPlayers: 2048, requiredCops: cops(["casino", "cayo", "fleeca"]), currentCops: 1234 },
  zero: { players: 0, maxPlayers: 64, requiredCops: cops(), currentCops: 0 },
};

const mocks = defineMocks({
  events: {
    setup: [{ items }],
    open: Object.values(OPEN),
    close: [{}],
  } as never,
});

const post = (data: object) => window.dispatchEvent(new MessageEvent("message", { data }));

export default function Dev() {
  useEffect(() => {
    const state = new URLSearchParams(location.search).get("state") ?? "open";
    if (state !== "nosetup") post({ action: "setup", items });
    if (state === "closed") {
      post({ action: "open", ...OPEN.open });
      post({ action: "close" });
      return;
    }
    post({ action: "open", ...(OPEN[state as keyof typeof OPEN] ?? OPEN.open) });
  }, []);
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
