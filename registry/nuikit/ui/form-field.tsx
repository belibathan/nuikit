"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ClockIcon, EyeIcon, EyeOffIcon, MinusIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { SmoothInput, SmoothTextarea } from "@/components/ui/smooth-input"
import { Textarea } from "@/components/ui/textarea"

/**
 * FormField — one row of a game form (docs/design.md, "Field row"), and a preset per kind of
 * value: the default look of the `input` intent (docs/architecture.md §2).
 *
 *   <TextField label="Plate" hint="Up to 8" required maxLength={8} value={plate} onValueChange={setPlate} />
 *   <NumberField label="Amount" min={1} max={5000} value={amount} onValueChange={setAmount} error={error} />
 *   <SelectField label="Garage" options={garages} placeholder="Pick one" />
 *   <CheckboxField label="Remember me" />       <CheckboxField variant="switch" label="Show HUD" />
 *   <SliderField label="Nose width" min={-1} max={1} step={0.01} resetTo={0} />
 *   <DateField label="Date of birth" min="1920-01-01" max="2008-12-31" />
 *   <ColorField label="Primary colour" swatches={["#0b0b0b", "#c8102e", …]} />
 *
 * Every field: label, hint (beside the label), description (under the control), error (replaces
 * it), required, disabled, and an inline value and reset on the right of the label row. Values
 * are controlled (`value` + `onValueChange`) or not (`defaultValue`). `validateField()` checks a
 * value against required, min/max and length rules, so a form shows errors when it decides to.
 *
 * Chromium 103 (FiveM): nothing here relies on :has(), and no control opens a native popup
 * (the date and colour inputs are drawn in the page; native pickers don't show in game).
 *
 * Role: One row of a game form and a preset per value (text, number, select, checkbox, slider, date, time,
 *   colour).
 * Anatomy: field > label (required mark, inline value, reset) > control > hint / description > error (role
 *   alert)
 * Props: orientation, label, hint, description, error, required, disabled, valueText, onReset.
 * Rules: Nothing relies on :has() or native pickers (Chromium 103). validateField() is the one validation path;
 *   the error replaces the description.
 */

/* ── the row ─────────────────────────────────────────────────────────────── */

