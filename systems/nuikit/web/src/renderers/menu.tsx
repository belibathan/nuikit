// menu → `panel` + `menu-row`. The newest menu is the one drawn (one at a time, like every library
// does). Mouse and keyboard both work; `input: "keyboard"` is ox's list menu (arrows, Enter,
// Backspace), `input: "cursor"` is ox's context menu. Inline submenus (`items`) open in place;
// ox-style submenus (`menu: id`) end the intent with reason "submenu" and the script opens the next.
import { ChevronLeftIcon, XIcon } from "lucide-react";
import type { MenuItem, MenuProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxField, NumberField, SelectField, SliderField, TextField } from "@/components/ui/form-field";
import { MenuRow, MenuRowDetails, MenuRowList, menuMetadata } from "@/components/ui/menu-row";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ANCHOR_CLASS, anchor } from "@/lib/anchor";
import { Icon } from "@/lib/icon";
import { Text, plain } from "@/lib/text";
import { cn } from "@/lib/utils";

function MenuRenderer({ intents, ctx }: RendererProps<"menu">) {
  const top = intents[intents.length - 1];
  useEffect(
    () =>
      ctx.onBack(() => {
        const t = ctx.intents().at(-1);
        if (!t || t.props.canClose === false || t.props.dismissable === false) return;
        ctx.cancel(t.id, "escape");
      }),
    [ctx],
  );
  if (!top) return null;
  return <OneMenu key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

function OneMenu({ id, props, ctx }: { id: string; props: MenuProps; ctx: RendererProps<"menu">["ctx"] }) {
  const keyboard = props.input === "keyboard";
  const cursor = props.input === "cursor";
  const [path, setPath] = useState<number[]>([]);
  const level: MenuItem[] = useMemo(() => path.reduce<MenuItem[]>((items, i) => items[i]?.items ?? [], props.items), [path, props.items]);
  const [active, setActive] = useState<number>(() => clamp((props.startIndex ?? 1) - 1, level.length));
  // the arrows drive the highlight in every mode (a full menu has no focused row, so keys are heard on the window)
  const [driven, setDriven] = useState(false);
  const [steps, setSteps] = useState<Record<number, number>>({});
  const [checks, setChecks] = useState<Record<number, boolean>>({});
  // Inline fields (esx_context inputs, esx_menu_default sliders): values by item id, kept across updates.
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const fieldId = (i: number, item: MenuItem) => item.id ?? String(i + 1);
  const fieldValues = () => {
    const out: Record<string, unknown> = {};
    level.forEach((item, i) => {
      if (item.field) out[fieldId(i, item)] = fields[fieldId(i, item)] ?? item.field.default ?? (item.field.type === "checkbox" ? false : item.field.type === "slider" ? (item.field.min ?? 0) : item.field.type === "number" ? null : "");
    });
    return out;
  };
  const list = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<number, HTMLElement>());
  const [hover, setHover] = useState<{ index: number; top: number } | null>(null);

  // Highlight follows the keyboard; the script hears about it (ox onSelected / changeSelected).
  useEffect(() => {
    if (!keyboard && !hover && !driven) return;
    const item = level[active];
    if (!item) return;
    ctx.emit(id, "change", { index: active + 1, id: item.id ?? String(active + 1), value: stepOf(item, steps[active]), checked: checks[active] ?? item.checked, path: [...path, active + 1], fields: fieldValues() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    rows.current.get(active)?.scrollIntoView({ block: "nearest" });
    if (keyboard) rows.current.get(active)?.focus({ preventScroll: true });
  }, [active, keyboard, level]);

  const result = (index: number, item: MenuItem) => ({
    index: index + 1,
    id: item.id ?? String(index + 1),
    value: stepOf(item, steps[index]),
    checked: checks[index] ?? item.checked,
    path: [...path, index + 1],
    args: item.args,
    fields: fieldValues(),
  });

  const choose = (index: number) => {
    const item = level[index];
    if (!item || item.disabled || item.readOnly || item.kind === "header" || props.focus === false) return;
    if (item.items?.length) {
      setPath([...path, index]);
      setActive(0);
      setHover(null);
      return;
    }
    if (item.menu) return ctx.cancel(id, "submenu", { menu: item.menu, ...result(index, item) });
    if (item.checked !== undefined && !item.values) return toggle(index);
    if (item.close === false) return ctx.emit(id, "select", result(index, item));
    ctx.resolve(id, result(index, item));
  };

  const toggle = (index: number) => {
    const item = level[index]!;
    const next = !(checks[index] ?? item.checked);
    setChecks((c) => ({ ...c, [index]: next }));
    ctx.emit(id, "check", { index: index + 1, id: item.id ?? String(index + 1), checked: next, path: [...path, index + 1] });
  };

  const step = (index: number, dir: -1 | 1) => {
    const item = level[index];
    if (!item?.values?.length) return;
    const n = item.values.length;
    const cur = (steps[index] ?? (item.defaultIndex ?? 1) - 1) % n;
    const next = (cur + dir + n) % n;
    setSteps((s) => ({ ...s, [index]: next }));
    ctx.emit(id, "scroll", { index: index + 1, id: item.id ?? String(index + 1), value: next + 1, path: [...path, index + 1] });
  };

  const back = () => {
    if (path.length) {
      const parent = path[path.length - 1]!;
      setPath(path.slice(0, -1));
      setActive(parent);
      return;
    }
    if (props.menu) ctx.cancel(id, "back", { menu: props.menu });
  };

  const close = () => {
    if (props.canClose === false || props.dismissable === false) return;
    ctx.cancel(id, "close");
  };

  const onKey = (e: React.KeyboardEvent) => {
    const n = level.length;
    if (!n || e.defaultPrevented) return; // a row handled it (checkbox Enter, stepper arrows)
    const move = (d: 1 | -1) => {
      let i = active;
      for (let k = 0; k < n; k++) {
        i = (i + d + n) % n;
        if (!level[i]?.readOnly && level[i]?.kind !== "header") break;
      }
      setActive(i);
      setDriven(true);
    };
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        return move(1);
      case "ArrowUp":
        e.preventDefault();
        return move(-1);
      case "ArrowRight":
        e.preventDefault();
        return step(active, 1);
      case "ArrowLeft":
        e.preventDefault();
        return step(active, -1);
      case "Enter":
      case " ":
        e.preventDefault();
        return choose(active);
      case "Backspace":
        e.preventDefault();
        if (path.length || props.menu) return back();
        return close();
    }
  };

  const keys = useRef(onKey);
  keys.current = onKey;
  const drivenRef = useRef(false);
  drivenRef.current = driven || hover !== null;
  useEffect(() => {
    if (keyboard || props.focus === false) return; // keyboard menus focus their rows; a preview takes no keys
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable]")) return;
      // Enter / Space / Backspace act on a row the player has pointed at or arrowed to, never on the untouched start row
      if (!drivenRef.current && !e.key.startsWith("Arrow")) return;
      keys.current(e as unknown as React.KeyboardEvent);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [keyboard, props.focus]);

  const place = anchor(props.position, keyboard ? "top-left" : cursor ? "top-right" : "top-right");
  const hovered = hover !== null ? level[hover.index] : undefined;
  const details = hovered && !hovered.disabled && (hovered.metadata || hovered.image) ? hovered : undefined;
  // Inside an inline submenu the header shows that item's label.
  const crumb = path.reduce<{ items: MenuItem[]; label?: string }>((acc, i) => (acc.items[i] ? { items: acc.items[i]!.items ?? [], label: acc.items[i]!.label } : acc), { items: props.items, label: props.title });
  const title = crumb.label ?? props.title;

  return (
    <div
      data-intent="menu"
      data-input={props.input ?? "full"}
      data-focus={props.focus === false ? "false" : undefined}
      className={cn(props.focus === false ? "pointer-events-none" : "pointer-events-auto", ANCHOR_CLASS[place], place === "top-right" && !keyboard && "top-[15%]! right-[25%]!")}
      onKeyDown={onKey}
    >
      <div className="relative flex items-start gap-2">
        {details && hover && (
          <MenuRowDetails
            className="absolute right-full mr-2"
            style={{ top: hover.top }}
            image={details.image}
            title={details.metadata && details.image ? plain(details.label) : undefined}
            items={menuMetadata(details.metadata)}
          />
        )}
        <Panel size={keyboard ? "lg" : "default"} className="max-h-[36rem]">
          <PanelHeader
            icon={props.icon ? <Icon icon={props.icon} /> : undefined}
            title={<Text>{title}</Text>}
            description={path.length ? undefined : props.description ? <Text>{props.description}</Text> : undefined}
            actions={
              <>
                {(path.length > 0 || props.menu) && (
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={back} aria-label="Back">
                    <ChevronLeftIcon />
                  </Button>
                )}
                {props.canClose !== false && !keyboard && (
                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={close} aria-label="Close">
                    <XIcon />
                  </Button>
                )}
              </>
            }
          />
          <PanelBody ref={list} scroll onScroll={() => setHover(null)}>
            {/* one tile per menu: it slides to the lit row (hover, keys, the script's startIndex) instead of each row lighting itself */}
            <MenuRowList active={keyboard || driven || hover ? rowOrdinal(level, active) : null}>
              {level.map((item, i) => {
                if (!item.label && !item.description && !item.icon && !item.field) return null; // ox: no label, no row (the index still counts)
                if (item.kind === "header")
                  return (
                    <div key={i} data-slot="menu-header" className="nk-caption px-3 pt-3 pb-1 text-muted-foreground first:pt-1">
                      <Text>{item.label}</Text>
                    </div>
                  );
                if (item.field)
                  return (
                    <div key={i} data-slot="menu-field" className="px-3 py-1.5">
                      <InlineField field={item.field} label={item.label} value={fields[fieldId(i, item)]} onChange={(v) => {
                        setFields((all) => ({ ...all, [fieldId(i, item)]: v }));
                        ctx.emit(id, "field", { index: i + 1, id: fieldId(i, item), value: v });
                      }} />
                    </div>
                  );
                const isStep = !!item.values?.length;
                const stepIndex = (steps[i] ?? (item.defaultIndex ?? 1) - 1) % Math.max(1, item.values?.length ?? 1);
                const stepValue = item.values?.[stepIndex];
                const checked = isStep ? undefined : (checks[i] ?? item.checked);
                const hasMore = !!(item.items?.length || item.menu);
                return (
                  <MenuRow
                    key={i}
                    ref={(el) => {
                      if (el) rows.current.set(i, el);
                      else rows.current.delete(i);
                    }}
                    active={(keyboard || driven) && i === active}
                    disabled={item.disabled}
                    readOnly={item.readOnly || props.focus === false}
                    icon={item.icon ? <Icon icon={item.icon} color={item.iconColor} animation={item.iconAnimation} /> : undefined}
                    description={item.description ? <Text>{item.description}</Text> : undefined}
                    progress={item.progress}
                    progressColor={item.colorScheme}
                    meta={item.meta}
                    kbd={item.kbd}
                    chevron={item.arrow ?? hasMore}
                    checked={checked}
                    onCheckedChange={checked !== undefined ? () => toggle(i) : undefined}
                    value={isStep ? (typeof stepValue === "string" ? stepValue : stepValue?.label) : undefined}
                    onStep={isStep ? (d) => step(i, d) : undefined}
                    onClick={checked !== undefined ? undefined : () => choose(i)}
                    onMouseEnter={(e) => {
                      if (item.readOnly || item.disabled) return;
                      setActive(i);
                      setHover({ index: i, top: e.currentTarget.getBoundingClientRect().top - (list.current?.getBoundingClientRect().top ?? 0) + (list.current?.scrollTop ?? 0) });
                    }}
                    onMouseLeave={() => setHover((h) => (h?.index === i ? null : h))}
                    tabIndex={keyboard ? (i === active ? 0 : -1) : undefined}
                  >
                    <Text>{item.label}</Text>
                  </MenuRow>
                );
              })}
            </MenuRowList>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

type Field = NonNullable<MenuItem["field"]>;

/** One control in a row: text, number, select, slider or checkbox. */
function InlineField({ field: f, label, value, onChange }: { field: Field; label?: string; value: unknown; onChange: (v: unknown) => void }) {
  const row = { label: label ? <Text>{label}</Text> : undefined };
  switch (f.type) {
    case "number":
      return <NumberField {...row} value={(value as number | null) ?? (typeof f.default === "number" ? f.default : null)} onValueChange={onChange} min={f.min} max={f.max} step={f.step} placeholder={f.placeholder} />;
    case "select":
      return <SelectField {...row} options={(f.options ?? []).map((o) => ({ value: o.value, label: o.label ?? o.value }))} value={(value as string | null) ?? (typeof f.default === "string" ? f.default : null)} onValueChange={onChange} placeholder={f.placeholder} />;
    case "slider":
      return <SliderField {...row} value={(value as number) ?? (typeof f.default === "number" ? f.default : (f.min ?? 0))} onValueChange={onChange} min={f.min ?? 0} max={f.max ?? 100} step={f.step ?? 1} />;
    case "checkbox":
      return <CheckboxField {...row} checked={(value as boolean) ?? f.default === true} onCheckedChange={onChange} />;
    default:
      return <TextField {...row} value={(value as string) ?? (typeof f.default === "string" ? f.default : "")} onValueChange={onChange} placeholder={f.placeholder} />;
  }
}

/** A row's index among the rendered MenuRows (headers, fields and label-less items draw no row). */
function rowOrdinal(level: MenuItem[], index: number) {
  const isRow = (item: MenuItem) => item.kind !== "header" && !item.field && !!(item.label || item.description || item.icon);
  if (!level[index] || !isRow(level[index]!)) return null;
  return level.slice(0, index).filter(isRow).length;
}

function clamp(i: number, n: number) {
  return Math.max(0, Math.min(i, Math.max(0, n - 1)));
}

function stepOf(item: MenuItem, current: number | undefined) {
  if (!item.values?.length) return undefined;
  return ((current ?? (item.defaultIndex ?? 1) - 1) % item.values.length) + 1;
}

export default defineReactRenderer({ kind: "menu", Component: MenuRenderer, version: 1 });
