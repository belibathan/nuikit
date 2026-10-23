/**
 * ox_lib messages → intents (docs/adapters/ox-lib.md §3, the field mapping). Pure functions: each
 * takes the payload ox_lib's Lua sends (docs/ox-lib-protocol.md) and returns the props the `nuikit`
 * frame draws, checked against packages/core/intents/*.json. Nothing is dropped: what the schema has
 * no field for goes in `meta.ox`. The answers → ox_lib POSTs live with each feature (they own the
 * protocol), with the helpers at the bottom.
 */
import type { ChallengeProps, ConfirmProps, InputField, InputProps, MenuItem, MenuProps, NotifyProps, ProgressProps, PromptProps } from "nuikit-core/intents";
import { parseKeyText } from "@/components/ui/key-prompt";
import { lever } from "@/lib/levers";
import { glyphIcon, splitTitle, TITLE_LEVER } from "@/lib/title";

type Icon = string | [string, string] | undefined;
const icon = (v: unknown): Icon => (typeof v === "string" || Array.isArray(v) ? (v as Icon) : undefined);
const str = (v: unknown): string | undefined => (v === undefined || v === null ? undefined : String(v));
const num = (v: unknown): number | undefined => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
const bool = (v: unknown): boolean | undefined => (v === undefined || v === null ? undefined : Boolean(v));
const anim = (v: unknown) => str(v) as NotifyProps["iconAnimation"];
const pct = (v: unknown): number | undefined => {
  const n = num(v);
  return n === undefined ? undefined : Math.max(0, Math.min(100, n));
};
/** Drop undefined keys: the door validates what is there, and Lua has no undefined. */
const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

// ───────────────────────────────── notify (§3)

/** ox_lib's rule: success, error and warning pick their look; anything else is info. */
export const notifyStatus = (type?: string): NotifyProps["status"] => (type === "success" || type === "error" || type === "warning" ? type : "info");

/** `notify` → `notify`, or null when ox would drop it (no title and no description). */
export function notifyIntent(d: Record<string, any>): NotifyProps | null {
  if (!d || (!d.title && !d.description && !d.item)) return null;
  const item = d.item && typeof d.item === "object" && d.item.name ? clean({ name: String(d.item.name), count: Math.round(num(d.item.count) ?? 0), icon: icon(d.item.icon), image: str(d.item.image) }) : undefined;
  return clean({
    id: d.id !== undefined && d.id !== null ? `n:${String(d.id)}` : undefined,
    title: str(d.title),
    description: str(d.description),
    status: notifyStatus(d.type),
    icon: icon(d.icon),
    iconColor: str(d.iconColor),
    iconAnimation: anim(d.iconAnimation),
    alignIcon: d.alignIcon === "top" || d.alignIcon === "center" ? d.alignIcon : undefined,
    duration: Math.max(0, Math.round(num(d.duration) || 3000)), // ox: a falsy duration means 3000
    showDuration: d.showDuration !== false,
    position: str(d.position) ?? "top-right",
    item,
    style: d.style && typeof d.style === "object" ? d.style : undefined,
    meta: d.type !== undefined ? { ox: { type: d.type } } : undefined,
  }) as NotifyProps;
}

// ───────────────────────────────── context menu (§4) → menu, input "cursor"

/** `showContext` → `menu`. Items keep ox's `Object.entries` order; each row's `id` is the key `clickContext` sends back. */
export function contextIntent(d: Record<string, any>): MenuProps {
  const entries = Object.entries((d.options ?? {}) as Record<string, Record<string, any>>);
  // "🧥 | Clothing": the frame draws icon names, not characters, so the glyph leaves the text (and becomes
  // an icon name where one fits) instead of showing as "🧥 | " in the label. `--ox-title-normalise: 0` keeps titles as written.
  const normalise = lever(TITLE_LEVER, "1") !== "0";
  const items: MenuItem[] = entries.map(([key, o]) => {
    o = o && typeof o === "object" ? o : {};
    const sub = str(o.menu);
    // a missing title on a keyed option shows the key itself (ox)
    const raw = str(o.title) ?? (Number.isNaN(Number(key)) ? key : undefined);
    const split = normalise ? splitTitle(raw) : null;
    return clean({
      id: key,
      label: split ? split.title : raw,
      description: str(o.description),
      icon: icon(o.icon) ?? (split ? glyphIcon(split) : undefined),
      iconColor: str(o.iconColor),
      iconAnimation: anim(o.iconAnimation),
      image: str(o.image),
      progress: pct(o.progress),
      colorScheme: str(o.colorScheme),
      arrow: Boolean(sub || o.arrow) && o.arrow !== false,
      menu: sub,
      metadata: o.metadata && typeof o.metadata === "object" ? o.metadata : undefined,
      disabled: bool(o.disabled),
      readOnly: bool(o.readOnly),
      // ox never closes a context menu on a click: Lua does (hideContext) when the option has an action
      close: sub ? undefined : false,
    }) as MenuItem;
  });
  const head = normalise ? splitTitle(str(d.title)) : null;
  return clean({
    id: "context",
    title: head ? head.title : str(d.title) ?? "",
    icon: head ? glyphIcon(head) : undefined,
    input: "cursor",
    canClose: bool(d.canClose),
    menu: str(d.menu),
    items,
  }) as MenuProps;
}

