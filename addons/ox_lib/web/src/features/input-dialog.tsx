import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CalendarIcon, XIcon } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DatePicker } from "@/features/date-picker";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CheckboxField,
  ColorField,
  FormField,
  NumberField,
  SelectField,
  SliderField,
  TextField,
} from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Icon } from "@/lib/icon";
import { useLocale } from "@/lib/locale";
import { post, useOx } from "@/lib/nui";
import { cn } from "@/lib/utils";

dayjs.extend(customParseFormat);

type Opt = { value: string; label?: string };

interface Row {
  type: "input" | "textarea" | "number" | "checkbox" | "select" | "multi-select" | "slider" | "color" | "date" | "date-range" | "time";
  label?: string;
  description?: string;
  placeholder?: string;
  icon?: string | [string, string];
  disabled?: boolean;
  required?: boolean;
  default?: any;
  // type-specific
  password?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number;
  precision?: number;
  checked?: boolean;
  options?: Opt[];
  clearable?: boolean;
  searchable?: boolean;
  maxSelectedValues?: number;
  format?: string;
  returnString?: boolean;
  autosize?: boolean;
  minLength?: number;
  maxLength?: number;
}

interface DialogData {
  heading: string;
  rows: Array<Row | string>;
  options?: { allowCancel?: boolean; size?: "xs" | "sm" | "md" | "lg" | "xl" };
}

