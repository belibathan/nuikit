import { fetchNui, useNuiState } from "nuikit-core/react";
import { useEffect, useState } from "react";
import type { SettingRow, SettingValues, SettingsSnapshot } from "../nui";
import { Button } from "@/components/ui/button";
import { MenuRow } from "@/components/ui/menu-row";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetPage, SheetSection } from "./sheet";

const EMPTY: SettingsSnapshot = { rows: [], presets: [], values: {} };

/**
 * The player's settings as rows (client/settings.lua describes them; this page only draws a row by
 * its kind: toggle, choice or range), presets as one-press patches, and a reset. A change applies at
 * once, so the screen behind is the preview, and is saved per player.
 */
export function SettingsPage({ onBack, onValues, onGame }: { onBack: () => void; onValues: (v: SettingValues) => void; onGame: () => void }) {
  const snap = useNuiState("pause:settings", EMPTY);
  const [values, setValues] = useState<SettingValues>(snap.values ?? {});
  useEffect(() => setValues(snap.values ?? {}), [snap]);

  const take = (r: { ok: boolean; values?: SettingValues } | null) => {
    if (!r?.values) return;
    setValues(r.values);
    onValues(r.values);
  };
  const set = (key: string, value: SettingValues[string]) => {
    setValues((v) => ({ ...v, [key]: value }));
    void fetchNui("pause:settings:set", { patch: { [key]: value } }).then(take).catch(() => {});
  };

  const rows = Array.isArray(snap.rows) ? snap.rows : [];
  const groups = new Map<string, SettingRow[]>();
  for (const r of rows) groups.set(r.group ?? "", [...(groups.get(r.group ?? "") ?? []), r]);

  return (
    <SheetPage
      title="Settings"
      description="Saved for you on this server"
      onBack={onBack}
      actions={
        <Button variant="outline" size="sm" onClick={onGame}>
          Game settings
        </Button>
      }
      footer={
        <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => void fetchNui("pause:settings:reset", {}).then(take).catch(() => {})}>
          Reset to defaults
        </Button>
      }
    >
      {snap.presets?.length > 0 && (
        <SheetSection label="Presets">
          <div className="flex flex-wrap gap-2">
            {snap.presets.map((p) => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => void fetchNui("pause:settings:preset", { id: p.id }).then(take).catch(() => {})}>
                {p.label}
              </Button>
            ))}
          </div>
        </SheetSection>
      )}
      {[...groups].map(([group, list]) => (
        <SheetSection key={group} label={group || undefined}>
          <div className="flex flex-col divide-y divide-border">
            {list.map((r) => (
              <Row key={r.key} row={r} value={values[r.key]} onChange={(v) => set(r.key, v)} />
            ))}
          </div>
        </SheetSection>
      ))}
    </SheetPage>
  );
}

function Row({ row, value, onChange }: { row: SettingRow; value: SettingValues[string]; onChange: (v: SettingValues[string]) => void }) {
  if (row.kind === "toggle")
    return (
      <MenuRow checked={value === true} onCheckedChange={onChange} description={row.description} className="min-h-11">
        {row.label}
      </MenuRow>
    );
  if (row.kind === "choice") {
    const options = row.options ?? [];
    const at = options.findIndex((o) => o.value === value);
    return (
      <div className="flex flex-col gap-2 py-3">
        <span className="truncate">{row.label}</span>
        <Tabs value={String(Math.max(0, at))} onValueChange={(i) => onChange(options[Number(i)]?.value)}>
          <TabsList className="w-full">
            {options.map((o, i) => (
              <TabsTrigger key={String(o.value)} value={String(i)} className="flex-1">
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
  }
  const n = typeof value === "number" ? value : (row.min ?? 0);
  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate">{row.label}</span>
        <span className="nk-num nk-label text-muted-foreground">{n}</span>
      </div>
      <Slider value={[n]} min={row.min ?? 0} max={row.max ?? 1} step={row.step ?? 0.1} onValueCommit={(v) => onChange(v[0])} />
    </div>
  );
}
