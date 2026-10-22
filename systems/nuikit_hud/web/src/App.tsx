import { fetchNui, Surface, useNuiState, usePlayer, useSurfaceOpen } from "nuikit-core/react";
import { MinimapFrameView, useMinimap } from "./minimap";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { HudCorner, HudLayout, HudParts, HudLocation, HudSettings, HudVehicle, HudWeapon, MinimapFrame, MinimapState } from "./nui";
import { Ammo } from "./hud/ammo";
import { Cluster } from "./hud/cluster";
import { LayoutEditor } from "./hud/editor";
import { useLegibility } from "./hud/legibility";
import { ShownZones, shownZones, useSituation, type Situation } from "./hud/situation";
import { layoutVars, stageLayout, useHudLayout, useViewport } from "./hud/layout";
import { CompassTape, LocationStrip } from "./hud/location";
import { useHudLook, type HudLook } from "./hud/look";
import { MapLocation, MapRing } from "./hud/map";
import { BESIDE_CLASS, CORNER_CLASS, CORNERS, cornerSide, Part, placeParts, resolveParts } from "./hud/parts";
import { VitalsRow } from "./hud/pills";
import { Wallet } from "./hud/wallet";

export default function App() {
  // Subscribed for the page's whole life, not only while the HUD shows: Lua sends the layout, the
  // frame and the vehicle whenever they change, which can be before the surface opens.
  usePlayer(); // the player store listens from here on, so a player sent before the HUD opens isn't missed
  useLegibility();
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
  // Foundation 2 situations: a moment is any change to what the HUD shows (situation.ts)
  const lua: Situation = useNuiState("hud:situation", { name: "rest" }).name;
  const p = player;
  const key = [p.health, p.armor, p.hunger, p.thirst, p.stress, p.cash, p.bank, props.location?.street, props.weapon ? props.weapon.kind : ""].join("|");
  const zones = shownZones(props.settings.situations, useSituation(lua, key));
  return (
    <ShownZones value={zones}>
      {props.settings.layout === "compact" ? <Compact {...props} player={player} look={look} w={w} h={h} /> : <Classic {...props} player={player} look={look} w={w} h={h} />}
    </ShownZones>
  );
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
    // one rect per part, named by its Foundation 2 zone (parts.tsx PART_ZONE); the map layer is "map"
    const rects: { x: number; y: number; w: number; h: number; zone: string }[] = [];
    document.querySelectorAll<HTMLElement>('[data-slot="hud-side"]').forEach((side) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(side).transform === "none" ? undefined : getComputedStyle(side).transform);
      const parts = side.dataset.side === "map" ? Array.from(side.children) : Array.from(side.querySelectorAll<HTMLElement>("[data-zone]"));
      for (const el of parts) {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        const round = (n: number) => Math.round(n * 1000) / 1000;
        const zone = (el as HTMLElement).dataset.zone ?? "map";
        // a retracted part (situations) is published where it rests, so notices don't move in under it
        const t = getComputedStyle(el).transform;
        const own = t && t !== "none" ? new DOMMatrixReadOnly(t) : { m41: 0, m42: 0 };
        rects.push({ x: round((r.left - m.m41 - own.m41) / W), y: round((r.top - m.m42 - own.m42) / H), w: round(r.width / W), h: round(r.height / H), zone });
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
    document.querySelectorAll('[data-slot="hud-side"] [data-zone], [data-slot="hud-side"][data-side="map"] > *').forEach((el) => ro.observe(el));
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

/**
 * One stack per corner (Config.parts), on the side it belongs to. The stack in the map's own corner
 * (`beside`) sits beside the map, level with its outer edge, instead of under or over it.
 */
function corners(groups: ReturnType<typeof placeParts>, side: "left" | "right", beside?: HudCorner | null) {
  return CORNERS.filter((c) => cornerSide(c) === side && groups[c].length > 0).map((c) => (
    <div key={c} data-slot="hud-corner" data-corner={c} data-beside={c === beside || undefined} className={c === beside ? BESIDE_CLASS[c] : CORNER_CLASS[c]}>
      {groups[c].map((p) => (
        <Part key={p.name} name={p.name}>
          {p.el}
        </Part>
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
  // the corner the map is placed in (where it belongs, not its blink): the stack in that corner sits
  // beside the map, level with its outer edge, instead of under or over it
  const mapCorner: HudCorner | null = frame && mapPlaced ? (`${frame.y + frame.h / 2 < 0.5 ? "top" : "bottom"}-${frame.x + frame.w / 2 < 0.5 ? "left" : "right"}` as HudCorner) : null;
  const vars = layoutVars(layout ?? stageLayout(w, h), mapCorner ? frame : null, w, h) as Record<string, string>;
  // the column (location, money) hangs under the map or stands over it: Config.minimap.column (or the
  // player's style) 'below', 'above', or 'auto' (under a map in a top corner, over one in a bottom
  // corner). Over the ring it clears the heading read above it. It stays over the map's box even
  // while the map is hidden: dropping into the box put it on the vitals or the cluster (0.7.0, F6)
  let column: CSSProperties = {};
  if (frame) {
    const cx = (frame.x + frame.w / 2) * w;
    const pick = settings.mapColumn ?? "auto";
    const below = pick === "auto" ? frame.y + frame.h / 2 < 0.5 : pick === "below";
    const clear = ring && settings.compass?.ring !== false ? "2.5rem" : "0px";
    column = below
      ? { left: cx, top: mapPlaced ? (frame.y + frame.h) * h : frame.y * h, transform: "translateX(-50%)" }
      : { left: cx, bottom: `calc(${((1 - frame.y) * h).toFixed(1)}px + ${clear})`, transform: "translateX(-50%)" };
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
        <Part key={p.name} name={p.name}>
          {p.el}
        </Part>
      ))}
    </div>
  );
  return (
    <div data-slot="hud" data-layout="compact" className="hud-root" data-shadow={look.shadow} style={vars as CSSProperties}>
      <Side side="map" slide={settings.slide && frame ? mapEdge(frame) : undefined}>{ring && <MapRing frame={frame!} start={heading} compass={settings.compass?.ring !== false} location={location} units={units} halo={settings.halo !== false} tag={settings.waypointTag === true} />}</Side>
      <Side side="left">
        {columnSide === "left" && columnEl}
        {corners(groups, "left", mapCorner)}
      </Side>
      <Side side="right">
        {columnSide === "right" && columnEl}
        {corners(groups, "right", mapCorner)}
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
        {above.length > 0 && (
          <div className="hud-above-map">
            <Part name="location">{above[0].el}</Part>
          </div>
        )}
        {besideEls.length > 0 && (
          <div className="hud-beside-map hud-stack">
            {besideEls.map((p) => (
              <Part key={p.name} name={p.name}>
          {p.el}
        </Part>
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
