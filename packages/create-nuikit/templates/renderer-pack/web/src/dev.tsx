// Fake game for browser development: open notify intents the way nuikit's Lua would, and the
// devtools (press `) to fire more. ?fixture=notify opens a set on load.
import { emit } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import type { IntentMessage, NotifyProps } from "nuikit-core/intents";
import { useEffect } from "react";

let seq = 0;
/** Open a notify intent as the runtime does (nuikit:intent { op = 'open', intent }). */
export function notify(props: NotifyProps) {
  const id = `dev#${++seq}`;
  emit("nuikit:intent", { op: "open", intent: { id, kind: "notify", resource: "dev", props, seq } } as IntentMessage);
}

const mocks = defineMocks({
  events: {
    "nuikit:intent": [
      { op: "open", intent: { id: "dev#a", kind: "notify", resource: "dev", props: { title: "Paid", description: "$500 from Los Santos Customs", status: "success" }, seq: 100 } },
      { op: "open", intent: { id: "dev#b", kind: "notify", resource: "dev", props: { title: "Low fuel", description: "Find a station", status: "warning", position: "bottom-right" }, seq: 101 } },
    ],
  },
  callbacks: {
    "nuikit:intent:resolve": { ok: true },
    "nuikit:intent:event": { ok: true },
  },
});

let ran = false;
export default function Dev() {
  useEffect(() => {
    (window as unknown as { nk: { notify: typeof notify } }).nk = { notify };
    if (ran || !new URLSearchParams(location.search).has("fixture")) return;
    ran = true;
    notify({ title: "Paid", description: "$500 from Los Santos Customs", status: "success" });
    notify({ title: "Low fuel", description: "Find a station", status: "warning", duration: 8000 });
    notify({ title: "Call failed", status: "error", icon: "phone", position: "bottom-right" });
    notify({ item: { name: "Water", count: 2 }, position: "center-left" });
  }, []);
  return <NuiDevtools {...mocks} scene="day" />;
}
