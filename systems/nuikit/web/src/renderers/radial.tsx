// radial → `radial-menu`, centred. Inline submenus (`items`) open inside the component; ox-style
// ones (`menu: id`) end the intent with reason "submenu" so the script opens the next page. The
// centre, a right-click and Escape go back, or close (a "back" event on a submenu opened by id).
import type { RadialItem, RadialProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useMemo, useRef } from "react";
import { RadialMenu, type RadialMenuItem } from "@/components/ui/radial-menu";
import { Icon } from "@/lib/icon";

function RadialRenderer({ intents, ctx }: RendererProps<"radial">) {
  const top = intents[intents.length - 1];
  const handle = useRef<{ back: () => boolean } | null>(null);
  useEffect(
    () =>
      ctx.onBack(() => {
        const t = ctx.intents().at(-1);
        if (!t) return;
        if (handle.current?.back()) return;
        if (t.props.sub) ctx.emit(t.id, "back", {});
        else ctx.cancel(t.id, "escape");
      }),
    [ctx],
  );
  if (!top) return null;
  return <OneRadial key={top.id} id={top.id} props={top.props} ctx={ctx} handle={handle} />;
}

type Node = RadialMenuItem & { source: RadialItem; path: number[] };

function OneRadial({ id, props, ctx, handle }: { id: string; props: RadialProps; ctx: RendererProps<"radial">["ctx"]; handle: React.MutableRefObject<{ back: () => boolean } | null> }) {
  const items = useMemo(() => toNodes(props.items, []), [props.items]);
  const start = props.option ? findMenu(items, props.option)?.id : undefined;

  const select = (node: RadialMenuItem) => {
    const n = node as Node;
    const result = { index: n.path[n.path.length - 1]!, id: n.source.id ?? String(n.path[n.path.length - 1]), path: n.path, args: n.source.args };
    if (n.source.menu) return ctx.cancel(id, "submenu", { menu: n.source.menu, ...result });
    if (n.source.keepOpen) return ctx.emit(id, "select", result);
    ctx.resolve(id, result);
  };

  return (
    <div data-intent="radial" className="pointer-events-auto absolute inset-0 grid place-items-center">
      <RadialMenu
        ref={handle}
        items={items}
        label={props.label ?? "Actions"}
        size={props.size ?? 320}
        defaultActive={start}
        onSelect={select}
        // Right-click: back out of an inline submenu, else back (sub) or close, as ox's centre does.
        onContextMenu={(e) => {
          e.preventDefault();
          if (handle.current?.back()) return;
          if (props.sub) ctx.emit(id, "back", {});
          else ctx.cancel(id, "close");
        }}
      />
    </div>
  );
}

function toNodes(items: RadialItem[], path: number[]): Node[] {
  return items.map((it, i) => {
    const p = [...path, i + 1];
    return {
      id: `${p.join(".")}`,
      label: it.label,
      description: it.description,
      disabled: it.disabled,
      icon: it.icon ? <Icon icon={it.icon} color={it.iconColor} className="size-5" /> : undefined,
      items: it.items?.length ? toNodes(it.items, p) : undefined,
      source: it,
      path: p,
    };
  });
}

function findMenu(nodes: Node[], menu: string): Node | undefined {
  for (const n of nodes) {
    if (n.source.menu === menu) return n;
    const inner = n.items ? findMenu(n.items as Node[], menu) : undefined;
    if (inner) return inner;
  }
  return undefined;
}

export default defineReactRenderer({ kind: "radial", Component: RadialRenderer, version: 1 });