type FormFieldContextValue = {
  id: string
  labelId: string
  describedBy?: string
  invalid: boolean
  required: boolean
  disabled: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

/** The id, aria-describedby and state of the enclosing FormField, for a custom control. */
function useFormField(): FormFieldContextValue {
  const ctx = React.useContext(FormFieldContext)
  const fallback = React.useId()
  return ctx ?? { id: fallback, labelId: `${fallback}-label`, invalid: false, required: false, disabled: false }
}

/** aria-* and id for a control inside a FormField. */
function controlProps(f: FormFieldContextValue) {
  return {
    id: f.id,
    "aria-describedby": f.describedBy,
    "aria-invalid": f.invalid || undefined,
    "aria-required": f.required || undefined,
  }
}

const formFieldVariants = cva("min-w-0", {
  variants: {
    orientation: {
      /** Label row over the control (inputs, selects, sliders). */
      vertical: "nk-field",
      /** Control, then the label (checkboxes). */
      horizontal: "flex flex-col gap-(--nk-space-2)",
      /** Label, then the control at the end of the row (switches). */
      "inline-end": "flex flex-col gap-(--nk-space-2)",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

type FormFieldProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof formFieldVariants> & {
    label?: React.ReactNode
    /** Short, beside the label: "Up to 8", "Optional", "Bone width". */
    hint?: React.ReactNode
    /** Under the control. */
    description?: React.ReactNode
    /** Under the control instead of the description; marks the control invalid. */
    error?: React.ReactNode
    required?: boolean
    disabled?: boolean
    /** Right of the label row: the slider's value, a character count. */
    valueText?: React.ReactNode
    /** Shows a reset button in the label row. */
    onReset?: () => void
    resetDisabled?: boolean
    children?: React.ReactNode
  }

function FormField({
  className,
  orientation = "vertical",
  id,
  label,
  hint,
  description,
  error,
  required = false,
  disabled = false,
  valueText,
  onReset,
  resetDisabled,
  children,
  ...props
}: FormFieldProps) {
  const auto = React.useId()
  const fid = id ?? auto
  const invalid = error !== undefined && error !== null && error !== false && error !== ""
  const descId = `${fid}-description`
  const errId = `${fid}-error`
  const ctx = React.useMemo<FormFieldContextValue>(
    () => ({
      id: fid,
      labelId: `${fid}-label`,
      describedBy: invalid ? errId : description ? descId : undefined,
      invalid,
      required,
      disabled,
    }),
    [fid, invalid, errId, description, descId, required, disabled]
  )

  const labelEl = label !== undefined && (
    <Label
      htmlFor={fid}
      id={`${fid}-label`}
      data-slot="form-field-label"
      className={cn(
        "min-w-0",
        disabled && "opacity-50"
      )}
    >
      <span className="truncate">{label}</span>
      {required && (
        <span aria-hidden className="text-muted-foreground">
          *
        </span>
      )}
    </Label>
  )
  const hintEl = hint !== undefined && (
    <span data-slot="form-field-hint" className="truncate">
      {hint}
    </span>
  )
  const end = (onReset || (valueText !== undefined && valueText !== null)) && (
    <span data-slot="form-field-end" className="ml-auto flex shrink-0 items-center">
      {onReset && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Reset"
          disabled={disabled || resetDisabled}
          onClick={onReset}
          className="text-muted-foreground"
        >
          <RotateCcwIcon />
        </Button>
      )}
      {valueText !== undefined && valueText !== null && (
        <span data-slot="form-field-value" className="nk-num">
          {valueText}
        </span>
      )}
    </span>
  )
  const below = invalid ? (
    <p id={errId} data-slot="form-field-error" role="alert" >
      {error}
    </p>
  ) : description ? (
    <p id={descId} data-slot="form-field-description" >
      {description}
    </p>
  ) : null

  return (
    <FormFieldContext.Provider value={ctx}>
      <div
        data-slot="form-field"
        data-orientation={orientation}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        className={cn(formFieldVariants({ orientation }), className)}
        {...props}
      >
        {orientation === "vertical" ? (
          <>
            {(labelEl || hintEl || end) && (
              <div className="nk-field-label">
                {labelEl}
                {hintEl}
                {end}
              </div>
            )}
            {children}
          </>
        ) : orientation === "horizontal" ? (
          <div data-slot="form-field-row" className="flex min-w-0 items-center">
            {children}
            {labelEl}
            {hintEl}
            {end}
          </div>
        ) : (
          <div data-slot="form-field-row" className="flex min-w-0 items-center">
            {labelEl}
            {hintEl}
            <span data-slot="form-field-trail" className="ml-auto flex shrink-0 items-center">
              {end}
              {children}
            </span>
          </div>
        )}
        {below}
      </div>
    </FormFieldContext.Provider>
  )
}

/* ── shared logic (pure, tested) ─────────────────────────────────────────── */

/** A value that is controlled when `value !== undefined`. */
function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue)
  const controlled = value !== undefined
  const current = controlled ? (value as T) : inner
  const set = React.useCallback(
    (v: T) => {
      if (!controlled) setInner(v)
      onChange?.(v)
    },
    [controlled, onChange]
  )
  return [current, set] as const
}

/** "12.5" → 12.5, "" or not a number → null; rounded to `precision` decimals when given. */
function parseNumber(text: string, precision?: number): number | null {
  if (text.trim() === "") return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  return precision === undefined ? n : roundTo(n, precision)
}

function roundTo(n: number, precision: number) {
  const f = 10 ** Math.max(0, Math.floor(precision))
  return Math.round(n * f) / f
}

/** One stepper press: from the value (or the lower bound, or 0), clamped to min/max. */
function stepNumber(
  value: number | null | undefined,
  direction: 1 | -1,
  { min, max, step = 1, precision }: { min?: number; max?: number; step?: number; precision?: number } = {}
) {
  const start = value ?? (direction > 0 ? (min ?? 0) - step : (max ?? 0) + step)
  let next = start + direction * step
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  return roundTo(next, precision ?? decimals(step))
}

function decimals(n: number) {
  const s = String(n)
  const i = s.indexOf(".")
  return i < 0 ? 0 : s.length - i - 1
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** "YYYY-MM-DD" from parts, or null if any is missing or the date doesn't exist (31/02). */
function dateFromParts(day: string | number, month: string | number, year: string | number): string | null {
  const d = Number(day)
  const m = Number(month)
  const y = Number(year)
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null
  if (String(year).length !== 4 || y < 1 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/** "YYYY-MM-DD" → its parts, or null when it isn't a real date. */
function parseDate(iso: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "")
  if (!match) return null
  const [, y, m, d] = match
  return dateFromParts(d!, m!, y!) ? { year: y!, month: m!, day: d! } : null
}

type DateOrder = "dmy" | "mdy" | "ymd"

/** "YYYY-MM-DD" shown in the field's order: 01/02/1990, 02/01/1990, 1990-02-01. */
function formatDate(iso: string, order: DateOrder = "dmy") {
  const p = parseDate(iso)
  if (!p) return iso
  if (order === "ymd") return `${p.year}-${p.month}-${p.day}`
  return order === "mdy" ? `${p.month}/${p.day}/${p.year}` : `${p.day}/${p.month}/${p.year}`
}

/** "#abc", "abc", "#AABBCC" → "#aabbcc"; anything else → null. */
function normalizeHex(text: string | null | undefined): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((text ?? "").trim())
  if (!m) return null
  const h = m[1]!.toLowerCase()
  return `#${h.length === 3 ? [...h].map((c) => c + c).join("") : h}`
}

type FieldKind = "text" | "number" | "select" | "checkbox" | "slider" | "date" | "date-range" | "time" | "color"

type FieldRule = {
  kind: FieldKind
  required?: boolean
  /** number, slider: a value; date, date-range: "YYYY-MM-DD"; time: "HH:MM" (24h). */
  min?: number | string
  max?: number | string
  /** text: characters. */
  minLength?: number
  maxLength?: number
  dateOrder?: DateOrder
}

type FieldIssue = {
  code: "required" | "min" | "max" | "minLength" | "maxLength" | "invalid" | "incomplete" | "order"
  message: string
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

/**
 * What's wrong with a value, in one sentence-case message, or null. Empty values only fail
 * `required`; the other rules apply to what's there.
 */
function validateField(rule: FieldRule, value: unknown): FieldIssue | null {
  const empty =
    rule.kind === "checkbox"
      ? value !== true
      : rule.kind === "date-range"
        ? !Array.isArray(value) || value.every((v) => v === null || v === undefined)
        : isEmpty(value)
  if (empty) return rule.required ? { code: "required", message: "Required" } : null
  switch (rule.kind) {
    case "text": {
      const n = String(value).length
      if (rule.minLength !== undefined && n < rule.minLength)
        return { code: "minLength", message: `At least ${rule.minLength} character${rule.minLength === 1 ? "" : "s"}` }
      if (rule.maxLength !== undefined && n > rule.maxLength)
        return { code: "maxLength", message: `At most ${rule.maxLength} character${rule.maxLength === 1 ? "" : "s"}` }
      return null
    }
    case "number":
    case "slider": {
      const n = typeof value === "number" ? value : Number(value)
      if (!Number.isFinite(n)) return { code: "invalid", message: "Enter a number" }
      if (rule.min !== undefined && n < Number(rule.min)) return { code: "min", message: `At least ${rule.min}` }
      if (rule.max !== undefined && n > Number(rule.max)) return { code: "max", message: `At most ${rule.max}` }
      return null
    }
    case "date": {
      const iso = String(value)
      if (!parseDate(iso)) return { code: "invalid", message: "Enter a real date" }
      if (rule.min !== undefined && iso < String(rule.min))
        return { code: "min", message: `On or after ${formatDate(String(rule.min), rule.dateOrder)}` }
      if (rule.max !== undefined && iso > String(rule.max))
        return { code: "max", message: `On or before ${formatDate(String(rule.max), rule.dateOrder)}` }
      return null
    }
    case "date-range": {
      // [startMs, endMs] as ox_lib returns them (local midnight), either end may be null.
      const [a, b] = value as [number | null, number | null]
      if (a === null || a === undefined || b === null || b === undefined) return { code: "incomplete", message: "Pick both dates" }
      const start = epochToDate(a)
      const end = epochToDate(b)
      if (!start || !end) return { code: "invalid", message: "Enter real dates" }
      if (end < start) return { code: "order", message: "The end can't be before the start" }
      if (rule.min !== undefined && start < String(rule.min))
        return { code: "min", message: `On or after ${formatDate(String(rule.min), rule.dateOrder)}` }
      if (rule.max !== undefined && end > String(rule.max))
        return { code: "max", message: `On or before ${formatDate(String(rule.max), rule.dateOrder)}` }
      return null
    }
    case "time": {
      // Epoch ms (ox_lib's shape): only the clock time counts.
      const t = epochToTime(typeof value === "number" ? value : Number(value))
      if (!t) return { code: "invalid", message: "Enter a real time" }
      if (rule.min !== undefined && t < String(rule.min)) return { code: "min", message: `At ${rule.min} or later` }
      if (rule.max !== undefined && t > String(rule.max)) return { code: "max", message: `At ${rule.max} or earlier` }
      return null
    }
    case "color":
      // An example the player reads, not a colour the UI draws.
      return normalizeHex(String(value)) ? null : { code: "invalid", message: "Enter a colour like #c8102e" } // nuikit-ignore color/hardcoded
    default:
      return null
  }
}

/* ── presets ─────────────────────────────────────────────────────────────── */

/** The FormField props every preset takes. */
type RowProps = Pick<
  FormFieldProps,
  "label" | "hint" | "description" | "error" | "required" | "disabled" | "className" | "id" | "onReset" | "valueText"
>

function rowProps<T extends RowProps>(p: T) {
  const { label, hint, description, error, required, disabled, className, id, onReset, valueText, ...rest } = p
  return [{ label, hint, description, error, required, disabled, className, id, onReset, valueText }, rest] as const
}

/* text */

type TextFieldProps = RowProps & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  minLength?: number
  maxLength?: number
  /** Show "12 / 20" in the label row (default when maxLength is set). */
  showCount?: boolean
  password?: boolean
  multiline?: boolean
  rows?: number
  /** Leading icon (single-line only). */
  icon?: React.ReactNode
  inputProps?: Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange">
}

function TextField(props: TextFieldProps) {
  const [row, { value, defaultValue = "", onValueChange, maxLength, showCount, ...control }] = rowProps(props)
  const [text, setText] = useControllable(value, defaultValue, onValueChange)
  const count = (showCount ?? maxLength !== undefined) && maxLength !== undefined ? `${text.length} / ${maxLength}` : undefined
  return (
    <FormField {...row} valueText={row.valueText ?? count}>
      <TextControl value={text} onValueChange={setText} maxLength={maxLength} {...control} />
    </FormField>
  )
}

function TextControl({
  value,
  onValueChange,
  placeholder,
  minLength,
  maxLength,
  password,
  multiline,
  rows = 3,
  icon,
  inputProps,
}: Omit<TextFieldProps, keyof RowProps | "defaultValue" | "showCount"> & { value: string; onValueChange: (v: string) => void }) {
  const f = useFormField()
  const [reveal, setReveal] = React.useState(false)
  if (multiline) {
    return (
      <SmoothTextarea
        {...controlProps(f)}
        data-slot="form-field-control"
        disabled={f.disabled}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        rows={rows}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="field-sizing-fixed resize-none"
      />
    )
  }
  return (
    <div className="relative">
      {icon && (
        <span data-slot="form-field-icon" data-place="start" className="pointer-events-none absolute inset-y-0 flex items-center">
          {icon}
        </span>
      )}
      <SmoothInput
        {...inputProps}
        {...controlProps(f)}
        data-slot="form-field-control"
        type={password && !reveal ? "password" : "text"}
        disabled={f.disabled}
        placeholder={placeholder}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        data-icon={icon ? "" : undefined}
        data-affix={password ? "password" : undefined}
        className={inputProps?.className}
      />
      {password && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={reveal ? "Hide" : "Show"}
          aria-pressed={reveal}
          disabled={f.disabled}
          onClick={() => setReveal((r) => !r)}
          data-slot="form-field-reveal"
          className="absolute inset-y-0 my-auto text-muted-foreground"
        >
          {reveal ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      )}
    </div>
  )
}

/* number */

type NumberFieldProps = RowProps & {
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  /** Decimals kept (default: as many as `step` has). */
  precision?: number
  placeholder?: string
  /** − and + buttons beside the input (default true); "inline": ‹ › ghost buttons inside the input's right edge. false: none. */
  stepper?: boolean | "inline"
  icon?: React.ReactNode
}

function NumberField(props: NumberFieldProps) {
  const [row, { value, defaultValue = null, onValueChange, ...control }] = rowProps(props)
  const [n, setN] = useControllable(value, defaultValue, onValueChange)
  return (
    <FormField {...row}>
      <NumberControl value={n} onValueChange={setN} {...control} />
    </FormField>
  )
}

function NumberControl({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  precision,
  placeholder,
  stepper = true,
  icon,
}: Omit<NumberFieldProps, keyof RowProps | "defaultValue"> & { value: number | null; onValueChange: (v: number | null) => void }) {
  const f = useFormField()
  const [text, setText] = React.useState(value === null || value === undefined ? "" : String(value))
  // Follow the value when it changes from outside (a stepper press, a reset), not while typing "1." or "-".
  React.useEffect(() => {
    if (parseNumber(text, precision) !== value) setText(value === null || value === undefined ? "" : String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const press = (dir: 1 | -1) => onValueChange(stepNumber(value, dir, { min, max, step, precision }))
  const atMin = f.disabled || (min !== undefined && value !== null && value <= min)
  const atMax = f.disabled || (max !== undefined && value !== null && value >= max)
  const inline = stepper === "inline"
  return (
    <div className="flex items-center gap-(--nk-space-2)">
      <div className="relative min-w-0 flex-1">
        {icon && (
          <span data-slot="form-field-icon" data-place="start" className="pointer-events-none absolute inset-y-0 flex items-center">
            {icon}
          </span>
        )}
        <Input
          {...controlProps(f)}
          data-slot="form-field-control"
          type="number"
          inputMode="decimal"
          disabled={f.disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onValueChange(parseNumber(e.target.value, precision))
          }}
          data-icon={icon ? "" : undefined}
          data-affix={inline ? "stepper" : undefined}
          className="nk-num [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {inline && (
          <span data-slot="form-field-stepper" className="absolute inset-y-0 flex items-center">
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Decrease" className="text-muted-foreground" disabled={atMin} onClick={() => press(-1)}>
              <ChevronDownIcon />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Increase" className="text-muted-foreground" disabled={atMax} onClick={() => press(1)}>
              <ChevronUpIcon />
            </Button>
          </span>
        )}
      </div>
      {stepper === true && (
        <>
          <Button type="button" variant="outline" size="icon" aria-label="Decrease" disabled={atMin} onClick={() => press(-1)}>
            <MinusIcon />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Increase" disabled={atMax} onClick={() => press(1)}>
            <PlusIcon />
          </Button>
        </>
      )}
    </div>
  )
}

/* select */

type FieldOption = { value: string; label?: React.ReactNode; disabled?: boolean }

type SelectFieldProps = RowProps & {
  options: readonly FieldOption[]
  placeholder?: string
  /** A clear button when something is picked. */
  clearable?: boolean
} & (
    | {
        multiple?: false
        value?: string | null
        defaultValue?: string | null
        onValueChange?: (value: string | null) => void
        maxSelected?: never
      }
    | {
        /** Pick several (a checkbox list in a popover). */
        multiple: true
        value?: string[]
        defaultValue?: string[]
        onValueChange?: (value: string[]) => void
        maxSelected?: number
      }
  )

function SelectField(props: SelectFieldProps) {
  const [row] = rowProps(props)
  const control = { options: props.options, placeholder: props.placeholder, clearable: props.clearable }
  return (
    <FormField {...row}>
      {props.multiple ? (
        <MultiSelectControl
          value={props.value}
          defaultValue={props.defaultValue ?? []}
          onValueChange={props.onValueChange}
          maxSelected={props.maxSelected}
          {...control}
        />
      ) : (
        <SingleSelectControl value={props.value} defaultValue={props.defaultValue ?? null} onValueChange={props.onValueChange} {...control} />
      )}
    </FormField>
  )
}

function SingleSelectControl({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  clearable,
}: {
  value?: string | null
  defaultValue: string | null
  onValueChange?: (v: string | null) => void
  options: readonly FieldOption[]
  placeholder?: string
  clearable?: boolean
}) {
  const f = useFormField()
  const [v, setV] = useControllable(value, defaultValue, onValueChange)
  return (
    <div className="flex items-center gap-(--nk-space-2)">
      <Select disabled={f.disabled} value={v ?? ""} onValueChange={(next) => setV(next || null)}>
        <SelectTrigger {...controlProps(f)} data-slot="form-field-control" className="w-full min-w-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
              {o.label ?? o.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && v && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear" disabled={f.disabled} onClick={() => setV(null)}>
          <XIcon />
        </Button>
      )}
    </div>
  )
}

function MultiSelectControl({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder,
  clearable,
  maxSelected,
}: {
  value?: string[]
  defaultValue: string[]
  onValueChange?: (v: string[]) => void
  options: readonly FieldOption[]
  placeholder?: string
  clearable?: boolean
  maxSelected?: number
}) {
  const f = useFormField()
  const [selected, setSelected] = useControllable(value, defaultValue, onValueChange)
  const labels = selected.map((s) => options.find((o) => o.value === s)?.label ?? s)
  const full = maxSelected !== undefined && selected.length >= maxSelected
  return (
    <div className="flex items-center gap-(--nk-space-2)">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            {...controlProps(f)}
            data-slot="form-field-control"
            type="button"
            variant="outline"
            disabled={f.disabled}
            className={cn(
              "w-full min-w-0 justify-between px-3 font-normal aria-invalid:border-destructive dark:bg-input/30",
              !selected.length && "text-muted-foreground"
            )}
          >
            <span className="flex min-w-0 items-center gap-1 truncate">
              {selected.length
                ? labels.map((l, i) => (
                    <React.Fragment key={selected[i]}>
                      {i > 0 && ", "}
                      {l}
                    </React.Fragment>
                  ))
                : placeholder}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1">
          <div role="group" aria-label={typeof placeholder === "string" ? placeholder : undefined} className="flex flex-col">
            {options.map((o) => {
              const on = selected.includes(o.value)
              const off = o.disabled || (full && !on)
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex min-h-8 items-center gap-2 rounded-(--nk-radius-key) px-2 text-(length:--nk-text-label) hover:bg-accent hover:text-accent-foreground",
                    off && "pointer-events-none opacity-50"
                  )}
                >
                  <Checkbox
                    checked={on}
                    disabled={off}
                    onCheckedChange={(c) => setSelected(c === true ? [...selected, o.value] : selected.filter((s) => s !== o.value))}
                  />
                  {o.label ?? o.value}
                </label>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
      {clearable && selected.length > 0 && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear" disabled={f.disabled} onClick={() => setSelected([])}>
          <XIcon />
        </Button>
      )}
    </div>
  )
}

/* checkbox / switch */

type CheckboxFieldProps = RowProps & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** checkbox: box, then the label. switch: the label, then a switch at the end. */
  variant?: "checkbox" | "switch"
}

function CheckboxField(props: CheckboxFieldProps) {
  const [row, { checked, defaultChecked = false, onCheckedChange, variant = "checkbox" }] = rowProps(props)
  const [on, setOn] = useControllable(checked, defaultChecked, onCheckedChange)
  return (
    <FormField {...row} orientation={variant === "switch" ? "inline-end" : "horizontal"}>
      <CheckControl variant={variant} checked={on} onCheckedChange={setOn} />
    </FormField>
  )
}

function CheckControl({
  variant,
  checked,
  onCheckedChange,
}: {
  variant: "checkbox" | "switch"
  checked: boolean
  onCheckedChange: (c: boolean) => void
}) {
  const f = useFormField()
  const common = { ...controlProps(f), "data-slot": "form-field-control", disabled: f.disabled, checked }
  return variant === "switch" ? (
    <Switch {...common} onCheckedChange={onCheckedChange} />
  ) : (
    <Checkbox {...common} onCheckedChange={(c) => onCheckedChange(c === true)} />
  )
}

/* slider */

type SliderFieldProps = RowProps & {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** Fires when the thumb is let go (pointer up; once per key step), not on every pointer move: for a value that posts to Lua. */
  onCommit?: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Shows a reset button that sets this value (disabled while the value is already it). */
  resetTo?: number
  /** The value in the label row; false hides it. Default: the number. */
  format?: ((value: number) => React.ReactNode) | false
}

function SliderField(props: SliderFieldProps) {
  const [row, { value, defaultValue, onValueChange, onCommit, min = 0, max = 100, step = 1, resetTo, format }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue ?? min, onValueChange)
  const shown = format === false ? undefined : format ? format(v) : String(roundTo(v, decimals(step)))
  const reset = resetTo !== undefined ? () => (setV(resetTo), onCommit?.(resetTo)) : undefined
  return (
    <FormField
      {...row}
      valueText={row.valueText ?? shown}
      onReset={row.onReset ?? reset}
      resetDisabled={resetTo !== undefined && v === resetTo}
    >
      <SliderControl value={v} onValueChange={setV} onCommit={onCommit} min={min} max={max} step={step} />
    </FormField>
  )
}

function SliderControl({
  value,
  onValueChange,
  onCommit,
  min,
  max,
  step,
}: {
  value: number
  onValueChange: (v: number) => void
  onCommit?: (v: number) => void
  min: number
  max: number
  step: number
}) {
  const f = useFormField()
  const box = React.useRef<HTMLDivElement>(null)
  // shadcn's Slider puts props on its root and renders the thumbs itself, but the thumb
  // (role="slider") is what takes focus: name and describe it from here (vendor/ stays stock).
  React.useEffect(() => {
    box.current?.querySelectorAll<HTMLElement>('[role="slider"]').forEach((thumb) => {
      const set = (name: string, v: string | undefined) => (v ? thumb.setAttribute(name, v) : thumb.removeAttribute(name))
      set("aria-labelledby", document.getElementById(f.labelId) ? f.labelId : undefined)
      set("aria-describedby", f.describedBy)
      set("aria-invalid", f.invalid ? "true" : undefined)
      set("aria-required", f.required ? "true" : undefined)
    })
  })
  return (
    <div ref={box} className="flex h-5 items-center">
      <Slider
        data-slot="form-field-control"
        id={f.id}
        disabled={f.disabled}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([n]) => onValueChange(n ?? min)}
        onValueCommit={onCommit ? ([n]) => onCommit(n ?? min) : undefined}
      />
    </div>
  )
}