export const WIDTH = { xs: "sm:max-w-80", sm: "sm:max-w-96", md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-3xl" };

/**
 * The kit panel on shadcn's DialogContent: header / body / footer, no padding of its own.
 * DialogContent's own bg-background / rounded-lg out-rank nk-panel in the cascade, so they're
 * restated here with the panel's tokens (bg-popover, rounded-xl = radius + 4px).
 */
export const DIALOG_PANEL = "nk-panel nk-enter gap-0 overflow-hidden rounded-xl bg-popover p-0 text-popover-foreground";
export const DIALOG_HEADER = "nk-panel-header flex-row text-left";

const toDate = (v: unknown): Date | undefined => {
  if (v === true) return new Date();
  if (v === undefined || v === null || v === "") return undefined;
  // dayjs reads "1990-01-01" as local midnight; new Date() would read it as UTC and shift a day.
  const d = typeof v === "string" ? dayjs(v).toDate() : new Date(v as number);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

function initial(row: Row): any {
  switch (row.type) {
    case "checkbox":
      return row.checked ?? false;
    case "slider":
      return row.default ?? row.min ?? 0;
    case "number":
      return row.default ?? null;
    case "multi-select":
      return row.default ?? null;
    case "select":
    case "color":
      return row.default ?? null;
    case "date":
      return toDate(row.default) ?? null;
    case "date-range":
      return row.default === true ? [new Date(), new Date()] : Array.isArray(row.default) ? [toDate(row.default[0]) ?? null, toDate(row.default[1]) ?? null] : [null, null];
    case "time":
      return toDate(row.default) ?? null;
    default:
      return row.default ?? "";
  }
}

/** What Lua receives for each row (docs/ox-lib-protocol.md §7.2). */
function output(row: Row, v: any): unknown {
  switch (row.type) {
    case "number": {
      if (v === null || v === "" || Number.isNaN(Number(v))) return null;
      const p = row.precision ?? 0;
      return Number(Number(v).toFixed(p));
    }
    case "slider":
      return Number(v);
    case "checkbox":
      return Boolean(v);
    case "select":
      return v ?? null; // §7.2: the selected value, or null (was "" when nothing was picked)
    case "multi-select":
      return v && v.length ? v : null;
    case "color":
      return v ? formatColor(v, row.format) : null;
    case "date": {
      if (!v) return null;
      const d = dayjs(v).startOf("day");
      return row.returnString ? d.format(row.format ?? "DD/MM/YYYY") : d.valueOf();
    }
    case "date-range": {
      const [a, b] = (v ?? [null, null]) as [Date | null, Date | null];
      const one = (d: Date | null) => (d ? (row.returnString ? dayjs(d).format(row.format ?? "DD/MM/YYYY") : dayjs(d).startOf("day").valueOf()) : null);
      return [one(a), one(b)];
    }
    case "time":
      return v ? (v as Date).getTime() : null;
    default:
      return v ?? "";
  }
}

const empty = (row: Row, v: any) =>
  row.type === "checkbox" ? !v : row.type === "date-range" ? !v?.[0] || !v?.[1] : v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Why a row can't be submitted, in one sentence (design.md rule 9), or undefined. */
function problem(row: Row, v: any): string | undefined {
  if (row.required && empty(row, v)) return row.type === "checkbox" ? "Tick this to continue." : "Fill this in to continue.";
  if (row.type === "number" && v !== null && v !== "" && v !== undefined) {
    const n = Number(v);
    const lo = row.min !== undefined ? Number(row.min) : undefined;
    const hi = row.max !== undefined ? Number(row.max) : undefined;
    if ((lo !== undefined && n < lo) || (hi !== undefined && n > hi)) {
      return lo !== undefined && hi !== undefined ? `Enter a number from ${lo} to ${hi}.` : lo !== undefined ? `Enter ${lo} or more.` : `Enter ${hi} or less.`;
    }
  }
  if (row.type === "date" && v) {
    const day = dayjs(v).startOf("day");
    const lo = toDate(row.min);
    const hi = toDate(row.max);
    if ((lo && day.isBefore(dayjs(lo).startOf("day"))) || (hi && day.isAfter(dayjs(hi).startOf("day")))) return "Pick a date in the allowed range.";
  }
  return undefined;
}

/** ox_lib's input dialog (lib.inputDialog), its rows drawn with the kit's form-field presets. Protocol: docs/ox-lib-protocol.md §7. */
export function InputDialog() {
  const locale = useLocale();
  const [data, setData] = useState<DialogData | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);

  useOx<DialogData>("openDialog", (d) => {
    clearTimeout(pending.current); // a new dialog drops the previous one's pending answer
    const normalized = (d.rows ?? []).map((r) => (typeof r === "string" ? ({ type: "input", label: r } as Row) : r));
    setRows(normalized);
    setValues(normalized.map(initial));
    setErrors({});
    setData(d);
    setOpen(true);
  });
  useOx("closeInputDialog", () => setOpen(false));

  const finish = (body: unknown[] | undefined) => {
    setOpen(false);
    clearTimeout(pending.current);
    pending.current = setTimeout(() => void post("inputData", body), 200);
  };

  const cancel = () => {
    if (data?.options?.allowCancel === false) return;
    finish(undefined); // no body: Lua returns nil
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const bad: Record<number, string> = {};
    rows.forEach((row, i) => {
      const p = problem(row, values[i]);
      if (p) bad[i] = p;
    });
    setErrors(bad);
    if (Object.keys(bad).length) return;
    finish(rows.map((row, i) => output(row, values[i])));
  };

  const set = (i: number, v: any) => {
    setValues((all) => all.map((x, j) => (j === i ? v : x)));
    setErrors((s) => {
      if (!(i in s)) return s;
      const next = { ...s };
      delete next[i];
      return next;
    });
  };

  if (!data) return null;
  const allowCancel = data.options?.allowCancel !== false;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className={cn(DIALOG_PANEL, WIDTH[data.options?.size ?? "xs"])}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          cancel();
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className={DIALOG_HEADER}>
          <DialogTitle className="nk-title truncate">{data.heading}</DialogTitle>
        </DialogHeader>
        {/* noValidate: the browser's own checks (a number off its `step`, e.g. 12.345 with precision 2)
            silently blocked the submit. ox_lib rounds to `precision` and checks only required and
            min/max (§7.3), which problem() does. */}
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            {rows.map((row, i) => (
              <RowField key={i} row={row} value={values[i]} error={errors[i]} onChange={(v) => set(i, v)} />
            ))}
          </div>
          <DialogFooter className="nk-panel-footer">
            <Button type="button" variant="outline" disabled={!allowCancel} onClick={cancel}>
              {locale.cancel}
            </Button>
            <Button type="submit">{locale.confirm}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One dialog row as the kit's form-field preset for its type (the `input` intent's renderer).
 * Values stay in this file's shapes (initial/output above), so what Lua receives is unchanged.
 * date-range and time have no preset yet and keep their own controls inside a FormField row.
 */
function RowField({ row, value, error, onChange }: { row: Row; value: any; error?: string; onChange: (v: any) => void }) {
  const icon = row.icon ? <Icon icon={row.icon} className="size-4" /> : undefined;
  const base = { label: row.label, description: row.description, error, required: row.required, disabled: row.disabled };

  switch (row.type) {
    case "input":
      return (
        <TextField
          {...base}
          icon={icon}
          password={row.password}
          placeholder={row.placeholder}
          minLength={row.min as number | undefined}
          maxLength={row.max as number | undefined}
          value={value ?? ""}
          onValueChange={onChange}
        />
      );
    case "textarea":
      return (
        <TextField
          {...base}
          multiline
          rows={(row.min as number) ?? 2}
          placeholder={row.placeholder}
          minLength={row.minLength}
          maxLength={row.maxLength}
          value={value ?? ""}
          onValueChange={onChange}
        />
      );
    case "number":
      return (
        <NumberField
          {...base}
          icon={icon}
          placeholder={row.placeholder}
          min={row.min as number | undefined}
          max={row.max as number | undefined}
          step={row.step ?? (row.precision ? 1 / 10 ** row.precision : 1)}
          value={value === null || value === "" || value === undefined ? null : Number(value)}
          onValueChange={onChange}
        />
      );
    case "checkbox":
      return <CheckboxField {...base} checked={Boolean(value)} onCheckedChange={onChange} />;
    case "select":
      return (
        <SelectField
          {...base}
          options={row.options ?? []}
          placeholder={row.placeholder}
          clearable={row.clearable}
          value={value ?? null}
          onValueChange={onChange}
        />
      );
    case "multi-select":
      return (
        <SelectField
          {...base}
          multiple
          options={row.options ?? []}
          placeholder={row.placeholder}
          clearable={row.clearable}
          maxSelected={row.maxSelectedValues}
          value={value ?? []}
          onValueChange={onChange}
        />
      );
    case "slider":
      return <SliderField {...base} min={Number(row.min ?? 0)} max={Number(row.max ?? 100)} step={row.step ?? 1} value={Number(value)} onValueChange={onChange} />;
    case "color":
      // The field holds "#rrggbb"; output() turns it into the row's format when posting.
      return <ColorField {...base} placeholder={row.placeholder} value={toHex(value)} onValueChange={onChange} />;
    case "date":
      // form-field's DateField types the date in parts but has no calendar yet: the picker with
      // year and decade levels (#46, from the 0.6.1 test) stays until it has one (Requests).
      return (
        <FormField {...base}>
          <DatePicker
            value={(value as Date | null) ?? null}
            onChange={onChange}
            format={row.format ?? "DD/MM/YYYY"}
            min={toDate(row.min)}
            max={toDate(row.max)}
            disabled={row.disabled}
            invalid={Boolean(error)}
            clearable={
              row.clearable && value ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Clear">
                  <XIcon />
                </Button>
              ) : undefined
            }
          />
        </FormField>
      );
    case "date-range":
      return (
        <FormField {...base}>
          <DateRangeControl row={row} value={value} invalid={Boolean(error)} onChange={onChange} />
        </FormField>
      );
    case "time":
      return (
        <FormField {...base}>
          <TimeControl row={row} value={value} icon={icon} invalid={Boolean(error)} onChange={onChange} />
        </FormField>
      );
    default:
      return null;
  }
}

