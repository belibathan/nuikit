import { SelectField, SliderField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { controlFor, sliderValue, type LeverRow } from "@/lib/levers";
import { FONT_CHOICES, fontChoice, toHex, withAlpha } from "@/lib/theme-studio";

/** One lever, edited by its spec type: slider (length, angle, time, number), picker (colour), select (keyword, ease, font), text. */
export function LeverControl({ row, value, tweaked, onChange }: { row: LeverRow; value: string | undefined; tweaked: boolean; onChange: (v: string) => void }) {
  const c = controlFor(row, value);
  const label = (
    <span className="flex items-center gap-2" title={row.description}>
      <span className="truncate font-mono text-xs">{row.name}</span>
      {tweaked && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Changed" />}
    </span>
  );
  switch (c.kind) {
    case "slider":
      return <SliderField label={label} description={row.description} min={c.min} max={c.max} step={c.step} value={Math.min(c.max, Math.max(c.min, c.value))} format={(n) => sliderValue(c, n)} onValueChange={(n) => onChange(sliderValue(c, n))} />;
    case "color":
      return (
        <label className="flex items-center gap-2 text-sm" title={row.description}>
          <input type="color" aria-label={row.name} value={toHex(value ?? undefined)} onChange={(e) => onChange(withAlpha(e.target.value, value))} className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
          {label}
        </label>
      );
    case "select":
      return <SelectField label={label} description={row.description} options={c.options.map((o) => ({ value: o, label: o }))} value={c.options.includes((value ?? row.default).trim()) ? (value ?? row.default).trim() : null} placeholder={value ?? row.default} onValueChange={(v) => v && onChange(v)} />;
    case "font": {
      const cur = fontChoice(value);
      return <SelectField label={label} description={row.description} options={FONT_CHOICES.map((f) => ({ value: f.value, label: f.label }))} value={cur} placeholder={value ? value.split(",")[0]!.replace(/"/g, "") : "Pick a font"} onValueChange={(v) => v && onChange(v)} />;
    }
    default:
      return (
        <label className="flex flex-col gap-1 text-sm" title={row.description}>
          {label}
          <Input aria-label={row.name} defaultValue={value ?? ""} placeholder={row.default} spellCheck={false} onChange={(e) => e.target.value && onChange(e.target.value)} className="h-8 font-mono text-xs" />
          <span className="text-xs text-muted-foreground">{row.description}</span>
        </label>
      );
  }
}
