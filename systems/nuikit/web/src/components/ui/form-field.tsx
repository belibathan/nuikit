"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CalendarIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, MinusIcon, PlusIcon, RotateCcwIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
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
      horizontal: "flex flex-col gap-1.5",
      /** Label, then the control at the end of the row (switches). */
      "inline-end": "flex flex-col gap-1.5",
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

  const row = orientation !== "vertical"
  const labelEl = label !== undefined && (
    <Label
      htmlFor={fid}
      id={`${fid}-label`}
      data-slot="form-field-label"
      className={cn(
        "min-w-0 gap-1",
        row ? "text-sm leading-5 font-medium" : "text-xs leading-4",
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
    <span data-slot="form-field-hint" className={cn("truncate text-xs leading-4 text-muted-foreground", row && "font-normal")}>
      {hint}
    </span>
  )
  const end = (onReset || (valueText !== undefined && valueText !== null)) && (
    <span className="ml-auto flex shrink-0 items-center gap-1">
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
        <span data-slot="form-field-value" className="nk-num text-xs leading-4 font-medium text-muted-foreground">
          {valueText}
        </span>
      )}
    </span>
  )
  const below = invalid ? (
    <p id={errId} data-slot="form-field-error" role="alert" className={cn("text-xs leading-4 text-destructive", orientation === "horizontal" && "pl-6")}>
      {error}
    </p>
  ) : description ? (
    <p id={descId} data-slot="form-field-description" className={cn("text-xs leading-4 text-muted-foreground", orientation === "horizontal" && "pl-6")}>
      {description}
    </p>
  ) : null

  return (
    <FormFieldContext.Provider value={ctx}>
      <div
        data-slot="form-field"
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
          <div className="flex min-h-6 min-w-0 items-center gap-2">
            {children}
            {labelEl}
            {hintEl}
            {end}
          </div>
        ) : (
          <div className="flex min-h-6 min-w-0 items-center gap-2">
            {labelEl}
            {hintEl}
            <span className="ml-auto flex shrink-0 items-center gap-2">
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

type FieldKind = "text" | "number" | "select" | "checkbox" | "slider" | "date" | "color"

type FieldRule = {
  kind: FieldKind
  required?: boolean
  /** number, slider: a value; date: "YYYY-MM-DD". */
  min?: number | string
  max?: number | string
  /** text: characters. */
  minLength?: number
  maxLength?: number
  dateOrder?: DateOrder
}

type FieldIssue = {
  code: "required" | "min" | "max" | "minLength" | "maxLength" | "invalid"
  message: string
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

/**
 * What's wrong with a value, in one sentence-case message, or null. Empty values only fail
 * `required`; the other rules apply to what's there.
 */
function validateField(rule: FieldRule, value: unknown): FieldIssue | null {
  const empty = rule.kind === "checkbox" ? value !== true : isEmpty(value)
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
      <Textarea
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
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
          {icon}
        </span>
      )}
      <Input
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
        className={cn(icon && "pl-9", password && "pr-10", inputProps?.className)}
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
          className="absolute inset-y-0 right-1.5 my-auto text-muted-foreground"
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
  /** − and + buttons beside the input (default true). */
  stepper?: boolean
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
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative min-w-0 flex-1">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
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
          className={cn("nk-num [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none", icon && "pl-9")}
        />
      </div>
      {stepper && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Decrease"
            disabled={f.disabled || (min !== undefined && value !== null && value <= min)}
            onClick={() => press(-1)}
          >
            <MinusIcon />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Increase"
            disabled={f.disabled || (max !== undefined && value !== null && value >= max)}
            onClick={() => press(1)}
          >
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
    <div className="flex items-center gap-1.5">
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
    <div className="flex items-center gap-1.5">
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
                    "flex min-h-8 items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground",
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
  min?: number
  max?: number
  step?: number
  /** Shows a reset button that sets this value (disabled while the value is already it). */
  resetTo?: number
  /** The value in the label row; false hides it. Default: the number. */
  format?: ((value: number) => React.ReactNode) | false
}

function SliderField(props: SliderFieldProps) {
  const [row, { value, defaultValue, onValueChange, min = 0, max = 100, step = 1, resetTo, format }] = rowProps(props)
  const [v, setV] = useControllable(value, defaultValue ?? min, onValueChange)
  const shown = format === false ? undefined : format ? format(v) : String(roundTo(v, decimals(step)))
  return (
    <FormField
      {...row}
      valueText={row.valueText ?? shown}
      onReset={row.onReset ?? (resetTo !== undefined ? () => setV(resetTo) : undefined)}
      resetDisabled={resetTo !== undefined && v === resetTo}
    >
      <SliderControl value={v} onValueChange={setV} min={min} max={max} step={step} />
    </FormField>
  )
}

function SliderControl({
  value,
  onValueChange,
  min,
  max,
  step,
}: {
  value: number
  onValueChange: (v: number) => void
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

function DateControl({
  value,
  onValueChange,
  min,
  max,
  order = "dmy",
}: Omit<DateFieldProps, keyof RowProps | "defaultValue"> & { value: string | null; onValueChange: (v: string | null) => void }) {
  const f = useFormField()
  const fromValue = () => {
    const p = parseDate(value)
    return { day: p?.day ?? "", month: p?.month ?? "", year: p?.year ?? "" }
  }
  const [parts, setParts] = React.useState<Record<DatePart, string>>(fromValue)
  const refs = React.useRef<Partial<Record<DatePart, HTMLInputElement | null>>>({})
  const order3 = PARTS[order]
  const complete = parts.day.length > 0 && parts.month.length > 0 && parts.year.length === 4
  const real = dateFromParts(parts.day, parts.month, parts.year)

  // Follow the value when it changes from outside (a reset, a new form).
  React.useEffect(() => {
    if (value !== real) setParts(fromValue())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const update = (next: Record<DatePart, string>) => {
    setParts(next)
    const iso = dateFromParts(next.day, next.month, next.year)
    if (iso !== value) onValueChange(iso)
  }
  const focus = (i: number) => {
    const el = refs.current[order3[i]!]
    el?.focus()
    el?.select()
  }

  return (
    <div
      role="group"
      data-slot="form-field-control"
      aria-labelledby={f.labelId}
      aria-describedby={f.describedBy}
      aria-invalid={f.invalid || (complete && !real) || undefined}
      data-disabled={f.disabled || undefined}
      className={cn(
        "flex h-9 w-full min-w-0 items-center gap-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) focus(order3.findIndex((p) => parts[p] === "") >= 0 ? order3.findIndex((p) => parts[p] === "") : 0)
      }}
    >
      <CalendarIcon aria-hidden className="mr-1 size-4 shrink-0 text-muted-foreground" />
      {order3.map((part, i) => (
        <React.Fragment key={part}>
          {i > 0 && (
            <span aria-hidden className="text-muted-foreground">
              {order === "ymd" ? "-" : "/"}
            </span>
          )}
          <input
            ref={(el) => {
              refs.current[part] = el
            }}
            id={i === 0 ? f.id : undefined}
            aria-label={PART[part].label}
            aria-required={f.required || undefined}
            aria-invalid={f.invalid || (complete && !real) || undefined}
            disabled={f.disabled}
            inputMode="numeric"
            autoComplete="off"
            maxLength={PART[part].length}
            placeholder={PART[part].placeholder}
            value={parts[part]}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, PART[part].length)
              update({ ...parts, [part]: digits })
              if (digits.length === PART[part].length && i < order3.length - 1) focus(i + 1)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault()
                update({ ...parts, [part]: stepDatePart(part, parts[part], e.key === "ArrowUp" ? 1 : -1, { min, max }) })
              } else if (e.key === "Backspace" && parts[part] === "" && i > 0) {
                e.preventDefault()
                focus(i - 1)
              } else if ((e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0 && i > 0) || (e.key === "/" && i > 0)) {
                e.preventDefault()
                focus(e.key === "/" ? Math.min(i + 1, order3.length - 1) : i - 1)
              } else if (e.key === "ArrowRight" && e.currentTarget.selectionEnd === parts[part].length && i < order3.length - 1) {
                e.preventDefault()
                focus(i + 1)
              }
            }}
            className={cn(
              "nk-num bg-transparent text-center outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
              PART[part].width
            )}
          />
        </React.Fragment>
      ))}
    </div>
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
            "pointer-events-none absolute inset-y-0 left-2.5 my-auto size-5 rounded-sm border border-input",
            !value && "bg-[repeating-linear-gradient(135deg,transparent_0_3px,var(--border)_3px_5px)]"
          )}
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
          className="pl-10 font-mono uppercase placeholder:normal-case"
        />
      </div>
      {normalized && normalized.length > 0 && (
        <div role="group" aria-label="Swatches" className="flex flex-wrap gap-1.5">
          {normalized.map((s) => {
            const on = s === value
            return (
              <button
                key={s}
                type="button"
                aria-label={s}
                aria-pressed={on}
                title={s}
                disabled={f.disabled}
                onClick={() => {
                  setText(s)
                  onValueChange(s)
                }}
                className={cn(
                  "grid size-6 place-items-center rounded-md border border-input outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
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
  daysInMonth,
  normalizeHex,
  type FormFieldProps,
  type TextFieldProps,
  type NumberFieldProps,
  type SelectFieldProps,
  type CheckboxFieldProps,
  type SliderFieldProps,
  type DateFieldProps,
  type ColorFieldProps,
  type FieldOption,
  type FieldKind,
  type FieldRule,
  type FieldIssue,
  type DateOrder,
}
