import { Surface, useNuiState, usePlayer } from "nuikit-core/react";
import { MinimapFrameView, useMinimap } from "./minimap";
import type { HudLayout, HudLocation, HudSettings, HudVehicle, MinimapFrame, MinimapState } from "./nui";
import { Cluster } from "./hud/cluster";
import { layoutVars, stageLayout, useHudLayout, useViewport } from "./hud/layout";
import { CompassTape, LocationStrip } from "./hud/location";
import { useHudLook } from "./hud/look";
import { Vitals } from "./hud/vitals";
import { Wallet } from "./hud/wallet";

export default function App() {
  // Subscribed for the page's whole life, not only while the HUD shows: Lua sends the layout, the
  // frame and the vehicle whenever they change, which can be before the surface opens.
  usePlayer(); // the player store listens from here on, so a player sent before the HUD opens isn't missed
  const data: HudData = {
    vehicle: useNuiState("hud:vehicle", false),
    location: useNuiState("hud:location", null as unknown as HudLocation) as HudLocation | null,
    layout: useHudLayout(),
    ...useMinimap(),
  };
  return (
    <Surface name="hud" layer="hud">
      {(settings) => <Hud settings={settings ?? { units: "mph", needs: true }} {...data} />}
    </Surface>
  );
}

const OLD_SHAPE: Partial<HudVehicle> = { kind: "car", engineOn: true, redline: 0.9, body: 100, moving: false };

interface HudData {
  vehicle: HudVehicle | false;
  location: HudLocation | null;
  layout: HudLayout | null;
  frame: MinimapFrame | null;
  state: MinimapState | null;
}

/**
 * The HUD. Everything is anchored to GTA's HUD area (client/layout.lua → CSS variables) and to the
 * minimap's real rectangle: bottom left the map, the location above it and the vitals beside it;
 * bottom right the vehicle; top right the wallet; top centre the heading strip.
 */
function Hud({ settings, vehicle, location, layout, frame, state }: { settings: HudSettings } & HudData) {
  const player = usePlayer();
  const { w, h } = useViewport();
  const look = useHudLook();

  const mapShown = !!frame && !!state?.visible;
  // the vitals and location line up with a map in the bottom-left corner
  const beside = mapShown && frame!.x < 0.5 && frame!.y > 0.5;
  const vars = layoutVars(layout ?? stageLayout(w, h), beside ? frame : null, w, h);
  const heading = state?.heading ?? 0;
  const units = settings.units === "kmh" ? "kmh" : "mph";
  const compass = settings.compass ?? {};
  const tape = compass.enabled !== false && (!!vehicle || compass.onFoot === true);

  const strip = settings.location !== false && location && <LocationStrip location={location} units={units} heading start={heading} />;

  return (
    <div data-slot="hud" className="hud-root" data-shadow={look.shadow} style={vars}>
      {mapShown && frame!.framed !== false && settings.frame !== false && <MinimapFrameView frame={frame!} state={state!} />}
      {beside ? (
        <>
          {strip && <div className="hud-above-map">{strip}</div>}
          <div className="hud-beside-map">
            <Vitals player={player} settings={settings} />
          </div>
        </>
      ) : (
        <div className="hud-anchor-bl hud-stack">
          {strip}
          <Vitals player={player} settings={settings} />
        </div>
      )}
      {tape && <CompassTape start={heading} />}
      <Wallet player={player} settings={settings} />
      {vehicle && (
        // defaults for a client that sends the 0.6 shape (speed, rpm, gear, fuel, engine, seatbelt)
        <Cluster key={vehicle.kind ?? "car"} vehicle={{ ...OLD_SHAPE, ...vehicle }} settings={settings} look={look} />
      )}
    </div>
  );
}
