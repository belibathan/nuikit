// /hud edit: each part of the HUD (Config.parts) dragged to a corner, onto the map or off, and
// reordered. The panel is a small model of the screen; the HUD behind it follows the draft live (the
// map too: Lua re-places GTA's radar). Clicking a part, then a place, does the same without a drag; the
// arrows reorder within a place (the keyboard and controller path). Save keeps it for this player
// (client/main.lua, KVP); Escape or Cancel drops it.
import { fetchNui, useSurface } from "nuikit-core/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Button } from "@/components/ui/button";
import type { HudCorner, HudEditData, HudParts, HudStyles } from "../nui";
import { StyleTab } from "./styles";
import type { PartName } from "./parts";

type Place = HudCorner | "map" | "hidden";
type Name = PartName | "map";

const LABEL: Record<Name, string> = {
  map: "Map",
  location: "Location",
  wallet: "Money",
  vitals: "Vitals",
  ammo: "Ammo",
  vehicle: "Vehicle",
};
const PARTS: PartName[] = ["location", "wallet", "vitals", "ammo", "vehicle"];
const PLACES: { place: Place; label: string }[] = [
  { place: "top-left", label: "Top left" },
  { place: "top-right", label: "Top right" },
  { place: "bottom-left", label: "Bottom left" },
  { place: "bottom-right", label: "Bottom right" },
  { place: "map", label: "Next to the map" },
  { place: "hidden", label: "Hidden" },
];

const placeOf = (parts: HudParts, name: PartName): Place => (parts[name].at === false ? "hidden" : parts[name].at) as Place;

/** The parts at a place, top to bottom (the map first in its corner). */
function at(parts: HudParts, place: Place): Name[] {
  const list: Name[] = PARTS.filter((n) => placeOf(parts, n) === place).sort((a, b) => parts[a].order - parts[b].order);
  return parts.map === place ? ["map", ...list] : list;
}

/** Move a part to a place, before `before` (or last), and number every place's parts 1, 2, 3… */
export function movePart(parts: HudParts, name: Name, place: Place, before?: Name): HudParts {
  if (name === "map") return place === "map" || place === "hidden" ? parts : { ...parts, map: place };
  const next: HudParts = { ...parts };
  const list = at(parts, place).filter((n) => n !== "map" && n !== name) as PartName[];
  const i = before && before !== "map" ? list.indexOf(before as PartName) : -1;
  list.splice(i < 0 ? list.length : i, 0, name);
  list.forEach((n, k) => (next[n] = { at: place === "hidden" ? false : place, order: k + 1 }));
  // the place it left closes up
  const from = placeOf(parts, name);
  if (from !== place) (at(next, from).filter((n) => n !== "map") as PartName[]).forEach((n, k) => (next[n] = { ...next[n], order: k + 1 }));
  return next;
}


/** One step up (-1) or down (+1) within the part's own place. */
export function stepPart(parts: HudParts, name: PartName, dir: -1 | 1): HudParts {
  const place = placeOf(parts, name);
  const list = at(parts, place).filter((n) => n !== "map") as PartName[];
  const i = list.indexOf(name);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return parts;
  // up: before the one above; down: before the one after the next (or last)
  return movePart(parts, name, place, dir < 0 ? list[j] : list[j + 1]);
}

/** Where the pointer would drop: a place, and the part it goes before (none: last). */
interface Target {
  place: Place;
  before?: Name;
}

/** The drop target under a point: a part's upper half drops before it, its lower half after it. */
function targetAt(x: number, y: number, parts: HudParts): Target | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const placeEl = el?.closest<HTMLElement>("[data-place]");
  if (!placeEl) return null;
  const place = placeEl.dataset.place as Place;
  const partEl = el?.closest<HTMLElement>("[data-part-name]");
  if (!partEl) return { place };
  const name = partEl.dataset.partName as Name;
  const r = partEl.getBoundingClientRect();
  if (y < r.top + r.height / 2) return { place, before: name };
  const list = at(parts, place);
  return { place, before: list[list.indexOf(name) + 1] };
}

const canGo = (name: Name | null, place: Place) => name !== "map" || (place !== "map" && place !== "hidden");

