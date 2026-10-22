import { onNui } from "nuikit-core";
import { motionLevel } from "nuikit-core/motion";
import { fetchNui, useNuiState } from "nuikit-core/react";
import {
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
import { TextRoll } from "@/components/ui/text-roll";
import { rise, SheetPage, SheetSection } from "./sheet";
import { Stat } from "@/components/ui/stat";
import { useFrameBatch } from "@/lib/batch";
import { distance, list } from "@/lib/format";
import { icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Selection = { kind: "place"; place: PausePlace } | { kind: "point"; pick: MapPick; waypoint?: boolean } | { kind: "blip"; choice: BlipChoice; waypoint: boolean };
const NO_BLIPS: MapBlip[] = [];

const DRAG_PX = 4; // less than this between down and up is a click
const NO_INFO: MapInfo = { zone: "", street: "", topdown: false, waypoint: false };
const HIDDEN_KEY = "nuikit_pause:map:hidden";

/** The legend categories this player turned off, kept between opens (and sessions, where CEF keeps storage). */
function loadHidden(): Set<BlipKind> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((k): k is BlipKind => KINDS.some((x) => x.kind === k)) : []);
  } catch {
    return new Set();
  }
}

/**
 * The 3D map (docs/pause-3d.md). The game camera hangs over the real world; the UI is the glass on
 * top (MapStage: drag / rotate / zoom / click, the pins and blips Lua projects, the camera buttons,
 * the picked spot) and a page of the pause sheet (MapSheetPage: where you're looking, search, places,
 * the blip legend). Both read one model, so the sheet and the glass always agree.
 * Pins move every frame, so they bypass React (see <Pins>, <Blips>).
 */
export function useMapModel(data: PauseData, open: boolean) {
  const info = useNuiState("pause:map:info", NO_INFO);
  const places = useMemo(() => list(data?.places), [data?.places]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const compass = useRef<SVGSVGElement>(null);
  const raw = useNuiState("pause:map:blips", NO_BLIPS);
  const blips = useMemo(() => (Array.isArray(raw) ? raw : []), [raw]);
  const [hidden, setHidden] = useState<ReadonlySet<BlipKind>>(loadHidden);
  // bumps each time the player sets a waypoint here: the pin drops in (<Pins>)
  const [waypointSet, setWaypointSet] = useState(0);
  const setWaypoint = (x: number, y: number) => {
    setWaypointSet((n) => n + 1);
    void fetchNui("pause:map:waypoint", { x, y }).catch(() => {});
  };
  // a fresh map each time it opens: nothing picked, no search
  useEffect(() => {
    if (!open) return;
    setSelection(null);
    setQuery("");
  }, [open]);
  const keep = (next: Set<BlipKind>) => {
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
    } catch {
      // no storage: the choice lasts until the page reloads
    }
    return next;
  };
  const toggle = (k: BlipKind) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return keep(next);
    });
  const showAll = () => setHidden(keep(new Set()));
  // a marker: one blip sets the waypoint there; a merged group flies in so it comes apart
  const chooseBlip = (c: BlipChoice) => {
    if (c.count > 1) {
      void fetchNui("pause:map:fly", { x: c.blip.x, y: c.blip.y }).catch(() => {});
      return;
    }
    setSelection({ kind: "blip", choice: c, waypoint: true });
    setWaypoint(c.blip.x, c.blip.y);
  };
  // a search result: fly there and show it; the waypoint is one press away
  const findBlip = (c: BlipChoice) => {
    setSelection({ kind: "blip", choice: c, waypoint: false });
    void fetchNui("pause:map:fly", { x: c.blip.x, y: c.blip.y }).catch(() => {});
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
  // a double-click on the ground: the waypoint goes straight there, like GTA's map
  const dropWaypoint = async (u: number, v: number) => {
    const hit = await fetchNui("pause:map:pick", { u, v }).catch(() => null);
    if (!hit?.ok || !hit.point) return;
    setSelection({ kind: "point", pick: hit, waypoint: true });
    setWaypoint(hit.point.x, hit.point.y);
  };
  // Find me recentres and keeps following; pressed again (or a drag) lets go
  const follow = (on: boolean) => void (on ? fetchNui("pause:map:recenter") : fetchNui("pause:map:follow", { on: false })).catch(() => {});
  const choose = (place: PausePlace) => {
    setSelection({ kind: "place", place });
    void fetchNui("pause:map:focus", { id: place.id }).catch(() => {});
  };

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
  return {
    takeP: data?.takeP === true,
    info,
    places,
    blips,
    hidden,
    toggle,
    showAll,
    legend,
    blipHits,
    shown,
    groups,
    query,
    setQuery,
    selection,
    setSelection,
    selectedId,
    selectedBlip,
    choose,
    chooseBlip,
    findBlip,
    pick,
    dropWaypoint,
    waypointSet,
    setWaypoint,
    follow,
    pan,
    rotate,
    zoom,
    compass,
  };
}
export type MapModel = ReturnType<typeof useMapModel>;

