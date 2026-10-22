import { fetchNui, Surface, useNuiState, usePlayer, useSurfaceOpen } from "nuikit-core/react";
import { MinimapFrameView, useMinimap } from "./minimap";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { HudLayout, HudLocation, HudSettings, HudVehicle, HudWeapon, MinimapFrame, MinimapState } from "./nui";
import { Ammo } from "./hud/ammo";
import { Cluster } from "./hud/cluster";
import { layoutVars, stageLayout, useHudLayout, useViewport } from "./hud/layout";
import { CompassTape, LocationStrip } from "./hud/location";
import { useHudLook, type HudLook } from "./hud/look";
import { MapLocation, MapRing } from "./hud/map";
import { VitalsRow } from "./hud/pills";
import { Wallet } from "./hud/wallet";

export default function App() {
  // Subscribed for the page's whole life, not only while the HUD shows: Lua sends the layout, the
  // frame and the vehicle whenever they change, which can be before the surface opens.
  usePlayer(); // the player store listens from here on, so a player sent before the HUD opens isn't missed
  const data: HudData = {
    vehicle: useNuiState("hud:vehicle", false),
    location: useNuiState("hud:location", null as unknown as HudLocation) as HudLocation | null,
    weapon: useNuiState("hud:weapon", false),
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
  weapon: HudWeapon | false;
  layout: HudLayout | null;
  frame: MinimapFrame | null;
  state: MinimapState | null;
}

/** The parts, placed by the layout preset (Config.layout). A 0.6 client sends no preset: classic. */
function Hud(props: { settings: HudSettings } & HudData) {
  const player = usePlayer();
  const { w, h } = useViewport();
  const look = useHudLook();
  // Lua shows GTA's radar only while the HUD is shown, told the moment the exit or entrance starts, so
  // the radar and its ring go and come with the rest of the HUD (hud.css: the sides)
  const open = useSurfaceOpen();
  useEffect(() => {
    void fetchNui("hud:shown", { shown: open }).catch(() => {});
  }, [open]);
  return props.settings.layout === "compact" ? <Compact {...props} player={player} look={look} w={w} h={h} /> : <Classic {...props} player={player} look={look} w={w} h={h} />;
}

interface Placed {
  player: ReturnType<typeof usePlayer>;
  look: HudLook;
  w: number;
  h: number;
}

/**
 * One full-screen layer per screen edge. When the HUD opens or closes (a menu hides it), every layer
 * slides off toward its own edge and fades, all on the same frame and the same curve, and comes back
 * the same way. The map layer cuts with GTA's radar instead (a game layer can't slide).
 */
function Side({ side, children }: { side: "left" | "right" | "top" | "map"; children: ReactNode }) {
  return (
    <div data-slot="hud-side" data-side={side} className="hud-side">
      {children}
    </div>
  );
}

/** Which edge a map at this rectangle belongs to. */
function mapEdge(frame: MinimapFrame | null): "left" | "right" {
  return frame && frame.x + frame.w / 2 < 0.5 ? "left" : "right";
}

/**
 * Compact (default, design v2 §4): one cluster per job. Top right the map with the compass on its
 * ring, the location and money under it; bottom left the vitals; bottom right the ammo over the
 * vehicle cluster. Nothing floats alone.
 */
function Compact({ settings, vehicle, location, weapon, layout, frame, state, player, look, w, h }: { settings: HudSettings } & HudData & Placed) {
  const units = settings.units === "kmh" ? "kmh" : "mph";
  const mapShown = !!frame && !!state?.visible;
  const ring = mapShown && frame!.framed !== false && settings.frame !== false;
  // a map in the bottom-left corner (Config.minimap.style = 'stock', or a ring anchored there): the
  // vitals sit beside its bottom edge instead of under it
  const besideMap = !!frame && mapShown && frame.x < 0.5 && frame.y > 0.5;
  const vars = layoutVars(layout ?? stageLayout(w, h), besideMap ? frame : null, w, h) as Record<string, string>;
  // the column (location, money) hangs under the map, or stands over it when the map is in a bottom
  // corner. There it stays over the map's box even while the map is hidden: dropping into the box put
  // it on the vitals (bottom left) or the ammo and cluster (bottom right) (0.7.0 test, F6)
  let column: CSSProperties = {};
  if (frame) {
    const cx = (frame.x + frame.w / 2) * w;
    const below = frame.y + frame.h / 2 < 0.5;
    column = below
      ? { left: cx, top: mapShown ? (frame.y + frame.h) * h : frame.y * h, transform: "translateX(-50%)" }
      : { left: cx, bottom: (1 - frame.y) * h, transform: "translateX(-50%)" };
    vars["--hud-col-w"] = `${(frame.w * w).toFixed(1)}px`;
  }
  const heading = state?.heading ?? 0;
  // the column leaves with the map's edge; unplaced, it stands top right
  const columnSide = frame ? mapEdge(frame) : "right";
  const columnEl = (
    <div data-slot="hud-map-column" data-placed={!!frame || undefined} data-map={mapShown || undefined} className="hud-column" style={column}>
      {settings.location !== false && location && <MapLocation location={location} units={units} waypoint={!ring} />}
      <Wallet player={player} settings={settings} inline compact />
    </div>
  );
  return (
    <div data-slot="hud" data-layout="compact" className="hud-root" data-shadow={look.shadow} style={vars as CSSProperties}>
      <Side side="map">{ring && <MapRing frame={frame!} start={heading} compass={settings.compass?.ring !== false} location={location} units={units} />}</Side>
      <Side side="left">
        {columnSide === "left" && columnEl}
        <div className={besideMap ? "hud-beside-map" : "hud-anchor-bl"}>
          <VitalsRow player={player} settings={settings} layout="compact" />
        </div>
      </Side>
      <Side side="right">
        {columnSide === "right" && columnEl}
        <div className="hud-anchor-br hud-br-stack">
          {settings.ammo !== false && <Ammo weapon={weapon} />}
          {vehicle && <Cluster key={vehicle.kind ?? "car"} vehicle={{ ...OLD_SHAPE, ...vehicle }} settings={settings} look={look} compact anchored={false} />}
        </div>
      </Side>
    </div>
  );
}

/**
 * Classic (the 0.6 layout). Everything is anchored to GTA's HUD area (client/layout.lua → CSS variables) and to the
 * minimap's real rectangle: bottom left the map, the location above it and the vitals beside it;
 * bottom right the vehicle; top right the wallet; top centre the heading strip.
 */
function Classic({ settings, vehicle, location, weapon, layout, frame, state, player, look, w, h }: { settings: HudSettings } & HudData & Placed) {
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
    <div data-slot="hud" data-layout="classic" className="hud-root" data-shadow={look.shadow} style={vars}>
      <Side side="map">{mapShown && frame!.framed !== false && settings.frame !== false && <MinimapFrameView frame={frame!} state={state!} />}</Side>
      <Side side="left">
        {beside ? (
          <>
            {strip && <div className="hud-above-map">{strip}</div>}
            <div className="hud-beside-map">
              <VitalsRow player={player} settings={settings} layout="classic" />
            </div>
          </>
        ) : (
          <div className="hud-anchor-bl hud-stack">
            {strip}
            <VitalsRow player={player} settings={settings} layout="classic" />
          </div>
        )}
      </Side>
      <Side side="top">{tape && <CompassTape start={heading} />}</Side>
      <Side side="right">
        <div className="hud-anchor-tr hud-tr-stack">
          <Wallet player={player} settings={settings} inline />
          {settings.ammo !== false && <Ammo weapon={weapon} />}
        </div>
        {vehicle && (
          // defaults for a client that sends the 0.6 shape (speed, rpm, gear, fuel, engine, seatbelt)
          <Cluster key={vehicle.kind ?? "car"} vehicle={{ ...OLD_SHAPE, ...vehicle }} settings={settings} look={look} />
        )}
      </Side>
    </div>
  );
}
