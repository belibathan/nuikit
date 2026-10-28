import { CheckIcon, XIcon } from "@/components/ui/icons";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import Markdown from "react-markdown";
import { ItemImage, Meter } from "@/components/item-image";
import { useT } from "@/lib/locale";
import type { Slot } from "@/lib/types";
import { Items, formatWeight, hasIngredient, hasItem, inv, itemImage, sideInventory } from "@/state/inventory";
import { onPointerMove, pointer, ui } from "@/state/ui";

/** One fact about the item: plain label left, value right. */
function Row({ k, children, wrap }: { k: string; children: ReactNode; wrap?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-(length:--nk-text-label) leading-4">
      <span className="shrink-0 text-muted-foreground">{k}</span>
      <span className={wrap ? "min-w-0 text-right [font-weight:var(--nk-type-weight-strong)]" : "nk-num min-w-0 truncate text-right"}>{children}</span>
    </div>
  );
}

function Ingredients({ item }: { item: Slot }) {
  const entries = Object.entries(item.ingredients ?? {}).sort((a, b) => Number(a[1]) - Number(b[1]));
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([name, raw]) => {
        const n = Number(raw);
        const label = Items[name]?.label || name;
        const text = n >= 1 ? `${n}x ${label}` : n === 0 ? label : `${Math.round(n * 100)}% ${label}`;
        const ok = hasIngredient(name, n);
        return (
          <div key={name} className="flex items-center gap-2 text-(length:--nk-text-label) leading-4">
            <ItemImage src={itemImage(name)} name={name} className="size-5 shrink-0" />
            <span className="nk-num min-w-0 flex-1 truncate">{text}</span>
            {ok ? <CheckIcon className="size-4 text-muted-foreground" /> : <XIcon className="size-4 text-destructive" />}
          </div>
        );
      })}
    </div>
  );
}

function TooltipBody({ item, invType }: { item: Slot; invType: string }) {
  const t = useT();
  const extra = inv.use((s) => s.extraMeta);
  const data = item.name ? Items[item.name] : undefined;
  if (!data)
    return (
      <header className="px-4 py-3">
        <div className="nk-title">{item.name}</div>
      </header>
    );

  const meta = item.metadata ?? {};
  const description = (meta.description as string) || data.description;
  const ammoName = data.ammoName && Items[data.ammoName]?.label;
  const components: string[] = Array.isArray(meta.components) ? meta.components : [];
  const crafting = invType === "crafting";
  const extraRows = extra.filter((e) => meta[e.metadata]);

  const facts =
    item.durability !== undefined ||
    meta.ammo !== undefined ||
    !!ammoName ||
    !!meta.serial ||
    components.length > 0 ||
    !!meta.weapontint ||
    extraRows.length > 0;
  const hasBody = !!description || crafting || facts;

  // Right-hand meta in the header: crafting time, else the item's type, else nothing.
  const aside = crafting ? `${(item.duration !== undefined ? item.duration : 3000) / 1000}s` : meta.type ? String(meta.type) : null;

  return (
    <>
      <header className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="nk-title truncate">
            {meta.label || data.label || item.name}
            {/* the exact count (the slot shows 2.4k past 999) */}
            {!!item.count && item.count > 1 && <span className="nk-text-num ml-2 text-muted-foreground">×{item.count.toLocaleString("en-US")}</span>}
          </div>
          {!!item.weight && <div className="nk-label nk-num">{formatWeight(item.weight)}</div>}
        </div>
        {aside && <span className="nk-label nk-num shrink-0 leading-5">{aside}</span>}
      </header>
      {hasBody && (
        <div className="flex flex-col gap-3 border-t px-4 py-3">
          {description && (
            <div className="inv-md nk-text-desc">
              <Markdown>{String(description)}</Markdown>
            </div>
          )}
          {crafting ? (
            <Ingredients item={item} />
          ) : (
            facts && (
              <div className="flex flex-col gap-2">
                {item.durability !== undefined && (
                  <div className="flex flex-col gap-1">
                    <Row k={t("ui_durability")}>{Math.trunc(item.durability)}</Row>
                    <Meter value={item.durability} tone="durability" />
                  </div>
                )}
                {meta.ammo !== undefined && <Row k={t("ui_ammo")}>{meta.ammo}</Row>}
                {ammoName && <Row k={t("ammo_type")}>{ammoName}</Row>}
                {meta.serial && <Row k={t("ui_serial")}>{meta.serial}</Row>}
                {components.length > 0 && (
                  <Row k={t("ui_components")} wrap>
                    {components.map((c) => Items[c]?.label ?? c).join(", ")}
                  </Row>
                )}
                {!!meta.weapontint && <Row k={t("ui_tint")}>{meta.weapontint}</Row>}
                {extraRows.map((e, i) => (
                  <Row key={`${e.metadata}-${i}`} k={e.value}>
                    {String(meta[e.metadata])}
                  </Row>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}

/** Floating item details that follow the cursor (§8). */
export function ItemTooltip() {
  const tip = ui.use((s) => s.tooltip);
  const item = inv.use((s) => (tip ? sideInventory(tip.side, s).items[tip.slot - 1] : undefined));
  const invType = inv.use((s) => (tip ? sideInventory(tip.side, s).type : ""));
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const place = () => {
      const pad = 12;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      let x = pointer.x + 18;
      let y = pointer.y + 14;
      if (x + w > window.innerWidth - pad) x = pointer.x - w - 14;
      if (y + h > window.innerHeight - pad) y = Math.max(pad, window.innerHeight - h - pad);
      el.style.transform = `translate3d(${Math.max(pad, x)}px, ${y}px, 0)`;
    };
    place();
    return onPointerMove(place);
  }, [tip, item]);

  if (!tip || !hasItem(item)) return null;
  return (
    <div ref={ref} className="pointer-events-none fixed top-0 left-0 z-[60]">
      <div className="nk-panel nk-enter w-64 overflow-hidden">
        <TooltipBody item={item} invType={invType} />
      </div>
    </div>
  );
}
