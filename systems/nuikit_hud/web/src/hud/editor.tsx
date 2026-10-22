// /hud edit: each part of the HUD (Config.parts) dragged to a corner, onto the map or off, and
// reordered. The panel is a small model of the screen; the HUD behind it follows the draft live (the
// map moves on save: it is GTA's radar). Click a part, then a place, does the same without a mouse drag.
// Save keeps it for this player (client/main.lua, KVP); Escape or Cancel drops it.
import { fetchNui, useSurface } from "nuikit-core/react";
import { useEffect, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import type { HudCorner, HudEditData, HudParts } from "../nui";
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
  { place: "map", label: "With the map" },
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

export function LayoutEditor({ data, onDraft }: { data: HudEditData; onDraft: (parts: HudParts | null) => void }) {
  const { close } = useSurface("hud-edit");
  const [parts, setParts] = useState<HudParts>(data.parts);
  const [held, setHeld] = useState<Name | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => onDraft(parts), [parts, onDraft]);
  useEffect(() => () => onDraft(null), [onDraft]);

  const move = (place: Place, before?: Name) => {
    if (!held) return;
    setParts((p) => movePart(p, held, place, before));
    setHeld(null);
  };
  const drop = (place: Place, before?: Name) => (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    move(place, before);
  };
  const save = async () => {
    setBusy(true);
    // Lua closes the panel once it is kept; a refused layout leaves it open
    await fetchNui("hud:parts:save", { parts }).catch(() => {});
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true);
    await fetchNui("hud:parts:reset", {}).catch(() => {});
    setBusy(false);
  };

  return (
    <div className="hud-editor-wrap">
    <div data-slot="hud-editor" className="hud-editor nk-panel">
      <div className="nk-panel-header">
        <span className="nk-title">HUD layout</span>
        <span className="nk-label">Drag a part, or click it and then a place</span>
      </div>
      <div className="nk-panel-body hud-editor-grid">
        {PLACES.map(({ place, label }) => {
          const ok = held !== "map" || (place !== "map" && place !== "hidden");
          return (
            <div
              key={place}
              data-slot="hud-editor-place"
              data-place={place}
              data-target={(held && ok) || undefined}
              className="hud-editor-place"
              onDragOver={(e) => ok && e.preventDefault()}
              onDrop={drop(place)}
              onClick={() => ok && move(place)}
            >
              <span className="nk-label">{label}</span>
              {at(parts, place).map((name) => (
                <button
                  key={name}
                  type="button"
                  draggable
                  data-held={held === name || undefined}
                  className="hud-editor-part"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setHeld(name);
                  }}
                  onDragEnd={() => setHeld(null)}
                  onDragOver={(e) => ok && e.preventDefault()}
                  onDrop={drop(place, name)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (held && held !== name) move(place, name);
                    else setHeld(held === name ? null : name);
                  }}
                >
                  {LABEL[name]}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="hud-editor-actions">
        <Button variant="ghost" disabled={busy} onClick={() => setParts(data.base)}>
          Preset
        </Button>
        <Button variant="ghost" disabled={busy} onClick={reset}>
          Reset saved
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
    </div>
  );
}
