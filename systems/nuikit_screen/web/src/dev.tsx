// The game, faked for browser development. Press ` for the devtools.
// The terminal (App.tsx) is drawn with ?screen=1. It takes its entries from the screen resource, so
// this sends a realistic feed: 13 rows, long and third-party titles, mixed case, and a long detail.
// ?entries=empty sends an empty feed (the zero state).
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

type Entry = { id: string; title: string; detail: string; icon: "mail" | "job" | "record" };

const ENTRIES: Entry[] = [
  { id: "1", title: "Delivery to Paleto Bay", detail: "Pick up at the Port of Los Santos, drop at the Paleto warehouse. Pays $850.", icon: "job" },
  { id: "2", title: "Message from Lester", detail: "The usual place, tonight. Bring the drive.", icon: "mail" },
  { id: "3", title: "Record: 46EEK572", detail: "Registered to Niko Bellic. No warrants.", icon: "record" },
  { id: "4", title: "🚔 | LSPD: shift swap request, Tuesday", detail: "Can you cover 22:00 to 06:00? Overtime is paid at 1.5x, and the Mission Row roster needs a second unit on the night shift.", icon: "job" },
  { id: "5", title: "Payment received: $1,234,567", detail: "Transfer from Vale Family Savings. Reference VFS-2026-10-2231, cleared at 18:04.", icon: "record" },
  { id: "6", title: "Message from d'Arcy McDonald-van der Berg", detail: "Still interested in the Sultan? Price is firm. Call back before Friday.", icon: "mail" },
  { id: "7", title: "Job: tow a vehicle from Vinewood Hills", detail: "Pick up from the garage on Mulholland Dr. Drop at Los Santos Customs, no damage, please.", icon: "job" },
  { id: "8", title: "Record: BX19PLT", detail: "Registered to an unknown owner. Flagged for review.", icon: "record" },
  { id: "9", title: "Message from Dispatch", detail: "Traffic stop on Great Ocean Hwy cleared. Return to patrol.", icon: "mail" },
  { id: "10", title: "🏦 | Pacific Standard: account frozen", detail: "Your account is frozen pending identity verification. Visit the branch on Alta Street with your ID.", icon: "record" },
  { id: "11", title: "Job: deliver 12 crates of supplies to the docks", detail: "Forklift is on the east pier. Mind the tide, it comes in at 21:30.", icon: "job" },
  { id: "12", title: "Record: 08KXR114 (impounded)", detail: "Impounded at the Impound Lot on Popular St. Fees outstanding: $2,500.", icon: "record" },
  { id: "13", title: "Message from Mom", detail: "Call me when you get this. It is not urgent, but please call.", icon: "mail" },
];

const mocks = defineMocks({
  events: {
    "screen:entries": [ENTRIES, []],
  } as never,
});

export default function Dev() {
  useEffect(() => {
    const empty = new URLSearchParams(location.search).get("entries") === "empty";
    // the resource pushes the feed once the terminal is on screen
    const t = window.setTimeout(
      () => window.dispatchEvent(new MessageEvent("message", { data: { action: "screen:entries", data: empty ? [] : ENTRIES } })),
      50,
    );
    return () => clearTimeout(t);
  }, []);
  return <NuiDevtools events={mocks.events} scene="dusk" />;
}
