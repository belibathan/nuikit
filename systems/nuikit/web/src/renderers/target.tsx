// target → an eye at the centre of the screen and, when `open`, a list of `menu-row`s beside it
// (first row on the eye's line, nk-first-row). The targeting library owns the raycast: it opens
// this with the options it found, updates them as the crosshair moves, and sets `open` when the
// player presses its key.
import { EyeIcon } from "@/components/ui/icons";
import type { TargetOption, TargetProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useState } from "react";
import { MenuRow, MenuRowList } from "@/components/ui/menu-row";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { cn } from "@/lib/utils";

function TargetRenderer({ intents, ctx }: RendererProps<"target">) {
  const top = intents[intents.length - 1];
  useEffect(
    () =>
      ctx.onBack(() => {
        const t = ctx.intents().at(-1);
        if (t) ctx.cancel(t.id, "escape");
      }),
    [ctx],
  );
  if (!top) return null;
  return <OneTarget key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

function OneTarget({ id, props, ctx }: { id: string; props: TargetProps; ctx: RendererProps<"target">["ctx"] }) {
  const [path, setPath] = useState<number[]>([]);
  const level: TargetOption[] = path.reduce<TargetOption[]>((items, i) => items[i]?.items ?? [], props.options ?? []);
  useEffect(() => setPath([]), [props.options]);
  const open = props.open === true && level.length > 0;

  const choose = (i: number) => {
    const o = level[i];
    if (!o || o.disabled) return;
    if (o.items?.length) return setPath([...path, i]);
    ctx.resolve(id, { index: i + 1, id: o.id ?? String(i + 1), path: [...path, i + 1], args: o.args });
  };

  return (
    <div data-intent="target" data-active={props.active || undefined} data-open={open || undefined} data-success={props.success || undefined} className="absolute inset-0">
      {props.eye !== false && (
        <div aria-hidden className="absolute top-1/2 left-1/2 -mt-3 -ml-3 grid size-6 place-items-center">
          <EyeIcon className={cn("nk-shadow size-5 text-(color:--hud-foreground) opacity-60", (props.active || open) && "opacity-100", open && "text-primary", props.success && "text-(color:--success)")} />
        </div>
      )}
      {open && (
        <div className="pointer-events-auto absolute top-1/2 left-1/2 ml-6">
          <Panel size="sm" className="nk-first-row nk-enter">
            {(props.title || path.length > 0) && <PanelHeader title={<Text>{path.length ? level === props.options ? props.title : crumbLabel(props.options ?? [], path) : props.title}</Text>} />}
            <PanelBody>
              {/* one Selection per list: it slides between options under the pointer; a new level starts its own */}
              <MenuRowList key={path.join(".")} active={level.findIndex((o) => o.active)}>
                {level.map((o, i) => (
                  <MenuRow
                    key={i}
                    disabled={o.disabled}
                    active={o.active}
                    icon={<Icon icon={o.icon} color={o.iconColor} fallback={<span className="size-4" />} />}
                    description={o.description ? <Text>{o.description}</Text> : undefined}
                    chevron={!!o.items?.length}
                    onClick={() => choose(i)}
                    onMouseEnter={() => ctx.emit(id, "hover", { index: i + 1, id: o.id ?? String(i + 1) })}
                  >
                    <Text>{o.label}</Text>
                  </MenuRow>
                ))}
              </MenuRowList>
            </PanelBody>
          </Panel>
        </div>
      )}
    </div>
  );
}

function crumbLabel(options: TargetOption[], path: number[]) {
  return path.reduce<{ items: TargetOption[]; label?: string }>((acc, i) => (acc.items[i] ? { items: acc.items[i]!.items ?? [], label: acc.items[i]!.label } : acc), { items: options }).label;
}

export default defineReactRenderer({ kind: "target", Component: TargetRenderer, version: 1 });