/* date */

type DateFieldProps = RowProps & {
  /** "YYYY-MM-DD", or null while empty or incomplete. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** "YYYY-MM-DD" bounds, for validateField and the year/month/day steppers. */
  min?: string
  max?: string
  /** Which part comes first (default day/month/year). */
  order?: DateOrder
  /**
   * A calendar button after the boxes (default on): days, then a page of years, then decades,
   * the way ox_lib's date row picks a birth year in a few clicks.
   */
  picker?: boolean
}

function DateField(props: DateFieldProps) {
  const [row, { value, defaultValue = null, onValueChange, ...control }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue, onValueChange)
  return (
    <FormField {...row}>
      <DateControl value={v} onValueChange={setV} {...control} />
    </FormField>
  )
}

type DatePart = "day" | "month" | "year"

const PARTS: Record<DateOrder, DatePart[]> = {
  dmy: ["day", "month", "year"],
  mdy: ["month", "day", "year"],
  ymd: ["year", "month", "day"],
}

const PART: Record<DatePart, { length: number; placeholder: string; label: string; width: string }> = {
  day: { length: 2, placeholder: "DD", label: "Day", width: "w-6" },
  month: { length: 2, placeholder: "MM", label: "Month", width: "w-7" },
  year: { length: 4, placeholder: "YYYY", label: "Year", width: "w-11" },
}

