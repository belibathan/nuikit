import { onNui } from "nuikit-core";
import { fetchNui, useNuiState } from "nuikit-core/react";
import {
  ArrowLeftIcon,
  FlagIcon,
  LayersIcon,
  LocateFixedIcon,
  MapIcon,
  MapPinIcon,
  MinusIcon,
  NavigationIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { MapBlip, MapInfo, MapPick, PauseData, PausePlace } from "../nui";
import { Blips, type BlipChoice } from "./blips";
import { blipLook, KINDS, type BlipKind } from "@/lib/blips";
import { Button } from "@/components/ui/button";
import { HudChip } from "@/components/ui/hud-chip";
import { SmoothInput } from "@/components/ui/smooth-input";
import { Kbd } from "@/components/ui/kbd";
import { MenuRow } from "@/components/ui/menu-row";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { useFrameBatch } from "@/lib/batch";
import { distance, list } from "@/lib/format";
import { icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Selection = { kind: "place"; place: PausePlace } | { kind: "point"; pick: MapPick } | { kind: "blip"; choice: BlipChoice; waypoint: boolean };
const NO_BLIPS: MapBlip[] = [];

const DRAG_PX = 4; // less than this between down and up is a click
const NO_INFO: MapInfo = { zone: "", street: "", topdown: false, waypoint: false };

/**
 * The 3D map (docs/pause-3d.md). The game camera hangs over the real world; this is only the glass
 * on top: an input layer for drag / rotate / zoom / click, the pins Lua projects, and panels.
 * Pins move every frame, so they bypass React (see <Pins>); the panels only re-render when the
 * area or street under the view changes.
 */
export function MapView({ data, onBack }: { data: PauseData; onBack: () => void }) {
  const info = useNuiState("pause:map:info", NO_INFO);
  const places = useMemo(() => list(data?.places), [data?.places]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const compass = useRef<SVGSVGElement>(null);
  const raw = useNuiState("pause:map:blips", NO_BLIPS);
  const blips = useMemo(() => (Array.isArray(raw) ? raw : []), [raw]);
  const [hidden, setHidden] = useState<ReadonlySet<BlipKind>>(() => new Set());
  const toggle = (k: BlipKind) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  // a marker: one blip sets the waypoint there; a merged group flies in so it comes apart
  const chooseBlip = (c: BlipChoice) => {
    if (c.count > 1) {
      void fetchNui("pause:map:fly", { x: c.blip.x, y: c.blip.y }).catch(() => {});
      return;
    }
    setSelection({ kind: "blip", choice: c, waypoint: true });
    void fetchNui("pause:map:waypoint", { x: c.blip.x, y: c.blip.y }).catch(() => {});
  };
  const legend = useMemo(() => {
    const n = new Map<BlipKind, number>();
    for (const b of blips) {
      const k = blipLook(b).kind;
      n.set(k, (n.get(k) ?? 0) + 1);
    }
    return KINDS.filter((k) => n.has(k.kind)).map((k) => ({ ...k, count: n.get(k.kind)! }));
  }, [blips]);
  const blipHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return blips
      .map((b) => ({ blip: b, look: blipLook(b), count: 1 }))
      .filter((c) => c.look.label.toLowerCase().includes(q) || c.look.kindLabel.toLowerCase().includes(q))
      .slice(0, 30);
  }, [blips, query]);

  const pan = useFrameBatch((dx, dy) => void fetchNui("pause:map:pan", { dx, dy }).catch(() => {}));
  const rotate = useFrameBatch((dx, dy) => void fetchNui("pause:map:rotate", { dx, dy }).catch(() => {}));
  const zoom = (delta: number) => void fetchNui("pause:map:zoom", { delta }).catch(() => {});

  const pick = async (u: number, v: number) => {
    const hit = await fetchNui("pause:map:pick", { u, v }).catch(() => null);
    if (hit?.ok) setSelection({ kind: "point", pick: hit });
  };
  const choose = (place: PausePlace) => {
    setSelection({ kind: "place", place });
    void fetchNui("pause:map:focus", { id: place.id }).catch(() => {});
  };

  // Keyboard: arrows / WASD pan, Q E rotate, + - zoom. Not while typing in the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      const step = 0.08;
      if (k === "arrowleft" || k === "a") pan(step, 0);
      else if (k === "arrowright" || k === "d") pan(-step, 0);
      else if (k === "arrowup" || k === "w") pan(0, step);
      else if (k === "arrowdown" || k === "s") pan(0, -step);
      else if (k === "q") rotate(-0.05, 0);
      else if (k === "e") rotate(0.05, 0);
      else if (k === "+" || k === "=") zoom(-0.2);
      else if (k === "-") zoom(0.25);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? places.filter((p) => p.label.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) : places;
  }, [places, query]);
  const groups = useMemo(() => {
    const g = new Map<string, PausePlace[]>();
    for (const p of shown) g.set(p.category ?? "Places", [...(g.get(p.category ?? "Places") ?? []), p]);
    return [...g];
  }, [shown]);

  const selectedId = selection?.kind === "place" ? selection.place.id : undefined;
  const selectedBlip = selection?.kind === "blip" ? selection.choice.blip.id : undefined;

  return (
    <div className="absolute inset-0 overflow-hidden select-none [--nk-edge:3rem]">
      <div className="pause-map-shade pointer-events-none absolute inset-0" aria-hidden />
      <InputLayer pan={pan} rotate={rotate} zoom={zoom} pick={pick} />
      <Blips blips={blips} hidden={hidden} selectedId={selectedBlip} onChoose={chooseBlip} />
      <Pins places={places} selectedId={selectedId} onChoose={choose} compass={compass} />

      {/* top left: where we're looking, and the way back */}
      <div className="nk-anchor-tl flex w-80 flex-col gap-3">
        <Panel size="auto" className="w-full">
          <PanelHeader
            icon={<MapIcon />}
            title={info.zone || "Map"}
            description={info.street || "Drag to move, right-drag to turn, scroll to zoom"}
            actions={
              <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back">
                <ArrowLeftIcon />
                Back
                <Kbd className="ml-1">Esc</Kbd>
              </Button>
            }
          />
        </Panel>

        {(places.length > 0 || blips.length > 0) && (
          <Panel size="auto" className="w-full">
            <PanelHeader
              tabs={
                <label className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <SmoothInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search places and blips" className="h-8 pl-8" />
                </label>
              }
              title="Places"
              actions={<span className="nk-label nk-num">{shown.length + blipHits.length}</span>}
            />
            <PanelBody scroll className="max-h-[18rem]">
              {groups.length === 0 && blipHits.length === 0 ? (
                <p className="nk-row text-muted-foreground">Nothing matches. Try another name.</p>
              ) : (
                groups.map(([category, rows]) => (
                  <div key={category} className="flex flex-col gap-0.5">
                    <p className="nk-label px-3 pt-2 pb-1">{category}</p>
                    {rows.map((p) => {
                      const Icon = icon(p.icon);
                      return (
                        <MenuRow key={p.id} icon={<Icon />} active={p.id === selectedId} onClick={() => choose(p)}>
                          {p.label}
                        </MenuRow>
                      );
                    })}
                  </div>
                ))
              )}
              {blipHits.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <p className="nk-label px-3 pt-2 pb-1">On the map</p>
                  {blipHits.map((c) => (
                    <MenuRow
                      key={c.blip.id}
                      icon={<c.look.icon />}
                      meta={c.look.kindLabel}
                      active={c.blip.id === selectedBlip}
                      onClick={() => {
                        setSelection({ kind: "blip", choice: c, waypoint: false });
                        void fetchNui("pause:map:fly", { x: c.blip.x, y: c.blip.y }).catch(() => {});
                      }}
                    >
                      {c.look.label}
                    </MenuRow>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>
        )}

        {legend.length > 0 && (
          <Panel size="auto" className="w-full">
            <PanelHeader title="On the map" description="What GTA's map shows, by kind" actions={<span className="nk-label nk-num">{blips.length}</span>} />
            <PanelBody scroll className="max-h-[16rem]">
              {legend.map((k) => (
                <MenuRow key={k.kind} icon={<k.icon />} checked={!hidden.has(k.kind)} onCheckedChange={() => toggle(k.kind)} meta={String(k.count)}>
                  {k.label}
                </MenuRow>
              ))}
            </PanelBody>
          </Panel>
        )}
      </div>

      {/* top right: GTA's own map is one press away */}
      <div className="nk-anchor-tr">
        <Button variant="outline" className="nk-panel h-9" onClick={() => void fetchNui("pause:gamemap").catch(() => {})}>
          <MapIcon />
          Game map
          <Kbd className="ml-1">P</Kbd>
        </Button>
      </div>

      {/* bottom right: the camera */}
      <Controls topdown={info.topdown} zoom={zoom} compass={compass} />

      {/* bottom middle: what's picked */}
      {selection && (
        <div className="nk-anchor-b">
          <SelectionCard
            key={selection.kind === "place" ? selection.place.id : selection.kind === "blip" ? `blip-${selection.choice.blip.id}` : `${selection.pick.point?.x},${selection.pick.point?.y}`}
            selection={selection}
            hasWaypoint={info.waypoint}
            onClose={() => setSelection(null)}
          />
        </div>
      )}
    </div>
  );
}

/** Everything behind the panels: left-drag pans, right-drag turns, wheel zooms, a click picks. */
function InputLayer({
  pan,
  rotate,
  zoom,
  pick,
}: {
  pan: (dx: number, dy: number) => void;
  rotate: (dx: number, dy: number) => void;
  zoom: (delta: number) => void;
  pick: (u: number, v: number) => void;
}) {
  const drag = useRef<{ button: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null);
  return (
    <div
      className="pause-map-input absolute inset-0 cursor-grab active:cursor-grabbing"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.button !== 2) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { button: e.button, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = (e.clientX - d.x) / window.innerWidth;
        const dy = (e.clientY - d.y) / window.innerHeight;
        d.x = e.clientX;
        d.y = e.clientY;
        if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > DRAG_PX) d.moved = true;
        if (d.button === 2) rotate(dx, dy);
        else pan(dx, dy);
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved && d.button === 0) pick(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
      }}
      onPointerCancel={() => (drag.current = null)}
      onWheel={(e) => zoom(e.deltaY > 0 ? 0.18 : -0.15)}
    />
  );
}

