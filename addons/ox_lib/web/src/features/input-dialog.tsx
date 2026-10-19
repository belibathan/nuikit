import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CalendarIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
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

/** ox_lib's input dialog (lib.inputDialog). Protocol: docs/ox-lib-protocol.md §7. */
export function InputDialog() {
  const locale = useLocale();
  const [data, setData] = useState<DialogData | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState<Set<number>>(new Set());
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);

  useOx<DialogData>("openDialog", (d) => {
    clearTimeout(pending.current); // a new dialog drops the previous one's pending answer
    const normalized = (d.rows ?? []).map((r) => (typeof r === "string" ? ({ type: "input", label: r } as Row) : r));
    setRows(normalized);
    setValues(normalized.map(initial));
    setInvalid(new Set());
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
    const bad = new Set<number>();
    rows.forEach((row, i) => {
      const v = values[i];
      if (row.required && empty(row, v)) bad.add(i);
      if (row.type === "number" && v !== null && v !== "") {
        if (row.min !== undefined && Number(v) < Number(row.min)) bad.add(i);
        if (row.max !== undefined && Number(v) > Number(row.max)) bad.add(i);
      }
    });
    setInvalid(bad);
    if (bad.size) return;
    finish(rows.map((row, i) => output(row, values[i])));
  };

  const set = (i: number, v: any) => {
    setValues((all) => all.map((x, j) => (j === i ? v : x)));
    setInvalid((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : s));
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
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            {rows.map((row, i) => (
              <RowField key={i} row={row} value={values[i]} invalid={invalid.has(i)} onChange={(v) => set(i, v)} />
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

function Label({ row, children }: { row: Row; children?: ReactNode }) {
  if (!row.label && !children) return null;
  return (
    <FieldLabel className="gap-1">
      {row.label}
      {row.required && <span className="text-muted-foreground">*</span>}
      {children}
    </FieldLabel>
  );
}

function RowField({ row, value, invalid, onChange }: { row: Row; value: any; invalid: boolean; onChange: (v: any) => void }) {
  const [reveal, setReveal] = useState(false);
  const icon = row.icon ? <Icon icon={row.icon} className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /> : null;
  const pad = row.icon ? "pl-9" : undefined;
  const common = { disabled: row.disabled, "aria-invalid": invalid || undefined } as const;

  let control: ReactNode;
  switch (row.type) {
    case "input":
      control = (
        <div className="relative">
          {icon}
          <Input
            {...common}
            type={row.password && !reveal ? "password" : "text"}
            placeholder={row.placeholder}
            minLength={row.min as number | undefined}
            maxLength={row.max as number | undefined}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cn(pad, row.password && "pr-9")}
          />
          {row.password && (
            <button type="button" tabIndex={-1} onClick={() => setReveal((r) => !r)} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground">
              {reveal ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          )}
        </div>
      );
      break;
    case "textarea":
      control = (
        <Textarea
          {...common}
          placeholder={row.placeholder}
          rows={(row.min as number) ?? 2}
          minLength={row.minLength}
          maxLength={row.maxLength}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cn(!row.autosize && "field-sizing-fixed")}
        />
      );
      break;
    case "number":
      control = (
        <div className="relative">
          {icon}
          <Input
            {...common}
            type="number"
            placeholder={row.placeholder}
            min={row.min as number | undefined}
            max={row.max as number | undefined}
            step={row.step ?? (row.precision ? 1 / 10 ** row.precision : 1)}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
            className={pad}
          />
        </div>
      );
      break;
    case "checkbox":
      return (
        <Field orientation="horizontal" data-invalid={invalid || undefined}>
          <Checkbox {...common} checked={Boolean(value)} onCheckedChange={(c) => onChange(c === true)} />
          <Label row={row} />
        </Field>
      );
    case "select":
      control = (
        <div className="flex gap-1.5">
          <Select disabled={row.disabled} value={value ?? ""} onValueChange={onChange}>
            <SelectTrigger className="w-full" aria-invalid={invalid || undefined}>
              <SelectValue placeholder={row.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {(row.options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label ?? o.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {row.clearable && value && (
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)} aria-label="Clear">
              <XIcon />
            </Button>
          )}
        </div>
      );
      break;
    case "multi-select": {
      const selected: string[] = value ?? [];
      const max = row.maxSelectedValues;
      const label = selected.length ? selected.map((v) => row.options?.find((o) => o.value === v)?.label ?? v).join(", ") : row.placeholder;
      control = (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" disabled={row.disabled} aria-invalid={invalid || undefined} className={cn("w-full justify-start font-normal", !selected.length && "text-muted-foreground")}>
              <span className="truncate">{label || " "}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-(--radix-popover-trigger-width) p-1">
            {(row.options ?? []).map((o) => {
              const on = selected.includes(o.value);
              const full = max !== undefined && selected.length >= max && !on;
              return (
                <label key={o.value} className={cn("flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent", full && "opacity-50")}>
                  <Checkbox checked={on} disabled={full} onCheckedChange={(c) => onChange(c ? [...selected, o.value] : selected.filter((v) => v !== o.value))} />
                  {o.label ?? o.value}
                </label>
              );
            })}
          </PopoverContent>
        </Popover>
      );
      break;
    }
    case "slider": {
      const min = Number(row.min ?? 0);
      const max = Number(row.max ?? 100);
      control = (
        <div className="flex h-5 items-center">
          <Slider disabled={row.disabled} min={min} max={max} step={row.step ?? 1} value={[Number(value)]} onValueChange={([v]) => onChange(v)} />
        </div>
      );
      return (
        <Field data-invalid={invalid || undefined} className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label row={row} />
            <span className="nk-num text-sm text-muted-foreground">{value}</span>
          </div>
          {control}
          {row.description && <FieldDescription>{row.description}</FieldDescription>}
        </Field>
      );
    }
    case "color":
      control = (
        <div className="relative flex items-center gap-2">
          <input
            type="color"
            disabled={row.disabled}
            value={toHex(value) ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="ox-swatch size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1.5"
          />
          <Input {...common} readOnly placeholder={row.placeholder} value={value ? formatColor(value, row.format) : ""} />
        </div>
      );
      break;
    case "date":
    case "date-range": {
      const range = row.type === "date-range";
      const fmt = row.format ?? "DD/MM/YYYY";
      const minD = toDate(row.min);
      const maxD = toDate(row.max);
      const disabled = [...(minD ? [{ before: minD }] : []), ...(maxD ? [{ after: maxD }] : [])];
      const text = range
        ? value?.[0]
          ? `${dayjs(value[0]).format(fmt)} – ${value[1] ? dayjs(value[1]).format(fmt) : ""}`
          : ""
        : value
          ? dayjs(value).format(fmt)
          : "";
      control = (
        <div className="flex gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" disabled={row.disabled} aria-invalid={invalid || undefined} className={cn("w-full justify-start font-normal", !text && "text-muted-foreground")}>
                <CalendarIcon />
                {text || fmt}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              {range ? (
                <Calendar
                  mode="range"
                  selected={{ from: value?.[0] ?? undefined, to: value?.[1] ?? undefined }}
                  onSelect={(r: DateRange | undefined) => onChange([r?.from ?? null, r?.to ?? null])}
                  disabled={disabled}
                />
              ) : (
                <Calendar mode="single" selected={value ?? undefined} onSelect={(d: Date | undefined) => onChange(d ?? null)} disabled={disabled} />
              )}
            </PopoverContent>
          </Popover>
          {row.clearable && (range ? value?.[0] : value) && (
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(range ? [null, null] : null)} aria-label="Clear">
              <XIcon />
            </Button>
          )}
        </div>
      );
      break;
    }
    case "time": {
      const d = value as Date | null;
      const hhmm = d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
      control = (
        <div className="relative">
          {icon}
          <Input
            {...common}
            type="time"
            value={hhmm}
            onChange={(e) => {
              if (!e.target.value) return onChange(row.clearable ? null : value);
              const [h, m] = e.target.value.split(":").map(Number);
              const next = new Date();
              next.setHours(h ?? 0, m ?? 0, 0, 0);
              onChange(next);
            }}
            className={pad}
          />
        </div>
      );
      break;
    }
    default:
      control = null;
  }

  return (
    <Field data-invalid={invalid || undefined} className="gap-2">
      <Label row={row} />
      {control}
      {row.description && <FieldDescription>{row.description}</FieldDescription>}
    </Field>
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
  const h = toHex(hex) ?? "#000000";
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