/** The glass over the world: input, blips, pins, the camera buttons and the picked spot. */
export function MapStage({ model: m, left }: { model: MapModel; left: string }) {
  const { pan, rotate, zoom } = m;
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
      else if (k === "f") m.follow(!m.info.follow);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div className="absolute inset-0 overflow-hidden select-none">
      <div className="pause-map-shade pointer-events-none absolute inset-0" aria-hidden />
      <InputLayer pan={pan} rotate={rotate} zoom={zoom} pick={m.pick} dropWaypoint={m.dropWaypoint} />
      <Blips blips={m.blips} hidden={m.hidden} selectedId={m.selectedBlip} onChoose={m.chooseBlip} />
      <Pins places={m.places} selectedId={m.selectedId} onChoose={m.choose} compass={m.compass} waypointSet={m.waypointSet} />
      {/* the open area, right of the sheet: the camera buttons on its edge */}
      <div className="pointer-events-none absolute inset-y-0 right-0 [--nk-edge:1.5rem] [&>*]:pointer-events-auto" style={{ left }}>
        <Controls topdown={m.info.topdown} following={m.info.follow === true} follow={m.follow} zoom={zoom} compass={m.compass} />
      </div>
    </div>
  );
}

/** The map's page in the pause sheet: where you're looking, search, places and the legend, as sections. */
export function MapSheetPage({ model: m, onBack }: { model: MapModel; onBack: () => void }) {
  const searching = m.query.trim() !== "";
  return (
    <SheetPage
      title={<TextRoll value={m.info.zone || "Map"} />}
      description={<TextRoll value={m.info.street || "Drag to move, right-drag to turn, double-click to set a waypoint"} direction="down" />}
      onBack={onBack}
      actions={
        <Button variant="outline" size="sm" onClick={() => void fetchNui("pause:gamemap").catch(() => {})}>
          <MapIcon />
          Game map
          {/* P is GTA's map key unless the server gave it to this map */}
          {!m.takeP && <Kbd className="ml-1">P</Kbd>}
        </Button>
      }
    >
      {m.selection && (
        <SelectionSection
          key={m.selection.kind === "place" ? m.selection.place.id : m.selection.kind === "blip" ? `blip-${m.selection.choice.blip.id}` : `${m.selection.pick.point?.x},${m.selection.pick.point?.y}`}
          selection={m.selection}
          hasWaypoint={m.info.waypoint}
          onWaypoint={m.setWaypoint}
          onClose={() => m.setSelection(null)}
        />
      )}

      {(m.places.length > 0 || m.blips.length > 0) && (
        <SheetSection>
          <label className="relative block">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <SmoothInput value={m.query} onChange={(e) => m.setQuery(e.target.value)} placeholder="Search places and blips" className="h-10 pl-9 text-base" />
          </label>
        </SheetSection>
      )}

      {searching && m.groups.length === 0 && m.blipHits.length === 0 && (
        <SheetSection>
          <p className="nk-row px-0 text-muted-foreground">Nothing matches. Try another name.</p>
        </SheetSection>
      )}

      {m.groups.map(([category, rows]) => (
        <SheetSection key={category} label={category} meta={rows.length}>
          <div className="flex flex-col divide-y divide-border">
            {rows.map((p) => {
              const Icon = icon(p.icon);
              return (
                <MenuRow key={p.id} icon={<Icon />} active={p.id === m.selectedId} onClick={() => m.choose(p)} className="min-h-11">
                  {p.label}
                </MenuRow>
              );
            })}
          </div>
        </SheetSection>
      ))}

      {m.blipHits.length > 0 && (
        <SheetSection label="On the map" meta={m.blipHits.length}>
          <div className="flex flex-col divide-y divide-border">
            {m.blipHits.map((c) => (
              <MenuRow key={c.blip.id} icon={<c.look.icon />} meta={c.look.kindLabel} active={c.blip.id === m.selectedBlip} onClick={() => m.findBlip(c)} className="min-h-11">
                {c.look.label}
              </MenuRow>
            ))}
          </div>
        </SheetSection>
      )}

      {!searching && m.legend.length > 0 && (
        <SheetSection
          label="Show on the map"
          meta={
            m.hidden.size > 0 ? (
              <Button variant="ghost" size="xs" className="-my-1 font-sans" onClick={m.showAll}>
                Show all
              </Button>
            ) : (
              m.blips.length
            )
          }
        >
          <div className="flex flex-col divide-y divide-border">
            {m.legend.map((k, i) => (
              <MenuRow key={k.kind} icon={<k.icon />} checked={!m.hidden.has(k.kind)} onCheckedChange={() => m.toggle(k.kind)} meta={String(k.count)} className={cn("min-h-11", rise(i).className)} style={rise(i).style}>
                {k.label}
              </MenuRow>
            ))}
          </div>
        </SheetSection>
      )}
    </SheetPage>
  );
}

