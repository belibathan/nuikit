// input → `form-field` presets in a centred panel. Every ox inputDialog row type maps to one, and
// the result comes back as ox does it: values in field order (and by id). Cancel and Escape
// resolve nothing (reason "cancel") unless allowCancel is false.
import type { InputField, InputProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckboxField,
  ColorField,
  FormField,
  DateField,
  DateRangeField,
  NumberField,
  SelectField,
  SliderField,
  TextField,
  TimeField,
  dateToEpoch,
  epochToDate,
  formatDate,
  validateField,
  type DateRange,
  type FieldKind,
} from "@/components/ui/form-field";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/ui/panel";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { cn } from "@/lib/utils";

const WIDTH: Record<string, string> = { xs: "w-80", sm: "w-96", md: "w-[28rem]", lg: "w-[38rem]", xl: "w-[48rem]" };

function InputRenderer({ intents, ctx }: RendererProps<"input">) {
  const top = intents[intents.length - 1];
  useEffect(
    () =>
      ctx.onBack(() => {
        const t = ctx.intents().at(-1);
        if (t && t.props.allowCancel !== false) ctx.cancel(t.id, "escape");
      }),
    [ctx],
  );
  if (!top) return null;
  return <OneInput key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

type Values = Record<number, unknown>;

/** The value a field starts with, in the shape the control keeps. */
function initial(f: InputField): unknown {
  const d = f.default;
  switch (f.type ?? "text") {
    case "checkbox":
      return f.checked ?? (typeof d === "boolean" ? d : false);
    case "number":
      return typeof d === "number" ? d : null;
    case "slider":
      return typeof d === "number" ? d : typeof f.min === "number" ? f.min : 0;
    case "select":
      return typeof d === "string" ? d : null;
    case "multi-select":
    case "checkbox-group":
      return Array.isArray(d) ? (d as string[]) : [];
    case "radio":
      return typeof d === "string" ? d : null;
    case "date":
      return d === true ? epochToDate(Date.now()) : typeof d === "string" || typeof d === "number" ? epochToDate(new Date(d).getTime()) : null;
    case "date-range":
      return Array.isArray(d) ? ([dateToEpoch(d[0] ? epochToDate(new Date(d[0] as string).getTime()) : null), dateToEpoch(d[1] ? epochToDate(new Date(d[1] as string).getTime()) : null)] as DateRange) : [null, null];
    case "time":
      return typeof d === "string" || typeof d === "number" ? new Date(d).getTime() || null : null;
    case "color":
      return typeof d === "string" ? d : null;
    default:
      return typeof d === "string" ? d : "";
  }
}

/** What the script gets for a field (ox's returned-value table). */
function returned(f: InputField, v: unknown): unknown {
  switch (f.type ?? "text") {
    case "number":
      return typeof v === "number" ? round(v, f.precision ?? 0) : null;
    case "date":
      if (typeof v !== "string") return null;
      return f.returnString ? formatDate(v, f.format?.toLowerCase().startsWith("mm") ? "mdy" : f.format?.toLowerCase().startsWith("yyyy") ? "ymd" : "dmy") : dateToEpoch(v);
    case "multi-select":
      return Array.isArray(v) && v.length ? v : null;
    case "checkbox-group":
      return Array.isArray(v) ? v : [];
    case "select":
    case "radio":
      return v ?? null;
    case "color":
      return v ?? null;
    default:
      return v;
  }
}

function round(n: number, precision: number) {
  const m = 10 ** precision;
  return Math.round(n * m) / m;
}

function kindOf(f: InputField): FieldKind {
  switch (f.type ?? "text") {
    case "number":
      return "number";
    case "slider":
      return "slider";
    case "checkbox":
      return "checkbox";
    case "select":
    case "multi-select":
    case "radio":
    case "checkbox-group":
      return "select";
    case "date":
    case "date-range":
      return "date";
    case "color":
      return "color";
    default:
      return "text";
  }
}

function OneInput({ id, props, ctx }: { id: string; props: InputProps; ctx: RendererProps<"input">["ctx"] }) {
  const fields = props.fields;
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields.map((f, i) => [i, initial(f)])));
  const [touched, setTouched] = useState(false);

  const issues = useMemo(
    () =>
      fields.map((f) => {
        const kind = kindOf(f);
        const v = values[fields.indexOf(f)];
        if (f.type === "checkbox") return f.required && v !== true ? "Required" : null;
        const rule = { kind, required: f.required, min: kind === "text" ? undefined : (f.min as number | string | undefined), max: kind === "text" ? undefined : (f.max as number | string | undefined), minLength: f.minLength ?? (kind === "text" && typeof f.min === "number" ? f.min : undefined), maxLength: f.maxLength ?? (kind === "text" && typeof f.max === "number" ? f.max : undefined) };
        const issue = validateField(rule, (f.type === "multi-select" || f.type === "checkbox-group") && Array.isArray(v) && !v.length ? null : v);
        return issue?.message ?? null;
      }),
    [fields, values],
  );
  const valid = issues.every((i) => !i);

  const set = (i: number, v: unknown) => {
    setValues((all) => ({ ...all, [i]: v }));
    ctx.emit(id, "change", { index: i + 1, id: fields[i]!.id ?? String(i + 1), value: returned(fields[i]!, v) });
  };

  const submit = () => {
    setTouched(true);
    if (!valid) return;
    const out = fields.map((f, i) => returned(f, values[i]));
    ctx.resolve(id, { values: out, byId: Object.fromEntries(fields.map((f, i) => [f.id ?? String(i + 1), out[i]])) });
  };
  const cancel = () => props.allowCancel !== false && ctx.cancel(id, "cancel");

  return (
    <div data-intent="input" className="pointer-events-auto absolute inset-0 grid place-items-center p-6">
      <div aria-hidden className="nk-enter absolute inset-0">
        <div className="size-full bg-(--scrim) opacity-50" />
      </div>
      <form
        className={cn("relative", WIDTH[props.size ?? "sm"])}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Panel size="auto" className="nk-pop w-full">
          <PanelHeader icon={props.icon ? <Icon icon={props.icon} /> : undefined} title={<Text>{props.title}</Text>} description={props.description ? <Text>{props.description}</Text> : undefined} />
          <PanelBody variant="form" scroll className="max-h-[60vh]">
            {fields.map((f, i) => (
              <Field key={i} field={f} index={i} value={values[i]} error={touched ? issues[i] : null} onChange={(v) => set(i, v)} autoFocus={i === 0} />
            ))}
          </PanelBody>
          <PanelFooter className="flex justify-end gap-2">
            {props.allowCancel !== false && (
              <Button type="button" variant="ghost" onClick={cancel}>
                {props.cancelLabel ?? "Cancel"}
              </Button>
            )}
            <Button type="submit" disabled={touched && !valid}>
              {props.submitLabel ?? "Confirm"}
            </Button>
          </PanelFooter>
        </Panel>
      </form>
    </div>
  );
}

