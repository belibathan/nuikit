import { fetchNui, Surface, useNuiState, usePlayer, useSurfaceOpen } from "nuikit-core/react";
import { MinimapFrameView, useMinimap } from "./minimap";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { HudLayout, HudParts, HudLocation, HudSettings, HudVehicle, HudWeapon, MinimapFrame, MinimapState } from "./nui";
import { Ammo } from "./hud/ammo";
import { Cluster } from "./hud/cluster";
import { LayoutEditor } from "./hud/editor";
import { layoutVars, stageLayout, useHudLayout, useViewport } from "./hud/layout";
import { CompassTape, LocationStrip } from "./hud/location";
import { useHudLook, type HudLook } from "./hud/look";
import { MapLocation, MapRing } from "./hud/map";
import { CORNER_CLASS, CORNERS, cornerSide, placeParts, resolveParts } from "./hud/parts";
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
  // /hud edit: the editor's draft placement, shown on the HUD live until it is saved or dropped
  const [draft, setDraft] = useState<HudParts | null>(null);
  return (
    <>
      <Surface name="hud" layer="hud">
        {(settings) => {
          const s = settings ?? { units: "mph", needs: true };
          return <Hud settings={draft ? { ...s, parts: draft } : s} {...data} />;
        }}
      </Surface>
      <Surface name="hud-edit" layer="panel" input="full">
        {(edit) => edit && <LayoutEditor data={edit} onDraft={setDraft} />}
      </Surface>
    </>
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
  usePublishZones(open);
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
 * the same way. The map layer cuts with GTA's radar instead, or slides with it toward `slide`, its edge
 * (Config.minimap.slide: Lua moves the radar on the same curve).
 */
function Side({ side, slide, children }: { side: "left" | "right" | "top" | "map"; slide?: "left" | "right"; children: ReactNode }) {
  return (
    <div data-slot="hud-side" data-side={side} data-slide={slide} className="hud-side">
      {children}
    </div>
  );
}

/**
 * Publish what the HUD covers (screen zones, nuikit-core): every part on the sides, where it rests
 * (an entrance's slide is taken out), so notices and prompts in the same corner start clear of the map
 * and the cluster. Measured after each render and on resize, sent only when it changed; left as it is
 * while the HUD is away (a menu hiding it shouldn't move the notices).
 */
function usePublishZones(open: boolean) {
  const last = useRef("");
  const frame = useRef(0);
  const measure = useRef(() => {});
  measure.current = () => {
    if (!open) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    document.querySelectorAll<HTMLElement>('[data-slot="hud-side"]').forEach((side) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(side).transform === "none" ? undefined : getComputedStyle(side).transform);
      for (const el of Array.from(side.children)) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const round = (n: number) => Math.round(n * 1000) / 1000;
        rects.push({ x: round((r.left - m.m41) / W), y: round((r.top - m.m42) / H), w: round(r.width / W), h: round(r.height / H) });
      }
    });
    const key = JSON.stringify(rects);
    if (key === last.current) return;
    last.current = key;
    void fetchNui("hud:zones", { rects }).catch(() => {});
  };
  useEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => measure.current());
  });
  useEffect(() => {
    const on = () => measure.current();
    window.addEventListener("resize", on);
    // a part that grows or shrinks without a render (a roll, an image)
    const ro = new ResizeObserver(on);
    document.querySelectorAll('[data-slot="hud-side"] > *').forEach((el) => ro.observe(el));
    return () => {
      window.removeEventListener("resize", on);
      ro.disconnect();
    };
  });
}

/** Which edge a map at this rectangle belongs to. */
function mapEdge(frame: MinimapFrame | null): "left" | "right" {
  return frame && frame.x + frame.w / 2 < 0.5 ? "left" : "right";
}

/** One stack per corner (Config.parts), on the side it belongs to; `bl` replaces the bottom-left stack's class. */
function corners(groups: ReturnType<typeof placeParts>, side: "left" | "right", bl?: string) {
  return CORNERS.filter((c) => cornerSide(c) === side && groups[c].length > 0).map((c) => (
    <div key={c} data-slot="hud-corner" data-corner={c} className={c === "bottom-left" && bl ? bl : CORNER_CLASS[c]}>
      {groups[c].map((p) => (
        <Fragment key={p.name}>{p.el}</Fragment>
      ))}
    </div>
  ));
}

/**
 * Compact (default, design v2 §4): one cluster per job. Top right the map with the compass on its
 * ring, the location and money under it; bottom left the vitals; bottom right the ammo over the
 * vehicle cluster. Nothing floats alone. Config.parts moves any of them.
 */
