// The game, faked for browser development. Press ` for the devtools to fire single load events.
//   ?handover=full|plain|minimal|none        what server/main.lua hands over (see loadingHandovers)
//   ?state=connecting|core|map|afterMap|session|finishing|ready   jump to a step
//   (no ?state)                              replay a whole load, like the game does
//   ?bg=<url>                                use a real screenshot as the background
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { loadMessagesUntil, loadStates, loadTimeline, loadingHandovers, type LoadStateName } from "@/components/blocks/loading-screen/fixtures";
import { setHandover, type LoadingHandover } from "@/components/blocks/loading-screen/handover";

// The game posts these to the page itself; the devtools post them as { action, data }, which the
// screen reads the same way.
const mocks = defineMocks({
  events: {
    loadProgress: [{ loadFraction: 0.12 }, { loadFraction: 0.5 }, { loadFraction: 1 }],
    initFunctionInvoking: [{ type: "INIT_AFTER_MAP_LOADED", name: "CScenarioManager", idx: 17 }],
    onDataFileEntry: [{ name: "dlc_mpheist/content.xml", type: 0, isNew: false }],
    onLogLine: [{ message: "Awaiting scripts" }],
    "nuikit:ready": [{}],
  } as never,
});

const post = (data: unknown) => window.dispatchEvent(new MessageEvent("message", { data }));

export default function Dev() {
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const handover: LoadingHandover = loadingHandovers[(q.get("handover") ?? "full") as keyof typeof loadingHandovers] ?? loadingHandovers.full;
    const bg = q.get("bg");
    setHandover(bg ? { ...handover, backgrounds: [bg] } : handover);

    const state = q.get("state") as LoadStateName | null;
    if (state && loadStates.includes(state)) {
      // post the load up to that step, the way the game would have
      loadMessagesUntil(state).forEach(post);
      return;
    }
    const events = loadTimeline();
    let i = 0;
    const t = setInterval(() => (i < events.length ? post(events[i++]) : clearInterval(t)), 160);
    return () => clearInterval(t);
  }, []);
  return <NuiDevtools events={mocks.events} scene="none" />;
}