/** date-range: no form-field preset yet, so a calendar popover for the two days. */
function DateRangeControl({ row, value, invalid, onChange }: { row: Row; value: any; invalid: boolean; onChange: (v: any) => void }) {
  const fmt = row.format ?? "DD/MM/YYYY";
  const minD = toDate(row.min);
  const maxD = toDate(row.max);
  const disabled = [...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])];
  const text = value?.[0] ? `${dayjs(value[0]).format(fmt)} – ${value[1] ? dayjs(value[1]).format(fmt) : ""}` : "";
  return (
    <div className="flex gap-1.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" disabled={row.disabled} aria-invalid={invalid || undefined} className={cn("w-full justify-start font-normal", !text && "text-muted-foreground")}>
            <CalendarIcon />
            {text || fmt}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{ from: value?.[0] ?? undefined, to: value?.[1] ?? undefined }}
            onSelect={(r: DateRange | undefined) => onChange([r?.from ?? null, r?.to ?? null])}
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
      {row.clearable && value?.[0] && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange([null, null])} aria-label="Clear">
          <XIcon />
        </Button>
      )}
    </div>
  );
}

/** time: no form-field preset yet, so the time input (hours and minutes on today's date). */
function TimeControl({ row, value, icon, invalid, onChange }: { row: Row; value: any; icon?: ReactNode; invalid: boolean; onChange: (v: any) => void }) {
  const d = value as Date | null;
  const hhmm = d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
  return (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">{icon}</span>}
      <Input
        disabled={row.disabled}
        aria-invalid={invalid || undefined}
        type="time"
        value={hhmm}
        onChange={(e) => {
          if (!e.target.value) return onChange(row.clearable ? null : value);
          const [h, m] = e.target.value.split(":").map(Number);
          const next = new Date();
          next.setHours(h ?? 0, m ?? 0, 0, 0);
          onChange(next);
        }}
        className={cn(icon && "pl-9")}
      />
    </div>
  );
}

// ───────────────────────────── colour formats ('hex' default, 'hexa', 'rgb', 'rgba', 'hsl', 'hsla')

function toHex(v: string | null): string | null {
  if (!v) return null;
  if (/^#[0-9a-f]{6}/i.test(v)) return v.slice(0, 7);
  const m = v.match(/\d+(\.\d+)?/g);
  if (v.startsWith("rgb") && m) return "#" + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, "0")).join("");
  return null;
}

function formatColor(hex: string, format = "hex"): string {
  const h = toHex(hex) ?? "#000000"; // nuikit-ignore color/hardcoded: colour field value, not UI
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  switch (format) {
    case "hexa":
      return `${h}ff`;
    case "rgb":
      return `rgb(${r}, ${g}, ${b})`;
    case "rgba":
      return `rgba(${r}, ${g}, ${b}, 1)`;
    case "hsl":
    case "hsla": {
      const [hh, s, l] = rgbToHsl(r, g, b);
      return format === "hsl" ? `hsl(${hh}, ${s}%, ${l}%)` : `hsla(${hh}, ${s}%, ${l}%, 1)`;
    }
    default:
      return h;
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
