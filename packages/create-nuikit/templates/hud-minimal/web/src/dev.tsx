// The game, faked for browser development. Press ` for the devtools: fire the player and the
// vehicle (Events tab), swap the backdrop.
// ?fixture=<name> picks the starting state (see hudMinimalFixtures); ?drive=1 also drives the gauge
// the way client/main.lua streams speed and rpm.
import { emit, openSurface } from "nuikit-core";
import { NuiDevtools, defineMocks } from "nuikit-core/devtools";
import { useEffect } from "react";
import { hudMinimalFixtures, type HudMinimalFixture } from "@/components/blocks/hud-minimal/fixtures";

const f = hudMinimalFixtures;

const mocks = defineMocks({
  events: {
    // nuikit's bridge sends this whenever the player changes (nk.player in Lua)
    "nuikit:player": [f["on-foot"].player, f.talking.player, f.warnings.player, f.standalone.player],
    "hud:vehicle": [f.driving.vehicle, f.warnings.vehicle, false],
    // live values: client/main.lua streams them about 30 times a second while driving
    "hud:vehicle:speed": [0, 64, 118],
    "hud:vehicle:rpm": [0.12, 0.54, 0.94],
  },
});

export default function Dev() {
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fixture = f[(params.get("fixture") ?? "driving") as HudMinimalFixture] ?? f.driving;
    emit("nuikit:player", fixture.player);
    void openSurface("hud"); // in game, client/main.lua opens it once a character is loaded
    if (!fixture.vehicle) return;
    emit("hud:vehicle", fixture.vehicle);
    emit("hud:vehicle:speed", fixture.vehicle.speed);
    emit("hud:vehicle:rpm", fixture.vehicle.rpm);
    if (!params.has("drive")) return;
    // accelerate through the gears and back, at the rate main.lua streams
    let t = 0;
    const id = setInterval(() => {
      t += 1 / 30;
      const phase = (Math.sin(t / 2) + 1) / 2;
      emit("hud:vehicle:speed", Math.round(phase * 120));
      emit("hud:vehicle:rpm", 0.2 + ((phase * 4) % 1) * 0.75);
    }, 33);
    return () => clearInterval(id);
  }, []);
  return <NuiDevtools {...mocks} scene="day" />;
}
