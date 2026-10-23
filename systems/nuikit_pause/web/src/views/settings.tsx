import { EmptyState } from "@/components/ui/empty-state";
import {
  applySettingsPreset,
  cancelSettings,
  draftSettings,
  loadSettings,
  resetSettings,
  saveSettings,
  type SettingRow,
  type SettingValue,
  type SettingsSection,
} from "nuikit-core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { SegmentedControl } from "@/components/ui/selection-tabs";
import { SheetPage, SheetSection } from "./sheet";

type Values = Record<string, SettingValue>;
const parent = (globalThis as { GetParentResourceName?: () => string }).GetParentResourceName;
export const SELF = typeof parent === "function" ? parent() : "nuikit_pause";

/**
 * Every resource's settings (nuikit's settings service, docs/settings.md): this menu's display
 * settings first, then the HUD's and any other resource's, each a section drawn from its rows (a
 * toggle, a choice or a range) with its presets. A change is a draft its owner previews live; Save
 * keeps every draft, Cancel (or leaving) drops them.
 */
export function SettingsPage({ onBack, onValues, onGame }: { onBack: () => void; onValues: (resource: string, v: Values) => void; onGame: () => void }) {
  const [sections, setSections] = useState<SettingsSection[] | null>(null);
  useEffect(() => {
    void loadSettings().then((all) => {
      // this menu's own (Display) section first, the rest by label
      const rest = all.filter((s) => s.resource !== SELF).sort((a, b) => (a.label || a.resource).localeCompare(b.label || b.resource));
      setSections([...all.filter((s) => s.resource === SELF), ...rest]);
    });
  }, []);

  const take = useCallback(
    (resource: string, draft: boolean) => (values: Values | null) => {
      if (!values) return;
      setSections((all) => all?.map((s) => (s.resource === resource ? { ...s, values, draft } : s)) ?? all);
      onValues(resource, values);
    },
    [onValues],
  );
  const dirty = sections?.filter((s) => s.draft) ?? [];
  const saveAll = () => dirty.forEach((s) => void saveSettings(s.resource).then(take(s.resource, false)));
  const cancelAll = () => dirty.forEach((s) => void cancelSettings(s.resource).then(take(s.resource, false)));

  // leaving with unsaved changes drops them (the owners put back what they previewed)
  const latest = useRef(sections);
  latest.current = sections;
  useEffect(() => () => latest.current?.filter((s) => s.draft).forEach((s) => void cancelSettings(s.resource)), []);

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
        dirty.length > 0 ? (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={cancelAll}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveAll}>
              Save
            </Button>
          </div>
        ) : null
      }
    >
      {sections === null ? null : sections.length === 0 ? (
        <EmptyState title="Nothing to set" description="This server has no settings here yet." />
      ) : (
        sections.map((s) => (
          <Section
            key={s.resource}
            section={s}
            onDraft={(patch) => void draftSettings(s.resource, patch).then(take(s.resource, true))}
            onPreset={(id) => void applySettingsPreset(s.resource, id).then(take(s.resource, true))}
            onReset={() => void resetSettings(s.resource).then(take(s.resource, false))}
          />
        ))
      )}
    </SheetPage>
  );
}

function Section({ section: s, onDraft, onPreset, onReset }: { section: SettingsSection; onDraft: (patch: Values) => void; onPreset: (id: string) => void; onReset: () => void }) {
  const groups = new Map<string, SettingRow[]>();
  for (const r of s.rows) groups.set(r.group ?? "", [...(groups.get(r.group ?? "") ?? []), r]);
  return (
    <>
      <SheetSection
        label={s.label || s.resource}
        meta={
          <Button variant="ghost" size="xs" className="-my-1 font-sans" onClick={onReset}>
            Reset
          </Button>
        }
      >
        {s.presets.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2">
            {s.presets.map((p) => (
              <Button key={p.id} variant="outline" size="sm" onClick={() => onPreset(p.id)}>
                {p.label}
              </Button>
            ))}
          </div>
        )}
        {[...groups].map(([group, rows]) => (
          <div key={group} className="flex flex-col">
            {group && group !== s.label ? <p className="nk-caption pt-3 text-muted-foreground">{group}</p> : null}
            <MenuRowList>
              {rows.map((r) => (
                <Row key={r.key} row={r} value={s.values[r.key]} onChange={(v) => onDraft({ [r.key]: v })} />
              ))}
            </MenuRowList>
          </div>
        ))}
      </SheetSection>
    </>
  );
}

const option = (o: NonNullable<SettingRow["options"]>[number]) => (typeof o === "object" ? o : { value: o, label: String(o) });

function Row({ row, value, onChange }: { row: SettingRow; value: SettingValue | undefined; onChange: (v: SettingValue) => void }) {
  if (row.toggle)
    return (
      <MenuRow checked={value === true} onCheckedChange={onChange} description={row.description} className="min-h-11">
        {row.label}
      </MenuRow>
    );
  if (row.text)
    return (
      <div className="flex flex-col gap-2 py-3">
        <span className="truncate">{row.label}</span>
        {row.description ? <span className="nk-label -mt-1.5 text-muted-foreground">{row.description}</span> : null}
        <Input key={String(value)} defaultValue={typeof value === "string" ? value : ""} maxLength={row.maxLength ?? 64} onBlur={(e) => e.target.value !== value && onChange(e.target.value)} />
      </div>
    );
  if (row.options) {
    const options = row.options.map(option);
    const at = options.findIndex((o) => o.value === value);
    return (
      <div className="flex flex-col gap-2 py-3">
        <span className="truncate">{row.label}</span>
        {row.description ? <span className="nk-label -mt-1.5 text-muted-foreground">{row.description}</span> : null}
        <SegmentedControl
          value={String(Math.max(0, at))}
          onValueChange={(i) => onChange(options[Number(i)]!.value)}
          options={options.map((o, i) => ({ value: String(i), label: o.label ?? String(o.value) }))}
        />
      </div>
    );
  }
  const [min, max, step] = row.range ?? [0, 1, 0.1];
  const n = typeof value === "number" ? value : min;
  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate">{row.label}</span>
        <span className="nk-num nk-label text-muted-foreground">{Math.round(n * 100) / 100}</span>
      </div>
      <Slider value={[n]} min={min} max={max} step={step ?? (max - min) / 20} onValueCommit={(v) => onChange(v[0]!)} />
    </div>
  );
}