/** One arrow-key press on a date part, wrapping inside its range (years stay inside min/max). */
function stepDatePart(part: DatePart, text: string, direction: 1 | -1, { min, max }: { min?: string; max?: string } = {}) {
  const n = Number(text)
  if (part === "year") {
    const lo = Number(parseDate(min)?.year ?? 1)
    const hi = Number(parseDate(max)?.year ?? 9999)
    const start = text === "" ? (direction > 0 ? lo : hi) : n + direction
    return String(Math.min(hi, Math.max(lo, start))).padStart(4, "0")
  }
  const top = part === "day" ? 31 : 12
  const next = text === "" ? (direction > 0 ? 1 : top) : ((n - 1 + direction + top) % top) + 1
  return String(next).padStart(2, "0")
}

type Segment = {
  key: string
  /** aria-label of this box: "Day", "End year", "Hours". */
  label: string
  placeholder: string
  /** Digits it takes; it hands focus on when full. */
  length: number
  /** Unused: each box sizes itself to the wider of its placeholder and its digits (segmentSizer). */
  width?: string
  value: string
}

/**
 * What sizes a segment box: the wider of its placeholder ("MM", "YYYY") and a full value
 * ("0000"), drawn invisibly in the box's own font under the input. So the box fits both in every
 * identity's numeric face (proportional, condensed, serif or mono), at every resolution: a box in
 * fixed rem clipped "MM", "YYYY" and the last digit of a year.
 */