function Field({ field: f, index, value, error, onChange, autoFocus }: { field: InputField; index: number; value: unknown; error: string | null; onChange: (v: unknown) => void; autoFocus?: boolean }) {
  const row = {
    label: f.label ?? `Field ${index + 1}`,
    description: f.description ? <Text>{f.description}</Text> : undefined,
    required: f.required,
    disabled: f.disabled,
    error: error ?? undefined,
  };
  const icon = f.icon ? <Icon icon={f.icon} allowImage={false} /> : undefined;
  switch (f.type ?? "text") {
    case "textarea":
      return <TextField {...row} multiline rows={typeof f.min === "number" ? f.min : 3} value={value as string} onValueChange={onChange} placeholder={f.placeholder} minLength={f.minLength} maxLength={f.maxLength} />;
    case "number":
      return <NumberField {...row} value={value as number | null} onValueChange={onChange} min={f.min as number | undefined} max={f.max as number | undefined} step={f.step} precision={f.precision ?? 0} placeholder={f.placeholder} icon={icon} />;
    case "checkbox":
      return <CheckboxField {...row} checked={value as boolean} onCheckedChange={onChange} />;
    case "select":
      return <SelectField {...row} options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label ?? o.value }))} value={value as string | null} onValueChange={onChange} placeholder={f.placeholder} clearable={f.clearable} />;
    case "multi-select":
      return <SelectField {...row} multiple options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label ?? o.value }))} value={value as string[]} onValueChange={onChange} placeholder={f.placeholder} clearable={f.clearable} maxSelected={f.maxSelected} />;
    case "radio":
      return (
        <FormField {...row}>
          <div role="radiogroup" className="flex flex-col gap-1.5">
            {(f.options ?? []).map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name={`field-${index}`} className="accent-(--primary)" checked={value === o.value} onChange={() => onChange(o.value)} disabled={f.disabled} />
                {o.label ?? o.value}
              </label>
            ))}
          </div>
        </FormField>
      );
    case "checkbox-group": {
      const picked = (value as string[]) ?? [];
      return (
        <FormField {...row}>
          <div className="flex flex-col gap-1.5">
            {(f.options ?? []).map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={picked.includes(o.value)} disabled={f.disabled} onCheckedChange={(on) => onChange(on ? [...picked, o.value] : picked.filter((x) => x !== o.value))} />
                {o.label ?? o.value}
              </label>
            ))}
          </div>
        </FormField>
      );
    }
    case "slider":
      return <SliderField {...row} value={value as number} onValueChange={onChange} min={(f.min as number) ?? 0} max={(f.max as number) ?? 100} step={f.step ?? 1} />;
    case "date":
      return <DateField {...row} value={value as string | null} onValueChange={onChange} min={typeof f.min === "string" ? f.min : undefined} max={typeof f.max === "string" ? f.max : undefined} />;
    case "date-range":
      return <DateRangeField {...row} value={value as DateRange} onValueChange={onChange} min={typeof f.min === "string" ? f.min : undefined} max={typeof f.max === "string" ? f.max : undefined} />;
    case "time":
      return <TimeField {...row} value={value as number | null} onValueChange={onChange} format={f.format === "12" ? "12" : "24"} clearable={f.clearable} />;
    case "color":
      return <ColorField {...row} value={value as string | null} onValueChange={onChange} placeholder={f.placeholder} />;
    default:
      return <TextField {...row} value={value as string} onValueChange={onChange} placeholder={f.placeholder} password={f.password || f.type === "password"} minLength={f.minLength ?? (typeof f.min === "number" ? f.min : undefined)} maxLength={f.maxLength ?? (typeof f.max === "number" ? f.max : undefined)} icon={icon} inputProps={{ autoFocus }} />;
  }
}

export default defineReactRenderer({ kind: "input", Component: InputRenderer, version: 1 });