function Compact({ settings, vehicle, location, weapon, layout, frame, state, player, look, w, h }: { settings: HudSettings } & HudData & Placed) {
  const units = settings.units === "kmh" ? "kmh" : "mph";
  const mapShown = !!frame && !!state?.visible;
  // the layout follows where the map belongs, not its blink: the radar cuts the moment a menu opens,
  // and the column under it must slide away from where it stood, not jump into the map's place first
  const mapPlaced = !!frame && (state?.wanted ?? mapShown);
  const ring = mapShown && frame!.framed !== false && settings.frame !== false;
  // a map in the bottom-left corner (Config.minimap.style = 'stock', or a ring anchored there): the
  // bottom-left stack sits beside its bottom edge instead of under it
  const besideMap = !!frame && mapPlaced && frame.x < 0.5 && frame.y > 0.5;
  const vars = layoutVars(layout ?? stageLayout(w, h), besideMap ? frame : null, w, h) as Record<string, string>;
  // the column (location, money) hangs under the map, or stands over it when the map is in a bottom
  // corner. There it stays over the map's box even while the map is hidden: dropping into the box put
  // it on the vitals (bottom left) or the ammo and cluster (bottom right) (0.7.0 test, F6)
  let column: CSSProperties = {};
  if (frame) {
    const cx = (frame.x + frame.w / 2) * w;
    const below = frame.y + frame.h / 2 < 0.5;
    column = below
      ? { left: cx, top: mapPlaced ? (frame.y + frame.h) * h : frame.y * h, transform: "translateX(-50%)" }
      : { left: cx, bottom: (1 - frame.y) * h, transform: "translateX(-50%)" };
    vars["--hud-col-w"] = `${(frame.w * w).toFixed(1)}px`;
  }
  const heading = state?.heading ?? 0;
  const groups = placeParts(resolveParts("compact", settings.parts), {
    location: settings.location !== false && location && <MapLocation location={location} units={units} waypoint={!ring} />,
    wallet: <Wallet player={player} settings={settings} inline compact />,
    vitals: <VitalsRow player={player} settings={settings} layout="compact" />,
    ammo: settings.ammo !== false && <Ammo weapon={weapon} />,
    vehicle: vehicle && <Cluster key={vehicle.kind ?? "car"} vehicle={{ ...OLD_SHAPE, ...vehicle }} settings={settings} look={look} compact anchored={false} />,
  });
  // the column leaves with the map's edge; unplaced, it stands top right
  const columnSide = frame ? mapEdge(frame) : "right";
  const columnEl = groups.map.length > 0 && (
    <div data-slot="hud-map-column" data-placed={!!frame || undefined} data-map={mapPlaced || undefined} className="hud-column" style={column}>
      {groups.map.map((p) => (
        <Fragment key={p.name}>{p.el}</Fragment>
      ))}
    </div>
  );
  const bl = besideMap ? "hud-beside-map hud-stack" : undefined;
  return (
    <div data-slot="hud" data-layout="compact" className="hud-root" data-shadow={look.shadow} style={vars as CSSProperties}>
      <Side side="map" slide={settings.slide && frame ? mapEdge(frame) : undefined}>{ring && <MapRing frame={frame!} start={heading} compass={settings.compass?.ring !== false} location={location} units={units} halo={settings.halo !== false} tag={settings.waypointTag === true} />}</Side>
      <Side side="left">
        {columnSide === "left" && columnEl}
        {corners(groups, "left", bl)}
      </Side>
      <Side side="right">
        {columnSide === "right" && columnEl}
        {corners(groups, "right")}
      </Side>
    </div>
  );
}

/**
 * Classic (the 0.6 layout). Everything is anchored to GTA's HUD area (client/layout.lua → CSS variables) and to the
 * minimap's real rectangle: bottom left the map, the location above it and the vitals beside it;
 * bottom right the vehicle; top right the wallet; top centre the heading strip. Config.parts moves any of them.
 */
function Classic({ settings, vehicle, location, weapon, layout, frame, state, player, look, w, h }: { settings: HudSettings } & HudData & Placed) {
  const mapShown = !!frame && !!state?.visible;
  // the vitals and location line up with a map in the bottom-left corner (where it belongs, so a menu
  // cutting the radar doesn't move them mid-exit)
  const beside = !!frame && (state?.wanted ?? mapShown) && frame.x < 0.5 && frame.y > 0.5;
  const vars = layoutVars(layout ?? stageLayout(w, h), beside ? frame : null, w, h);
  const heading = state?.heading ?? 0;
  const units = settings.units === "kmh" ? "kmh" : "mph";
  const compass = settings.compass ?? {};
  const tape = compass.enabled !== false && (!!vehicle || compass.onFoot === true);

  const groups = placeParts(resolveParts("classic", settings.parts), {
    location: settings.location !== false && location && <LocationStrip location={location} units={units} heading start={heading} />,
    wallet: <Wallet player={player} settings={settings} inline />,
    vitals: <VitalsRow player={player} settings={settings} layout="classic" />,
    ammo: settings.ammo !== false && <Ammo weapon={weapon} />,
    // defaults for a client that sends the 0.6 shape (speed, rpm, gear, fuel, engine, seatbelt)
    vehicle: vehicle && <Cluster key={vehicle.kind ?? "car"} vehicle={{ ...OLD_SHAPE, ...vehicle }} settings={settings} look={look} anchored={false} />,
  });
  // on the map: the location above a bottom-left map, the rest beside it; elsewhere they join the
  // bottom-left stack in their order
  const onMap = groups.map;
  const above = beside ? onMap.filter((p) => p.name === "location") : [];
  const besideEls = beside ? onMap.filter((p) => p.name !== "location") : [];
  if (!beside) groups["bottom-left"] = [...groups["bottom-left"], ...onMap].sort((a, b) => a.order - b.order);

  return (
    <div data-slot="hud" data-layout="classic" className="hud-root" data-shadow={look.shadow} style={vars}>
      <Side side="map" slide={settings.slide && frame ? mapEdge(frame) : undefined}>{mapShown && frame!.framed !== false && settings.frame !== false && <MinimapFrameView frame={frame!} state={state!} />}</Side>
      <Side side="left">
        {above.length > 0 && <div className="hud-above-map">{above[0].el}</div>}
        {besideEls.length > 0 && (
          <div className="hud-beside-map hud-stack">
            {besideEls.map((p) => (
              <Fragment key={p.name}>{p.el}</Fragment>
            ))}
          </div>
        )}
        {corners(groups, "left")}
      </Side>
      <Side side="top">{tape && <CompassTape start={heading} />}</Side>
      <Side side="right">{corners(groups, "right")}</Side>
    </div>
  );
}