function segmentSizer(placeholder: string, length: number) {
  return [placeholder, "0".repeat(Math.max(1, length))]
}

/**
 * The typed-box control every date and time field uses: digits only, auto-advance, arrow keys to
 * step, Backspace on an empty box goes back, a separator key moves on. No native picker (they
 * don't draw in game).
 */
function SegmentedInput({
  segments,
  separator,
  onSegment,
  onStep,
  firstId,
  icon,
  invalid,
  dense = false,
  children,
}: {
  segments: Segment[]
  /** Drawn before segment i (i > 0). */
  separator: (i: number) => React.ReactNode
  onSegment: (key: string, digits: string) => void
  onStep: (key: string, direction: 1 | -1) => void
  firstId?: string
  icon?: React.ReactNode
  invalid?: boolean
  /** Tighter gaps and padding (two dates in one box). */
  dense?: boolean
  /** After the boxes (the AM/PM toggle). */
  children?: React.ReactNode
}) {
  const f = useFormField()
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const focus = (i: number) => {
    const el = refs.current[i]
    el?.focus()
    el?.select()
  }
  const bad = f.invalid || invalid || undefined
  return (
    <div
      role="group"
      data-slot="form-field-control"
      data-segmented=""
      data-dense={dense || undefined}
      aria-labelledby={f.labelId}
      aria-describedby={f.describedBy}
      aria-invalid={bad}
      data-disabled={f.disabled || undefined}
      className={cn(
        "flex w-full min-w-0 items-center rounded-(--nk-radius-control) border border-input bg-transparent shadow-xs dark:bg-input/30",
        "focus-within:border-ring",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      )}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return
        const empty = segments.findIndex((s) => s.value === "")
        focus(empty >= 0 ? empty : 0)
      }}
    >
      {icon}
      {segments.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && separator(i)}
          <span data-slot="form-field-segment" className="relative inline-grid shrink-0">
            {segmentSizer(s.placeholder, s.length).map((t, j) => (
              <span key={j} aria-hidden className="nk-num invisible col-start-1 row-start-1 px-px whitespace-pre">
                {t}
              </span>
            ))}
          <input
            ref={(el) => {
              refs.current[i] = el
            }}
            id={i === 0 ? (firstId ?? f.id) : undefined}
            aria-label={s.label}
            aria-required={f.required || undefined}
            aria-invalid={bad}
            disabled={f.disabled}
            inputMode="numeric"
            autoComplete="off"
            maxLength={s.length}
            placeholder={s.placeholder}
            value={s.value}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, s.length)
              onSegment(s.key, digits)
              if (digits.length === s.length && i < segments.length - 1) focus(i + 1)
            }}
            onKeyDown={(e) => {
              const last = i === segments.length - 1
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault()
                onStep(s.key, e.key === "ArrowUp" ? 1 : -1)
              } else if (e.key === "Backspace" && s.value === "" && i > 0) {
                e.preventDefault()
                focus(i - 1)
              } else if (["/", "-", ":", "."].includes(e.key)) {
                e.preventDefault()
                if (!last) focus(i + 1)
              } else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0 && i > 0) {
                e.preventDefault()
                focus(i - 1)
              } else if (e.key === "ArrowRight" && e.currentTarget.selectionEnd === s.value.length && !last) {
                e.preventDefault()
                focus(i + 1)
              }
            }}
            // absolute: no intrinsic width of its own (an input keeps one even at size 1), so the sizers set the box
            size={1}
            className="nk-num absolute inset-0 size-full min-w-0 bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          </span>
        </React.Fragment>
      ))}
      {children}
    </div>
  )
}

const sepClass = ""

type DateParts = Record<DatePart, string>

const partsOf = (iso: string | null | undefined): DateParts => {
  const p = parseDate(iso)
  return { day: p?.day ?? "", month: p?.month ?? "", year: p?.year ?? "" }
}

