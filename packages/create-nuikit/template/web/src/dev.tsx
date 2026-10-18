// Fake game for browser development. Fire events, mock callbacks, swap backdrops.
import { NuiDevtools, defineMocks } from "nuikit/devtools";

const mocks = defineMocks({
  events: {
    "hud:vitals": [
      { health: 100, armor: 50 },
      { health: 64, armor: 0 },
      { health: 12, armor: 0 },
    ],
    "nuikit:notify": [
      { title: "Paid", description: "+$500 from the dealer", type: "success" },
      { title: "Low fuel", description: "12% remaining", type: "warning" },
    ],
    "nuikit:visible": [true, false],
  },
  callbacks: {
    "menu:select": ({ id }) => {
      console.log("[lua] menu:select", id);
      return { ok: true };
    },
  },
});

export default function Dev() {
  return <NuiDevtools {...mocks} />;
}