/** Everything behind the panels: left-drag pans, right-drag turns, wheel zooms, a click picks. */
function InputLayer({
  pan,
  rotate,
  zoom,
  pick,
  dropWaypoint,
}: {
  pan: (dx: number, dy: number) => void;
  rotate: (dx: number, dy: number) => void;
  zoom: (delta: number) => void;
  pick: (u: number, v: number) => void;
  dropWaypoint: (u: number, v: number) => void;
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
      onDoubleClick={(e) => e.button === 0 && dropWaypoint(e.clientX / window.innerWidth, e.clientY / window.innerHeight)}
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
  waypointSet,
}: {
  places: PausePlace[];
  selectedId?: string;
  onChoose: (p: PausePlace) => void;
  compass: RefObject<SVGSVGElement | null>;
  /** bumps when the player sets a waypoint: the pin drops in */
  waypointSet: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const you = useRef<HTMLDivElement>(null);
  const arrow = useRef<SVGSVGElement>(null);
  const wp = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<string | null>(null);

  // a waypoint just set here: its pin drops onto the spot and settles (the chip, not the positioned anchor)
  useEffect(() => {
    // anchor > .pause-pin-above (its own transform places it) > the chip, which is free to move
    const chip = wp.current?.firstElementChild?.firstElementChild as HTMLElement | null;
    if (!waypointSet || !chip || motionLevel(chip) === "off") return;
    const reduced = motionLevel(chip) === "reduced";
    chip.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { transform: "translate3d(0, -1.5rem, 0) scale(0.9)", opacity: 0 },
            { transform: "translate3d(0, 0.15rem, 0) scale(1.04)", opacity: 1, offset: 0.7 },
            { transform: "none", opacity: 1 },
          ],
      { duration: reduced ? 160 : 360, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [waypointSet]);

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
    <div ref={root} className="pointer-events-none absolute inset-0 z-0">
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

function Controls({
  topdown,
  following,
  follow,
  zoom,
  compass,
}: {
  topdown: boolean;
  following: boolean;
  follow: (on: boolean) => void;
  zoom: (d: number) => void;
  compass: RefObject<SVGSVGElement | null>;
}) {
  const btn = (label: string, child: ReactNode, onClick: () => void, pressed?: boolean) => (
    <Button variant={pressed ? "secondary" : "ghost"} size="icon-sm" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {child}
    </Button>
  );
  return (
    <div className="nk-anchor-r">
      {/* a slim strip of the game's chip surface, not a card */}
      <div className="pause-controls flex flex-col items-center gap-0.5 p-1">
        <span className="flex size-8 items-center justify-center opacity-70" aria-label="North">
          <NavigationIcon ref={compass} className="size-4" />
        </span>
        {btn("Zoom in", <PlusIcon />, () => zoom(-0.3))}
        {btn("Zoom out", <MinusIcon />, () => zoom(0.4))}
        {btn("Top-down", <LayersIcon />, () => void fetchNui("pause:map:topdown", { on: !topdown }).catch(() => {}), topdown)}
        {btn(following ? "Following you" : "Find me", <LocateFixedIcon />, () => follow(!following), following)}
      </div>
    </div>
  );
}

/** The picked spot, as the first section of the map page: what it is, how far, and the waypoint. */
function SelectionSection({
  selection,
  hasWaypoint,
  onWaypoint,
  onClose,
}: {
  selection: Selection;
  hasWaypoint: boolean;
  onWaypoint: (x: number, y: number) => void;
  onClose: () => void;
}) {
  const blip = selection.kind === "blip" ? selection.choice : undefined;
  // a blip sets the waypoint when it's clicked
  const [set, setSet] = useState(selection.kind !== "place" && selection.waypoint === true);
  const place = selection.kind === "place" ? selection.place : undefined;
  const pick = selection.kind === "point" ? selection.pick : undefined;
  const Icon = place ? icon(place.icon) : blip ? blip.look.icon : MapPinIcon;
  const target = place ? { x: place.x, y: place.y } : blip ? { x: blip.blip.x, y: blip.blip.y } : pick?.point;
  const title = place?.label ?? blip?.look.label ?? pick?.street ?? "Unknown road";
  const description = place ? place.category : blip ? blip.look.kindLabel : [pick?.crossing && `Near ${pick.crossing}`, pick?.zone].filter(Boolean).join(", ");

  // a new pick scrolls the sheet back up to it
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <SheetSection label="Selected" className="nk-enter scroll-mt-6">
      <div ref={ref} data-slot="map-selection" className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-(--nk-chip-radius) bg-muted text-foreground [&_svg]:size-4">
            <Icon />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="nk-title truncate">{title}</p>
            {description ? <p className="nk-label truncate text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Clear selection">
            <XIcon />
          </Button>
        </div>
        {pick && (
          <div className="grid grid-cols-2 gap-4">
            <Stat size="sm" label="Distance" value={distance(pick.distance)} />
            <Stat size="sm" label="Area" value={pick.zone || "—"} />
          </div>
        )}
        {/* wraps rather than squeezing a button (a skewed or wide identity), and leaves the skewed slab room */}
        <div className="flex flex-wrap items-center justify-end gap-2 pr-1">
          {hasWaypoint && (
            <Button variant="ghost" size="sm" className="mr-auto shrink-0" onClick={() => void fetchNui("pause:map:waypoint", { clear: true }).catch(() => {})}>
              Clear waypoint
            </Button>
          )}
          <Button
            size="sm"
            className="shrink-0"
            disabled={!target}
            onClick={() => {
              if (!target) return;
              setSet(true);
              onWaypoint(target.x, target.y);
            }}
          >
            <FlagIcon />
            {set ? "Waypoint set" : "Set waypoint"}
          </Button>
        </div>
      </div>
    </SheetSection>
  );
}