export function LayoutEditor({ data, onDraft }: { data: HudEditData; onDraft: (parts: HudParts | null) => void }) {
  const { close } = useSurface("hud-edit");
  const [parts, setParts] = useState<HudParts>(data.parts);
  const [held, setHeld] = useState<Name | null>(null);
  const [drag, setDrag] = useState<{ name: Name; x: number; y: number; target: Target | null } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => onDraft(parts), [parts, onDraft]);
  // the placement previews on the real HUD too (Lua moves GTA's radar when the map changes corner)
  const firstParts = useRef(true);
  useEffect(() => {
    if (firstParts.current) {
      firstParts.current = false;
      return;
    }
    void fetchNui("hud:parts:preview", { parts }).catch(() => {});
  }, [parts]);
  useEffect(() => () => onDraft(null), [onDraft]);
  const latest = useRef(parts);
  latest.current = parts;

  const move = (name: Name, t: Target) => {
    if (!canGo(name, t.place)) return;
    setParts((p) => movePart(p, name, t.place, t.before));
    setHeld(null);
  };

  // Drag with mouse events on the window: in FiveM's CEF the HTML5 drag events don't fire under NUI
  // focus, and mouse events do. Under 4px of travel it is a click (pick up, or drop the held part).
  const grab = (name: Name) => (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const x0 = e.clientX;
    const y0 = e.clientY;
    let dragging = false;
    const onMove = (ev: MouseEvent) => {
      if (!dragging && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return;
      dragging = true;
      setDrag({ name, x: ev.clientX, y: ev.clientY, target: targetAt(ev.clientX, ev.clientY, latest.current) });
    };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDrag(null);
      const t = targetAt(ev.clientX, ev.clientY, latest.current);
      if (dragging) {
        if (t) move(name, t);
      } else if (held && held !== name) {
        // a click on another part while one is held: the held part goes there
        if (t) move(held, t);
      } else setHeld(held === name ? null : name);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // the Style tab's draft: Lua previews it live (it re-places the map when that changed) and drops it
  // when the editor goes without a save
  const layoutOn = data.layout !== false;
  const [tab, setTab] = useState<"layout" | "style">(layoutOn ? "layout" : "style");
  const [styles, setStyles] = useState<HudStyles>(() => Object.fromEntries((data.styles ?? []).map((c) => [c.key, c.value])));
  const kept = useRef(false);
  useEffect(
    () => () => {
      if (!kept.current) void fetchNui("hud:styles:preview", {}).catch(() => {});
    },
    [],
  );
  const setStyle = (next: HudStyles) => {
    setStyles(next);
    void fetchNui("hud:styles:preview", { styles: next }).catch(() => {});
  };

  const save = async () => {
    setBusy(true);
    kept.current = true;
    // Lua closes the panel once the layout is kept; a refused one leaves it open
    await fetchNui("hud:styles:save", { styles }).catch(() => {});
    await fetchNui("hud:parts:save", { parts }).catch(() => {});
    setBusy(false);
  };
  // Reset: the server's placement and styles, previewed like any change; Save keeps them, Cancel doesn't
  const reset = () => {
    setParts(data.base);
    setStyle(Object.fromEntries((data.styles ?? []).map((c) => [c.key, c.default])));
  };

  const moving = drag?.name ?? held;
  return (
    <div className="hud-editor-wrap">
      <div data-slot="hud-editor" data-dragging={drag ? true : undefined} className="hud-editor nk-panel">
        <div className="nk-panel-header">
          <span className="nk-title">Edit HUD</span>
          <span className="hud-editor-tabs" role="tablist">
            {layoutOn && (
              <button type="button" role="tab" aria-selected={tab === "layout"} data-active={tab === "layout" || undefined} onClick={() => setTab("layout")}>
                Layout
              </button>
            )}
            <button type="button" role="tab" aria-selected={tab === "style"} data-active={tab === "style" || undefined} onClick={() => setTab("style")}>
              Style
            </button>
          </span>
        </div>
        {tab === "style" ? (
          <StyleTab choices={data.styles ?? []} styles={styles} onChange={setStyle} />
        ) : (
        <div className="nk-panel-body hud-editor-grid">
          <span className="nk-label hud-editor-hint">Drag a part to a place, or click it and then click the place.</span>
          {PLACES.map(({ place, label }) => {
            const ok = canGo(moving, place);
            const over = drag?.target?.place === place && ok;
            const list = at(parts, place);
            return (
              <div
                key={place}
                data-slot="hud-editor-place"
                data-place={place}
                data-target={(moving && ok) || undefined}
                data-over={over || undefined}
                data-drop-end={(over && drag?.target?.before === undefined) || undefined}
                className="hud-editor-place"
                onClick={() => held && ok && move(held, { place })}
              >
                <span className="nk-label">{label}</span>
                {list.map((name, i) => (
                  <div
                    key={name}
                    data-part-name={name}
                    data-held={held === name || drag?.name === name || undefined}
                    data-drop-before={(over && drag?.target?.before === name) || undefined}
                    className="hud-editor-row"
                  >
                    <button type="button" className="hud-editor-part" onMouseDown={grab(name)} onClick={(e) => e.stopPropagation()}>
                      {LABEL[name]}
                    </button>
                    {name !== "map" && (
                      <span className="hud-editor-steps">
                        <button
                          type="button"
                          aria-label={`Move ${LABEL[name]} up`}
                          disabled={i === 0 || list[i - 1] === "map"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setParts((p) => stepPart(p, name, -1));
                          }}
                        >
                          <ChevronUpIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${LABEL[name]} down`}
                          disabled={i === list.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setParts((p) => stepPart(p, name, 1));
                          }}
                        >
                          <ChevronDownIcon />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        )}
        <div className="hud-editor-actions">
          <Button variant="ghost" disabled={busy} onClick={reset}>
            Reset to default
          </Button>
          <span className="flex-1" />
          <Button variant="outline" disabled={busy} onClick={() => close()}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={save}>
            Save
          </Button>
        </div>
      </div>
      {drag && (
        <span className="hud-editor-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {LABEL[drag.name]}
        </span>
      )}
    </div>
  );
}
