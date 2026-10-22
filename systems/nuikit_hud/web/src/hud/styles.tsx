// /hud edit, Style: how each part draws, picked by the player within what the server allows
// (Config.styles; client/layout.lua resolves them). One row per style, its options as a segmented
// choice; a style with nothing to pick is left out.
import type { HudStyles, StyleChoice, StyleKey, StyleValue } from "../nui";

const GROUPS: { title: string; keys: StyleKey[] }[] = [
  { title: "Vitals", keys: ["vitals.display", "vitals.voice"] },
  { title: "Speedometer", keys: ["vehicle.gauge"] },
  { title: "Map", keys: ["map.shape", "map.size", "map.halo", "map.compass", "map.column"] },
  { title: "Location and money", keys: ["column.street", "column.area", "column.money", "column.job", "column.align"] },
];

const ROW: Record<StyleKey, string> = {
  "vitals.display": "Display",
  "vitals.voice": "While talking",
  "vehicle.gauge": "Gauge",
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
};

const OPTION: Record<string, string> = {
  icons: "Icons",
  value: "Icon and value",
  pill: "Label and value",
  expand: "Expand on change",
  beside: "Keep vitals",
  collapse: "Tuck behind voice",
  theme: "Theme",
  arc: "Arc",
  bar: "Bar",
  digital: "Digital",
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
                      {OPTION[String(o)] ?? String(o)}
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
