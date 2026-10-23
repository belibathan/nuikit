// /hud edit, Style: how each part draws, picked by the player within what the server allows
// (Config.styles; client/layout.lua resolves them). One row per style, its options as a segmented
// choice; a style with nothing to pick is left out.
import type { HudStyles, StyleChoice, StyleKey, StyleValue } from "../nui";

const GROUPS: { title: string; keys: StyleKey[] }[] = [
  { title: "Vitals", keys: ["vitals.visibility"] },
  { title: "Speedometer", keys: ["vehicle.gauge"] },
  { title: "Map", keys: ["map.radar", "map.shape", "map.size", "map.halo", "map.compass", "map.column"] },
  { title: "Location and money", keys: ["column.street", "column.area", "column.money", "column.job", "column.align"] },
  { title: "Size", keys: ["scale.top-left", "scale.top-right", "scale.bottom-left", "scale.bottom-right", "scale.map"] },
];

const ROW: Record<StyleKey, string> = {
  "vitals.visibility": "Vitals",
  "vitals.display": "Vitals style",
  "vehicle.gauge": "Gauge",
  "map.radar": "Radar",
  "map.shape": "Shape",
  "map.size": "Size",
  "map.halo": "Halo",
  "map.compass": "Compass ring",
  "map.column": "Info",
  "column.street": "Street",
  "column.area": "Area",
  "column.money": "Money",
  "column.job": "Job",
  "column.align": "Alignment",
  "scale.top-left": "Top left",
  "scale.top-right": "Top right",
  "scale.bottom-left": "Bottom left",
  "scale.bottom-right": "Bottom right",
  "scale.map": "By the map",
};

const OPTION: Record<string, string> = {
  icons: "Icons",
  value: "Icon and value",
  pill: "Label and value",
  expand: "Expand on change",
  theme: "Theme",
  arc: "Arc",
  bar: "Bar",
  digital: "Digital",
  always: "Always",
  vehicle: "In a vehicle",
  never: "Never",
  circle: "Circle",
  square: "Square",
  "12": "Small",
  "15": "Medium",
  "18": "Large",
  true: "On",
  false: "Off",
  auto: "Auto",
  below: "Below",
  above: "Above",
  center: "Center",
  start: "Left",
  end: "Right",
};

export function StyleTab({ choices, styles, onChange }: { choices: StyleChoice[]; styles: HudStyles; onChange: (next: HudStyles) => void }) {
  const byKey = new Map(choices.map((c) => [c.key, c]));
  const rows = (keys: StyleKey[]) => keys.map((k) => byKey.get(k)).filter((c): c is StyleChoice => !!c && c.options.length > 1);
  const groups = GROUPS.map((g) => ({ ...g, rows: rows(g.keys) })).filter((g) => g.rows.length > 0);
  if (!groups.length) {
    return (
      <div className="nk-panel-body">
        <span className="nk-label">Your server sets how the HUD draws.</span>
      </div>
    );
  }
  return (
    <div className="nk-panel-body hud-styles">
      {groups.map((g) => (
        <section key={g.title} className="hud-styles-group">
          <span className="nk-label">{g.title}</span>
          {g.rows.map((c) => {
            const now: StyleValue | undefined = styles[c.key] ?? c.default;
            return (
              <div key={c.key} data-slot="hud-style" data-key={c.key} className="hud-styles-row">
                <span className="hud-styles-name">{ROW[c.key]}</span>
                <span className="hud-styles-options" role="radiogroup" aria-label={ROW[c.key]}>
                  {c.options.map((o) => (
                    <button
                      key={String(o)}
                      type="button"
                      role="radio"
                      aria-checked={now === o}
                      data-active={now === o || undefined}
                      onClick={() => onChange({ ...styles, [c.key]: o })}
                    >
                      {optionLabel(o, c.key)}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** An option's label: named ones from OPTION, a scale (under 2) as a percentage. */
/** Options whose plain words depend on the row. */
const KEY_OPTION: Partial<Record<StyleKey, Record<string, string>>> = {
  "vitals.visibility": { always: "Always visible", rest: "Hide at rest (show on change)", voice: "Tuck behind voice while talking" },
};

function optionLabel(o: StyleValue, key: StyleKey) {
  const own = KEY_OPTION[key]?.[String(o)];
  if (own) return own;
  if (typeof o === "number" && o < 2) return `${Math.round(o * 100)}%`;
  return OPTION[String(o)] ?? String(o);
}
