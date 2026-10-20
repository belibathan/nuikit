// Fake game for browser development. Fire events, mock callbacks, open surfaces, swap backdrops.
import { openSurface, closeSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";

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
  },
  // Play client/main.lua's part in the browser.
  callbacks: {
    "menu:select": ({ id }) => {
      if (id === "armor") openSurface("confirm", { id, title: "Buy body armor?", price: 500 });
      else closeSurface("menu");
      return { ok: true };
    },
    "confirm:answer": ({ yes }) => {
      closeSurface("confirm");
      if (yes) closeSurface("menu");
      return { ok: true };
    },
  },
});

export default function Dev() {
  useEffect(() => {
    openSurface("hud"); // in game, client/main.lua does this
    // ?open=menu or ?open=menu,confirm starts with those open (handy for screenshots)
    const open = new URLSearchParams(location.search).get("open")?.split(",") ?? [];
    if (open.includes("menu")) openSurface("menu");
    if (open.includes("confirm")) openSurface("confirm", { id: "armor", title: "Buy body armor?", price: 500 });
  }, []);
  return <NuiDevtools {...mocks} states={["dead"]} />;
}