// ───────────────────────────────── list menu (§5) → menu, input "keyboard"

const isValues = (i: Record<string, any>) => Array.isArray(i.values);

/** `setMenu` → `menu`. */
export function listIntent(d: Record<string, any>): MenuProps {
  const items = (Array.isArray(d.items) ? d.items : []) as Record<string, any>[];
  let start = num(d.startItemIndex) || 0;
  if (start < 0) start = 0;
  if (start >= items.length) start = Math.max(0, items.length - 1);
  return clean({
    id: "menu",
    title: str(d.title) ?? "",
    input: "keyboard",
    position: str(d.position) ?? "top-left",
    canClose: bool(d.canClose),
    startIndex: start + 1,
    items: items.map((it) =>
      clean({
        label: str(it.label),
        icon: icon(it.icon),
        iconColor: str(it.iconColor),
        iconAnimation: anim(it.iconAnimation),
        values: isValues(it) ? it.values.map((v: unknown) => (v && typeof v === "object" ? { label: String((v as any).label ?? ""), description: str((v as any).description) } : String(v))) : undefined,
        defaultIndex: isValues(it) ? Math.max(1, Math.round(num(it.defaultIndex) || 1)) : undefined,
        // precedence as ox: values > checked > progress
        checked: !isValues(it) && it.checked !== undefined ? Boolean(it.checked) : undefined,
        progress: !isValues(it) && it.checked === undefined ? pct(it.progress) : undefined,
        colorScheme: str(it.colorScheme),
        description: str(it.description),
        close: it.close === false ? false : undefined,
      }),
    ) as MenuItem[],
  }) as MenuProps;
}

/** What `changeSelected` carries for a highlighted row (§5.3): [index, value, kind], 0-based. */
export function changeSelectedBody(items: Record<string, any>[], e: { index: number; value?: number; checked?: boolean }): unknown[] {
  const i = e.index - 1;
  const item = items[i] ?? {};
  if (isValues(item)) return [i, (e.value ?? 1) - 1, "isScroll"];
  if (item.checked) return [i, e.checked ?? false, "isCheck"];
  return [i, null, null];
}

/** `confirmSelected` body for a chosen row: [index, scrollIndex | null]. */
export const confirmSelectedBody = (items: Record<string, any>[], e: { index: number; value?: number }): unknown[] => [e.index - 1, isValues(items[e.index - 1] ?? {}) ? (e.value ?? 1) - 1 : null];

// ───────────────────────────────── input dialog (§7) → input

const FIELD_TYPE: Record<string, InputField["type"]> = {
  input: "text",
  textarea: "textarea",
  number: "number",
  checkbox: "checkbox",
  select: "select",
  "multi-select": "multi-select",
  slider: "slider",
  color: "color",
  date: "date",
  "date-range": "date-range",
  time: "time",
};

export type OxRow = Record<string, any> & { type: string };

/** ox normalises a plain string row to an input row; the page does the same before mapping. */
export const normalizeRows = (rows: unknown): OxRow[] => (Array.isArray(rows) ? rows : []).map((r) => (typeof r === "string" ? { type: "input", label: r } : r && typeof r === "object" ? (r as OxRow) : { type: "input" }));

/** `openDialog` → `input`. Dates come back as epoch ms (`returnString` is applied by the page, with ox's dayjs format). */
export function inputIntent(d: Record<string, any>, rows: OxRow[]): InputProps {
  const o = (d.options ?? {}) as Record<string, any>;
  return clean({
    id: "input",
    title: str(d.heading) ?? "",
    size: str(o.size) ?? "xs",
    allowCancel: bool(o.allowCancel),
    fields: rows.map((r) =>
      clean({
        type: FIELD_TYPE[r.type] ?? "text",
        label: str(r.label),
        description: str(r.description),
        placeholder: str(r.placeholder),
        icon: icon(r.icon),
        disabled: bool(r.disabled),
        required: bool(r.required),
        default: r.default,
        password: bool(r.password),
        min: typeof r.min === "number" || typeof r.min === "string" ? r.min : undefined,
        max: typeof r.max === "number" || typeof r.max === "string" ? r.max : undefined,
        step: num(r.step),
        precision: num(r.precision),
        minLength: num(r.minLength),
        maxLength: num(r.maxLength),
        autosize: bool(r.autosize),
        options: Array.isArray(r.options) ? r.options.map((x: any) => (x && typeof x === "object" ? clean({ value: String(x.value), label: str(x.label) }) : { value: String(x) })) : undefined,
        clearable: bool(r.clearable),
        searchable: bool(r.searchable),
        maxSelected: num(r.maxSelectedValues),
        checked: bool(r.checked),
        format: str(r.format),
        // the frame returns epoch ms; the page formats with dayjs when ox's returnString is set
        returnString: undefined,
      }),
    ) as InputField[],
  }) as InputProps;
}