/** Move an element to a 0–1 screen point with a GPU transform (no layout, no React render). */
function place(el: HTMLElement | SVGElement | null, x: number, y: number, w: number, h: number) {
  if (!el) return;
  if (x < 0) {
    el.style.visibility = "hidden";
    return;
  }
  el.style.visibility = "visible";
  el.style.transform = `translate3d(${(x * w).toFixed(1)}px, ${(y * h).toFixed(1)}px, 0)`;
}

/**
 * The pins. Lua sends their positions every frame the camera moves; this writes them straight onto
 * the elements, so 60 updates a second never go through React.
 */
const Pins = memo(function Pins({
  places,
  selectedId,
  onChoose,
  compass,
}: {
  places: PausePlace[];
  selectedId?: string;
  onChoose: (p: PausePlace) => void;
  compass: RefObject<SVGSVGElement | null>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const you = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const wp = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(
    () =>
      onNui("pause:map:pins", (p) => {
        const el = root.current;
        if (!el) return;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const at = Array.isArray(p.at) ? p.at : [];
        for (let i = 0; i < places.length; i++) place(pins.current[i] ?? null, at[i * 2] ?? -1, at[i * 2 + 1] ?? -1, w, h);
        if (p.you) {
          place(you.current, p.you[0], p.you[1], w, h);
          if (arrow.current) arrow.current.style.transform = `rotate(${p.you[2]}deg)`;
        } else place(you.current, -1, -1, w, h);
        if (p.wp) place(wp.current, p.wp[0], p.wp[1], w, h);
        else place(wp.current, -1, -1, w, h);
        if (compass.current) compass.current.style.transform = `rotate(${p.h}deg)`;
      }),
    [places, compass],
  );

  return (
    <div ref={root} className="pointer-events-none absolute inset-0">
      {places.map((p, i) => {
        const Icon = icon(p.icon);
        const selected = p.id === selectedId;
        const labelled = selected || hover === p.id;
        return (
          <button
            key={p.id}
            ref={(el) => void (pins.current[i] = el)}
            type="button"
            className="pause-pin-anchor pointer-events-auto outline-none"
            style={{ visibility: "hidden", zIndex: selected || hover === p.id ? 2 : 1 }}
            onClick={() => onChoose(p)}
            onPointerEnter={() => setHover(p.id)}
            onPointerLeave={() => setHover((h) => (h === p.id ? null : h))}
            onFocus={() => setHover(p.id)}
            onBlur={() => setHover(null)}
            aria-label={p.label}
          >
            <span className="pause-pin-center">
              <HudChip icon={<Icon />} active={selected} className={cn("pause-pin", !labelled && "w-7 justify-center px-0")}>
                {labelled ? p.label : undefined}
              </HudChip>
            </span>
          </button>
        );
      })}
      <div ref={wp} className="pause-pin-anchor" style={{ visibility: "hidden", zIndex: 3 }}>
        <span className="pause-pin-above">
          <HudChip icon={<FlagIcon />} active>
            Waypoint
          </HudChip>
        </span>
      </div>
      <div ref={you} className="pause-pin-anchor" style={{ visibility: "hidden", zIndex: 4 }} aria-label="You">
        <span className="pause-pin-center">
          <span className="pause-you flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <NavigationIcon ref={arrow} className="size-3.5" />
          </span>
        </span>
      </div>
    </div>
  );
});

function Controls({ topdown, zoom, compass }: { topdown: boolean; zoom: (d: number) => void; compass: RefObject<SVGSVGElement | null> }) {
  const btn = (label: string, child: ReactNode, onClick: () => void, pressed?: boolean) => (
    <Button variant={pressed ? "secondary" : "ghost"} size="icon" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {child}
    </Button>
  );
  return (
    <div className="nk-anchor-br">
      <div className="nk-panel flex flex-col items-center gap-1 p-1.5">
        <span className="flex size-9 items-center justify-center text-muted-foreground" aria-label="North">
          <NavigationIcon ref={compass} className="size-4" />
        </span>
        {btn("Zoom in", <PlusIcon />, () => zoom(-0.3))}
        {btn("Zoom out", <MinusIcon />, () => zoom(0.4))}
        {btn("Top-down", <LayersIcon />, () => void fetchNui("pause:map:topdown", { on: !topdown }).catch(() => {}), topdown)}
        {btn("Find me", <LocateFixedIcon />, () => void fetchNui("pause:map:recenter").catch(() => {}))}
      </div>
    </div>
  );
}

function SelectionCard({ selection, hasWaypoint, onClose }: { selection: Selection; hasWaypoint: boolean; onClose: () => void }) {
  const blip = selection.kind === "blip" ? selection.choice : undefined;
  // a blip sets the waypoint when it's clicked
  const [set, setSet] = useState(selection.kind === "blip" && selection.waypoint);
  const place = selection.kind === "place" ? selection.place : undefined;
  const pick = selection.kind === "point" ? selection.pick : undefined;
  const Icon = place ? icon(place.icon) : blip ? blip.look.icon : MapPinIcon;
  const target = place ? { x: place.x, y: place.y } : blip ? { x: blip.blip.x, y: blip.blip.y } : pick?.point;
  const title = place?.label ?? blip?.look.label ?? pick?.street ?? "Unknown road";
  const description = place ? place.category : blip ? blip.look.kindLabel : [pick?.crossing && `Near ${pick.crossing}`, pick?.zone].filter(Boolean).join(", ");

  return (
    <Panel size="lg">
      <PanelHeader
        icon={<Icon />}
        title={title}
        description={description || undefined}
        actions={
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
        }
      />
      {pick && (
        <PanelBody variant="form" className="grid grid-cols-2">
          <Stat size="sm" label="Distance" value={distance(pick.distance)} />
          <Stat size="sm" label="Area" value={pick.zone || "—"} />
        </PanelBody>
      )}
      <PanelFooter>
        {hasWaypoint && (
          <Button variant="ghost" size="sm" onClick={() => void fetchNui("pause:map:waypoint", { clear: true }).catch(() => {})}>
            Clear waypoint
          </Button>
        )}
        <Button
          size="sm"
          className="ml-auto"
          disabled={!target}
          onClick={() => {
            if (!target) return;
            setSet(true);
            void fetchNui("pause:map:waypoint", { x: target.x, y: target.y }).catch(() => {});
          }}
        >
          <FlagIcon />
          {set ? "Waypoint set" : "Set waypoint"}
        </Button>
      </PanelFooter>
    </Panel>
  );
}
