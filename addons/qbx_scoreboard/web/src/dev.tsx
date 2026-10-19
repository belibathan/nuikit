// qbx_scoreboard's traffic, faked for browser development. Press ` for the devtools.
// Each preset is a payload qbx_scoreboard's Lua really sends (docs/qbx-scoreboard-protocol.md).
// The game sends them flat ({ action, ...fields }); devtools wraps them as { action, data }, which
// the page accepts too. Jump straight to a state with ?state=open|busy|nocops|nosetup|full|closed.
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

const items = {
  storerobbery: "Store Robbery",
  bankrobbery: "Bank Robbery",
  jewellery: "Jewelry",
  pacific: "Pacific Bank",
  paleto: "Paleto Bay Bank",
};
const cops = (busy: string[] = []) => ({
  storerobbery: { minimumPolice: 2, label: "Store Robbery", busy: busy.includes("storerobbery") },
  bankrobbery: { minimumPolice: 3, label: "Bank Robbery", busy: busy.includes("bankrobbery") },
  jewellery: { minimumPolice: 2, label: "Jewelry", busy: busy.includes("jewellery") },
  pacific: { minimumPolice: 5, label: "Pacific Bank", busy: busy.includes("pacific") },
  paleto: { minimumPolice: 4, label: "Paleto Bay Bank", busy: busy.includes("paleto") },
});

const OPEN = {
  open: { players: 37, maxPlayers: 64, requiredCops: cops(), currentCops: 3 },
  busy: { players: 52, maxPlayers: 64, requiredCops: cops(["bankrobbery", "jewellery"]), currentCops: 6 },
  nocops: { players: 9, maxPlayers: 48, requiredCops: cops(), currentCops: 0 },
  full: { players: 128, maxPlayers: 128, requiredCops: cops(["paleto"]), currentCops: 12 },
  nosetup: { players: 21, maxPlayers: 64, requiredCops: cops(), currentCops: 2 },
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