// ───────────────────────────────── alert (§8) → confirm

/** `sendAlert` → `confirm`. ox's defaults (not centred, no cancel) are stated, since the intent's differ. */
export function alertIntent(d: Record<string, any>): ConfirmProps {
  const labels = d.labels && typeof d.labels === "object" ? clean({ confirm: str(d.labels.confirm), cancel: str(d.labels.cancel) }) : undefined;
  return clean({
    id: "alert",
    title: str(d.header) ?? "",
    description: str(d.content),
    size: str(d.size) ?? "md",
    centered: Boolean(d.centered),
    cancel: Boolean(d.cancel),
    labels,
    meta: d.overflow !== undefined ? { ox: { overflow: d.overflow } } : undefined,
  }) as ConfirmProps;
}

// ───────────────────────────────── progress bar / circle (§9) → progress

/**
 * `progress` / `circleProgress` → `progress`. Cancelling stays with ox's Lua (its X key → progressCancel),
 * so `cancel` is always false here: nuikit's own X key must not end a run ox's Lua is still timing. The
 * nuikit extension `canCancel` (the key chip) travels in `meta.ox`.
 */
export function progressIntent(d: Record<string, any>, style: "bar" | "ring"): ProgressProps {
  return clean({
    id: "progress",
    label: str(d.label),
    duration: Math.max(1, Math.round(num(d.duration) || 0)),
    style,
    position: style === "ring" && d.position !== "bottom" ? "center" : "bottom",
    cancel: false,
    showPercent: style === "ring",
    meta: d.canCancel !== undefined ? { ox: { canCancel: d.canCancel } } : undefined,
  }) as ProgressProps;
}

// ───────────────────────────────── text UI (§11) → prompt

/** CSS text ("color: red; font-size: 12px") to a style object. ox_lib's own UI crashes on this. */
export function parseStyle(style: unknown): Record<string, string> | undefined {
  if (!style) return undefined;
  if (typeof style !== "string") return typeof style === "object" ? (style as Record<string, string>) : undefined;
  const out: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (prop) out[prop] = decl.slice(i + 1).trim();
  }
  return out;
}

/** `textUi` → `prompt`. "[E] - Open garage" becomes keys + label; text without a leading key is the label whole. */
export function textUiIntent(d: Record<string, any>): PromptProps {
  const text = String(d.text ?? "");
  const parsed = parseKeyText(text);
  return clean({
    id: "textui",
    label: parsed.keys.length ? parsed.label : text,
    keys: parsed.keys.length ? parsed.keys : undefined,
    icon: icon(d.icon),
    iconColor: str(d.iconColor),
    iconAnimation: anim(d.iconAnimation),
    position: str(d.position) ?? "bottom-center",
    style: parseStyle(d.style),
    meta: d.alignIcon !== undefined ? { ox: { alignIcon: d.alignIcon } } : undefined,
  }) as PromptProps;
}

// ───────────────────────────────── skill check (§10) → challenge

/** `startSkillCheck` → `challenge`. */
export function skillCheckIntent(d: Record<string, any>): ChallengeProps {
  return clean({
    id: "skill",
    difficulty: d.difficulty ?? "easy",
    keys: Array.isArray(d.inputs) && d.inputs.length ? d.inputs.map((k: unknown) => String(k)) : undefined,
  }) as ChallengeProps;
}

/**
 * The frame's input result for ox: `byId` ("1".."n") is read instead of `values`, because an array with
 * `null` entries crosses Lua as a table with holes. A date range comes back the same way; it is padded.
 */
export function inputValues(answer: { result?: unknown }, rows: OxRow[]): unknown[] {
  const r = (answer.result ?? {}) as { values?: unknown; byId?: Record<string, unknown> };
  const byId = r.byId && typeof r.byId === "object" ? r.byId : {};
  const values = Array.isArray(r.values) ? r.values : [];
  return rows.map((row, i) => {
    let v = byId[String(i + 1)] ?? values[i] ?? null;
    if (row.type === "date-range") {
      const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
      v = Array.isArray(v) ? [v[0] ?? null, v[1] ?? null] : [o["1"] ?? null, o["2"] ?? null];
    }
    return v;
  });
}