function DateControl({
  value,
  onValueChange,
  min,
  max,
  order = "dmy",
  picker = true,
}: Omit<DateFieldProps, keyof RowProps | "defaultValue"> & { value: string | null; onValueChange: (v: string | null) => void }) {
  const f = useFormField()
  const [parts, setParts] = React.useState<DateParts>(() => partsOf(value))
  const order3 = PARTS[order]
  const complete = parts.day.length > 0 && parts.month.length > 0 && parts.year.length === 4
  const real = dateFromParts(parts.day, parts.month, parts.year)

  // Follow the value when it changes from outside (a reset, a new form).
  React.useEffect(() => {
    if (value !== real) setParts(partsOf(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const update = (next: DateParts) => {
    setParts(next)
    const iso = dateFromParts(next.day, next.month, next.year)
    if (iso !== value) onValueChange(iso)
  }

  return (
    <SegmentedInput
      icon={<CalendarIcon aria-hidden data-slot="form-field-icon" className="shrink-0" />}
      invalid={complete && !real}
      separator={() => (
        <span aria-hidden className={sepClass}>
          {order === "ymd" ? "-" : "/"}
        </span>
      )}
      segments={order3.map((part) => ({ key: part, ...PART[part], value: parts[part] }))}
      onSegment={(key, digits) => update({ ...parts, [key]: digits })}
      onStep={(key, dir) => update({ ...parts, [key]: stepDatePart(key as DatePart, parts[key as DatePart], dir, { min, max }) })}
    >
      {picker && <DatePickerButton value={value} min={min} max={max} disabled={f.disabled} onPick={(iso) => update(partsOf(iso))} />}
    </SegmentedInput>
  )
}

/* date picker: days → years → decades (ox_lib's date row, #46) */

type DatePickerView = "days" | "years" | "decades"

/** A page of years: 6 rows of 4. */
const PICKER_YEARS = 24
/** A page of decades: 3 rows of 4. */
const PICKER_DECADES = 12

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

/** "YYYY-MM-DD" of today (local). */
function todayIso(now: Date = new Date()) {
  return dateFromParts(now.getDate(), now.getMonth() + 1, String(now.getFullYear()).padStart(4, "0"))!
}

/**
 * The month a closed picker opens on: the value; else `max` when it is in the past (a birth date),
 * `min` when it is in the future, else today.
 */
function pickerOpening(value: string | null | undefined, min?: string, max?: string, today: string = todayIso()) {
  const base = parseDate(value) ? value! : max && parseDate(max) && max < today ? max : min && parseDate(min) && min > today ? min : today
  const p = parseDate(base)!
  return { year: Number(p.year), month: Number(p.month) }
}

/** The first year of the year page that holds `year` (it sits in the page's fifth row, as in ox_lib). */
function yearPageStart(year: number) {
  return year - 20
}

/** The first year of the decade page above a year page starting at `yearPage`. */
function decadePageStart(yearPage: number) {
  return Math.floor(yearPage / 10) * 10 - 80
}

/** Whether a whole year (or the decade from `year`, with `span` 10) lies outside min/max. */
function yearOutside(year: number, span: number, min?: string, max?: string) {
  const lo = Number(parseDate(min)?.year ?? -Infinity)
  const hi = Number(parseDate(max)?.year ?? Infinity)
  return year + span - 1 < lo || year > hi
}

/** The days of a month view: leading blanks (null) to the first weekday, then each day's ISO date. */
function monthGrid(year: number, month: number) {
  const first = new Date(year, month - 1, 1).getDay()
  const days = daysInMonth(year, month)
  const y = String(year).padStart(4, "0")
  return [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: days }, (_, i) => dateFromParts(i + 1, month, y)!),
  ]
}

/**
 * The calendar button at the end of a date field. The header steps up like ox_lib's picker
 * (Mantine's): click the month title for a page of 24 years, click again for 12 decades; picking a
 * decade, then a year, walks back down to that year's month, and picking a day closes it. Days,
 * years and decades outside min/max are disabled, and the arrows stop at the range. Every cell is
 * a button, so Tab and Enter work all the way. No native date input (Chromium 103).
 */
function DatePickerButton({
  value,
  onPick,
  min,
  max,
  disabled,
}: {
  value: string | null
  onPick: (iso: string) => void
  min?: string
  max?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<DatePickerView>("days")
  const [cursor, setCursor] = React.useState(() => pickerOpening(value, min, max))
  const [page, setPage] = React.useState(0)
  const lo = parseDate(min) ? min! : undefined
  const hi = parseDate(max) ? max! : undefined
  const loYear = lo ? Number(lo.slice(0, 4)) : -Infinity
  const hiYear = hi ? Number(hi.slice(0, 4)) : Infinity
  const monthKey = (y: number, m: number) => y * 12 + m
  const selected = parseDate(value) ? value : null

  const show = (next: boolean) => {
    if (next) {
      setView("days")
      setCursor(pickerOpening(value, min, max))
    }
    setOpen(next)
  }

  const up = () => {
    if (view === "days") {
      setPage(yearPageStart(cursor.year))
      setView("years")
    } else if (view === "years") {
      setPage(decadePageStart(page))
      setView("decades")
    }
  }

  const step = (dir: -1 | 1) => {
    if (view === "days") {
      const k = monthKey(cursor.year, cursor.month - 1) + dir
      setCursor({ year: Math.floor(k / 12), month: (k % 12) + 1 })
    } else setPage(page + dir * (view === "years" ? PICKER_YEARS : PICKER_DECADES * 10))
  }

  const prevOff =
    view === "days"
      ? !!lo && monthKey(cursor.year, cursor.month) <= monthKey(loYear, Number(lo.slice(5, 7)))
      : view === "years"
        ? page <= loYear
        : page <= loYear - 9
  const nextOff =
    view === "days"
      ? !!hi && monthKey(cursor.year, cursor.month) >= monthKey(hiYear, Number(hi.slice(5, 7)))
      : view === "years"
        ? page + PICKER_YEARS - 1 >= hiYear
        : page + PICKER_DECADES * 10 - 1 >= hiYear

  const title =
    view === "days"
      ? `${MONTHS[cursor.month - 1]} ${cursor.year}`
      : view === "years"
        ? `${page} – ${page + PICKER_YEARS - 1}`
        : `${page} – ${page + PICKER_DECADES * 10 - 1}`

  const pickYear = (year: number) => {
    // keep the month, inside min/max
    let next = { year, month: cursor.month }
    if (lo && monthKey(next.year, next.month) < monthKey(loYear, Number(lo.slice(5, 7)))) next = { year: loYear, month: Number(lo.slice(5, 7)) }
    if (hi && monthKey(next.year, next.month) > monthKey(hiYear, Number(hi.slice(5, 7)))) next = { year: hiYear, month: Number(hi.slice(5, 7)) }
    setCursor(next)
    setView("days")
  }

  const cell = (key: string | number, label: React.ReactNode, on: boolean, off: boolean, pick: () => void, aria?: string) => (
    <Button
      key={key}
      type="button"
      variant={on ? "default" : "ghost"}
      disabled={off}
      aria-pressed={on || undefined}
      aria-label={aria}
      onClick={pick}
      className="nk-num h-(--cell-size) px-0 font-normal"
    >
      {label}
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={show}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label="Pick a date"
          data-slot="form-field-date-picker"
          className="ml-auto shrink-0"
        >
          <CalendarIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" data-slot="form-field-date-picker-popover" className="w-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div data-slot="form-field-date-picker-content" data-view={view} className="flex flex-col">
          <div className="flex w-[calc(var(--cell-size)*7)] items-center gap-(--nk-form-field-date-picker-step)">
            <Button type="button" variant="ghost" size="icon" className="size-(--cell-size)" disabled={prevOff} onClick={() => step(-1)} aria-label="Previous">
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              data-slot="form-field-date-picker-title"
              className="h-(--cell-size) flex-1 [font-weight:var(--nk-type-weight-strong)]"
              disabled={view === "decades"}
              onClick={up}
              aria-label={view === "days" ? `${title}: choose a year` : view === "years" ? `${title}: choose a decade` : title}
            >
              {title}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-(--cell-size)" disabled={nextOff} onClick={() => step(1)} aria-label="Next">
              <ChevronRightIcon />
            </Button>
          </div>

          {view === "days" && (
            <div className="grid w-[calc(var(--cell-size)*7)] grid-cols-7" role="grid" aria-label={title}>
              {WEEKDAYS.map((d) => (
                <span key={d} aria-hidden className="nk-caption grid h-(--cell-size) place-items-center">
                  {d}
                </span>
              ))}
              {monthGrid(cursor.year, cursor.month).map((iso, i) =>
                iso === null ? (
                  <span key={`blank-${i}`} aria-hidden />
                ) : (
                  cell(
                    iso,
                    Number(iso.slice(8)),
                    iso === selected,
                    (!!lo && iso < lo) || (!!hi && iso > hi),
                    () => {
                      onPick(iso)
                      setOpen(false)
                    },
                    iso
                  )
                )
              )}
            </div>
          )}

          {view === "years" && (
            <div className="grid w-[calc(var(--cell-size)*7)] grid-cols-4 gap-(--nk-form-field-date-picker-step)" role="grid" aria-label="Years">
              {Array.from({ length: PICKER_YEARS }, (_, i) => page + i).map((y) =>
                cell(y, y, !!selected && Number(selected.slice(0, 4)) === y, y < loYear || y > hiYear, () => pickYear(y))
              )}
            </div>
          )}

          {view === "decades" && (
            <div className="grid w-[calc(var(--cell-size)*7)] grid-cols-4 gap-(--nk-form-field-date-picker-step)" role="grid" aria-label="Decades">
              {Array.from({ length: PICKER_DECADES }, (_, i) => page + i * 10).map((d) =>
                cell(
                  d,
                  `${d}s`,
                  !!selected && Math.floor(Number(selected.slice(0, 4)) / 10) * 10 === d,
                  yearOutside(d, 10, lo, hi),
                  () => {
                    setPage(d)
                    setView("years")
                  }
                )
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* date range */

/** "YYYY-MM-DD" → epoch ms of that day's local midnight (what ox_lib returns), or null. */
function dateToEpoch(iso: string | null | undefined): number | null {
  const p = parseDate(iso)
  return p ? new Date(Number(p.year), Number(p.month) - 1, Number(p.day)).getTime() : null
}

/** Epoch ms → the local "YYYY-MM-DD" it falls on, or null. */
function epochToDate(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null
  const d = new Date(ms)
  return dateFromParts(d.getDate(), d.getMonth() + 1, String(d.getFullYear()).padStart(4, "0"))
}

type DateRange = [number | null, number | null]

type DateRangeFieldProps = RowProps & {
  /** [start, end] as epoch ms of local midnight (ox_lib's date-range shape); null while empty. */
  value?: DateRange
  defaultValue?: DateRange
  onValueChange?: (value: DateRange) => void
  /** "YYYY-MM-DD" bounds. */
  min?: string
  max?: string
  order?: DateOrder
}

function DateRangeField(props: DateRangeFieldProps) {
  const [row, { value, defaultValue = [null, null] as DateRange, onValueChange, ...control }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue, onValueChange)
  return (
    <FormField {...row}>
      <DateRangeControl value={v} onValueChange={setV} {...control} />
    </FormField>
  )
}

const RANGE_PART: Record<DatePart, { length: number; placeholder: string; width: string }> = {
  day: { length: 2, placeholder: "DD", width: "w-5" },
  month: { length: 2, placeholder: "MM", width: "w-6" },
  year: { length: 4, placeholder: "YYYY", width: "w-9" },
}

function DateRangeControl({
  value,
  onValueChange,
  min,
  max,
  order = "dmy",
}: Omit<DateRangeFieldProps, keyof RowProps | "defaultValue"> & { value: DateRange; onValueChange: (v: DateRange) => void }) {
  const fromValue = () => ({ start: partsOf(epochToDate(value[0])), end: partsOf(epochToDate(value[1])) })
  const [parts, setParts] = React.useState(fromValue)
  const order3 = PARTS[order]
  const iso = (p: DateParts) => dateFromParts(p.day, p.month, p.year)
  const full = (p: DateParts) => p.day.length > 0 && p.month.length > 0 && p.year.length === 4
  const s = iso(parts.start)
  const e = iso(parts.end)
  const backwards = !!s && !!e && e < s

  React.useEffect(() => {
    if (dateToEpoch(s) !== value[0] || dateToEpoch(e) !== value[1]) setParts(fromValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value[0], value[1]])

  const update = (next: { start: DateParts; end: DateParts }) => {
    setParts(next)
    const out: DateRange = [dateToEpoch(iso(next.start)), dateToEpoch(iso(next.end))]
    if (out[0] !== value[0] || out[1] !== value[1]) onValueChange(out)
  }
  const side = (key: string) => key.split(":") as ["start" | "end", DatePart]
  const segments = (["start", "end"] as const).flatMap((which) =>
    order3.map((p) => ({
      key: `${which}:${p}`,
      label: `${which === "start" ? "Start" : "End"} ${PART[p].label.toLowerCase()}`,
      ...RANGE_PART[p],
      value: parts[which][p],
    }))
  )

  return (
    <SegmentedInput
      icon={<CalendarIcon aria-hidden data-slot="form-field-icon" className="shrink-0" />}
      dense
      invalid={(full(parts.start) && !s) || (full(parts.end) && !e) || backwards}
      separator={(i) =>
        i === order3.length ? (
          <span aria-hidden className={cn(sepClass, "px-(--nk-space-1)")}>
            –
          </span>
        ) : (
          <span aria-hidden className={sepClass}>
            {order === "ymd" ? "-" : "/"}
          </span>
        )
      }
      segments={segments}
      onSegment={(key, digits) => {
        const [w, p] = side(key)
        update({ ...parts, [w]: { ...parts[w], [p]: digits } })
      }}
      onStep={(key, dir) => {
        const [w, p] = side(key)
        update({ ...parts, [w]: { ...parts[w], [p]: stepDatePart(p, parts[w][p], dir, { min, max }) } })
      }}
    />
  )
}

/* time */

/** "HH:MM" (24h) from hours and minutes, or null when they aren't a real time. */
function timeFromParts(hours: string | number, minutes: string | number): string | null {
  const h = Number(hours)
  const m = Number(minutes)
  if (String(hours) === "" || String(minutes) === "" || !Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/** "HH:MM" → epoch ms of today (or `base`'s day) at that time, seconds 0 (ox_lib's time shape). */
function timeToEpoch(hhmm: string | null | undefined, base: Date = new Date()): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "")
  if (!m || !timeFromParts(m[1]!, m[2]!)) return null
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), Number(m[1]), Number(m[2]), 0, 0).getTime()
}

/** Epoch ms → its local "HH:MM", or null. */
function epochToTime(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return null
  const d = new Date(ms)
  return timeFromParts(d.getHours(), d.getMinutes())
}

/** 24h hour → 12h hour and meridiem, and back. */
function to12(h24: number): { hour: number; pm: boolean } {
  return { hour: h24 % 12 === 0 ? 12 : h24 % 12, pm: h24 >= 12 }
}
function to24(hour12: number, pm: boolean) {
  return (hour12 % 12) + (pm ? 12 : 0)
}

/** One arrow-key press on an hour or minute box, wrapping. */
function stepTimePart(part: "hour" | "minute", text: string, direction: 1 | -1, { twelve = false, minuteStep = 1 } = {}) {
  if (part === "minute") {
    const step = Math.max(1, Math.floor(minuteStep))
    const n = text === "" ? (direction > 0 ? -step : 60) : Number(text)
    const next = (((Math.round(n / step) * step + direction * step) % 60) + 60) % 60
    return String(next).padStart(2, "0")
  }
  if (twelve) {
    const n = text === "" ? (direction > 0 ? 0 : 13) : Number(text)
    return String((((n - 1 + direction) % 12) + 12) % 12 + 1).padStart(2, "0")
  }
  const n = text === "" ? (direction > 0 ? -1 : 24) : Number(text)
  return String((((n + direction) % 24) + 24) % 24).padStart(2, "0")
}

type TimeFieldProps = RowProps & {
  /** Epoch ms of today at the picked time (ox_lib's time shape); null while empty or incomplete. */
  value?: number | null
  defaultValue?: number | null
  onValueChange?: (value: number | null) => void
  /** "12" shows hours 1–12 and an AM/PM toggle; "24" (default) hours 0–23. */
  format?: "12" | "24"
  /** "HH:MM" bounds (24h), for validateField. */
  min?: string
  max?: string
  /** The minute box's arrow-key step. */
  minuteStep?: number
  /** Replaces the clock icon at the start of the box; `null` or `false` for none. */
  icon?: React.ReactNode
  /** A clear button at the end of the box (empties the value), separate from the label row's reset. */
  clearable?: boolean
}

function TimeField(props: TimeFieldProps) {
  const [row, { value, defaultValue = null, onValueChange, ...control }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue, onValueChange)
  return (
    <FormField {...row}>
      <TimeControl value={v} onValueChange={setV} {...control} />
    </FormField>
  )
}

function TimeControl({
  value,
  onValueChange,
  format = "24",
  minuteStep = 1,
  icon,
  clearable = false,
}: Omit<TimeFieldProps, keyof RowProps | "defaultValue"> & { value: number | null; onValueChange: (v: number | null) => void }) {
  const f = useFormField()
  const twelve = format === "12"
  const fromValue = () => {
    const t = epochToTime(value)
    if (!t) return { hour: "", minute: "", pm: false }
    const [h, m] = t.split(":").map(Number) as [number, number]
    if (!twelve) return { hour: String(h).padStart(2, "0"), minute: String(m).padStart(2, "0"), pm: false }
    const x = to12(h)
    return { hour: String(x.hour).padStart(2, "0"), minute: String(m).padStart(2, "0"), pm: x.pm }
  }
  const [parts, setParts] = React.useState(fromValue)
  const hhmm = (p: typeof parts) => {
    if (p.hour === "" || p.minute.length < 2) return null
    const h = Number(p.hour)
    if (twelve && (h < 1 || h > 12)) return null
    return timeFromParts(twelve ? to24(h, p.pm) : h, p.minute)
  }
  const current = hhmm(parts)
  const complete = parts.hour.length === 2 && parts.minute.length === 2

  React.useEffect(() => {
    if (epochToTime(value) !== current) setParts(fromValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const update = (next: typeof parts) => {
    setParts(next)
    const t = hhmm(next)
    const ms = t ? timeToEpoch(t) : null
    if ((ms === null ? null : epochToTime(ms)) !== epochToTime(value)) onValueChange(ms)
  }

  return (
    <SegmentedInput
      icon={
        icon === undefined ? (
          <ClockIcon aria-hidden data-slot="form-field-icon" className="shrink-0" />
        ) : icon === null || icon === false ? undefined : (
          <span aria-hidden data-slot="form-field-icon" className="flex shrink-0">
            {icon}
          </span>
        )
      }
      invalid={complete && !current}
      separator={() => (
        <span aria-hidden className={sepClass}>
          :
        </span>
      )}
      segments={[
        { key: "hour", label: "Hours", placeholder: "HH", length: 2, width: "w-6", value: parts.hour },
        { key: "minute", label: "Minutes", placeholder: "MM", length: 2, width: "w-7", value: parts.minute },
      ]}
      onSegment={(key, digits) => update({ ...parts, [key]: digits })}
      onStep={(key, dir) =>
        update({ ...parts, [key]: stepTimePart(key as "hour" | "minute", parts[key as "hour" | "minute"], dir, { twelve, minuteStep }) })
      }
    >
      {twelve && (
        <button
          type="button"
          data-slot="form-field-meridiem"
          aria-label={parts.pm ? "PM, switch to AM" : "AM, switch to PM"}
          aria-pressed={parts.pm}
          disabled={f.disabled}
          onClick={() => update({ ...parts, pm: !parts.pm })}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key.toLowerCase() === "a" || e.key.toLowerCase() === "p") {
              e.preventDefault()
              const pm = e.key.toLowerCase() === "a" ? false : e.key.toLowerCase() === "p" ? true : !parts.pm
              if (pm !== parts.pm) update({ ...parts, pm })
            }
          }}
          className="nk-num rounded-(--nk-radius-key) outline-none hover:text-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
        >
          {parts.pm ? "PM" : "AM"}
        </button>
      )}
      {clearable && (parts.hour !== "" || parts.minute !== "") && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-slot="form-field-clear"
          aria-label="Clear"
          disabled={f.disabled}
          onClick={() => update({ hour: "", minute: "", pm: parts.pm })}
          className="ml-auto shrink-0"
        >
          <XIcon />
        </Button>
      )}
    </SegmentedInput>
  )
}

/* colour */

type ColorFieldProps = RowProps & {
  /** "#rrggbb", or null while empty or not a colour. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  /** Colours to pick from (game palettes, team colours); the hex input stays for any other. */
  swatches?: readonly string[]
  placeholder?: string
}

function ColorField(props: ColorFieldProps) {
  const [row, { value, defaultValue = null, onValueChange, ...control }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue, onValueChange)
  return (
    <FormField {...row}>
      <ColorControl value={v} onValueChange={setV} {...control} />
    </FormField>
  )
}

function ColorControl({
  value,
  onValueChange,
  swatches,
  placeholder = "#000000", // nuikit-ignore color/hardcoded (placeholder text showing the format, not a drawn colour)
}: Omit<ColorFieldProps, keyof RowProps | "defaultValue"> & { value: string | null; onValueChange: (v: string | null) => void }) {
  const f = useFormField()
  const [text, setText] = React.useState(value ?? "")
  React.useEffect(() => {
    if (normalizeHex(text) !== value) setText(value ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const bad = text.trim() !== "" && !normalizeHex(text)
  const normalized = swatches?.map((s) => normalizeHex(s) ?? s)
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <span
          aria-hidden
          data-slot="form-field-swatch"
          className={cn(
            "pointer-events-none absolute inset-y-0 my-auto rounded-(--nk-radius-key) border border-input",
          )}
          data-empty={!value || undefined}
          // A user's colour, not a theme colour: plain hex, never oklch / color-mix.
          style={value ? { backgroundColor: value } : undefined}
        />
        <Input
          {...controlProps(f)}
          aria-invalid={f.invalid || bad || undefined}
          data-slot="form-field-control"
          disabled={f.disabled}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            const hex = normalizeHex(e.target.value)
            if (hex !== value) onValueChange(hex)
          }}
          onBlur={() => {
            const hex = normalizeHex(text)
            if (hex) setText(hex)
          }}
          data-icon="swatch"
          className="font-mono uppercase placeholder:normal-case"
        />
      </div>
      {normalized && normalized.length > 0 && (
        <div role="group" aria-label="Swatches" data-slot="form-field-swatches" className="flex flex-wrap">
          {normalized.map((s) => {
            const on = s === value
            return (
              <button
                key={s}
                type="button"
                aria-label={s}
                data-slot="form-field-swatch-option"
                aria-pressed={on}
                title={s}
                disabled={f.disabled}
                onClick={() => {
                  setText(s)
                  onValueChange(s)
                }}
                className={cn(
                  "grid place-items-center rounded-(--nk-radius-control) border border-input outline-none hover:bg-accent focus-visible:bg-accent disabled:opacity-50",
                  on && "ring-2 ring-ring ring-offset-1 ring-offset-popover"
                )}
                style={{ backgroundColor: s }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export {
  FormField,
  TextField,
  NumberField,
  SelectField,
  CheckboxField,
  SliderField,
  DateField,
  DateRangeField,
  TimeField,
  ColorField,
  useFormField,
  formFieldVariants,
  validateField,
  parseNumber,
  stepNumber,
  dateFromParts,
  parseDate,
  formatDate,
  stepDatePart,
  pickerOpening,
  yearPageStart,
  decadePageStart,
  monthGrid,
  daysInMonth,
  normalizeHex,
  dateToEpoch,
  epochToDate,
  timeFromParts,
  timeToEpoch,
  epochToTime,
  stepTimePart,
  type FormFieldProps,
  type TextFieldProps,
  type NumberFieldProps,
  type SelectFieldProps,
  type CheckboxFieldProps,
  type SliderFieldProps,
  type DateFieldProps,
  type DateRangeFieldProps,
  type DateRange,
  type TimeFieldProps,
  type ColorFieldProps,
  type FieldOption,
  type FieldKind,
  type FieldRule,
  type FieldIssue,
  type DateOrder,
}
