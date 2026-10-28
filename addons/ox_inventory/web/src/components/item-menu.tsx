import { CopyIcon, CrosshairIcon, HandIcon, PackageOpenIcon, PuzzleIcon, SparklesIcon, SquareMousePointerIcon, Trash2Icon } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Selection } from "@/components/ui/selection";
import { useT } from "@/lib/locale";
import { copyText } from "@/lib/nui";
import { giveItem, moveItem, removeAmmo, removeComponent, useButton, useItem } from "@/state/actions";
import { ItemImage } from "@/components/item-image";
import { Items, hasItem, inv, itemImage, itemLabel } from "@/state/inventory";
import { ui } from "@/state/ui";

type Group = { name: string | null; buttons: { label: string; index: number }[] };

/** Custom item buttons: grouped ones go into one submenu per group, at the group's first position (§7). */
function groupButtons(buttons: { label: string; group?: string }[] = []): Group[] {
  const groups: Group[] = [];
  buttons.forEach((b, index) => {
    if (b.group) {
      const g = groups.find((x) => x.name === b.group);
      if (g) g.buttons.push({ label: b.label, index });
      else groups.push({ name: b.group, buttons: [{ label: b.label, index }] });
    } else groups.push({ name: null, buttons: [{ label: b.label, index }] });
  });
  return groups;
}

/** Right-click menu for player items, opened at the cursor. */
export function ItemMenu() {
  const t = useT();
  const menu = ui.use((s) => s.menu);
  const left = inv.use((s) => s.left);
  inv.use((s) => s.registry);
  const item = menu ? left.items[menu.slot - 1] : undefined;
  const open = !!menu && hasItem(item);
  const close = () => ui.set({ menu: null });

  const components: string[] = Array.isArray(item?.metadata?.components) ? item!.metadata!.components : [];
  const groups = item?.name ? groupButtons(Items[item.name]?.buttons) : [];

  return (
    // keyed by position: a new right-click re-anchors the menu
    <DropdownMenu key={menu ? `${menu.slot}:${menu.x}:${menu.y}` : "closed"} open={open} onOpenChange={(o) => !o && close()} modal={false}>
      <DropdownMenuTrigger asChild>
        <span aria-hidden className="pointer-events-none fixed size-0" style={{ left: menu?.x ?? 0, top: menu?.y ?? 0 }} />
      </DropdownMenuTrigger>
      {open && item && (
        <DropdownMenuContent align="start" side="right" sideOffset={2} className="inv-menu w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
          {/* one selection Glyph slides to the highlighted item (pointer and keys alike: Radix highlights both) */}
          <Selection items="[data-slot=dropdown-menu-item], [data-slot=dropdown-menu-sub-trigger]" lit="[data-highlighted], [data-state=open]" pointer={false} focus={false} />
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-1.5">
            <ItemImage src={itemImage(item)} name={item.name} className="size-8 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="nk-title truncate">{itemLabel(item)}</span>
              {item.count && item.count > 1 ? <span className="nk-label nk-num text-muted-foreground">×{item.count.toLocaleString("en-US")}</span> : null}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => useItem(item.slot)}>
            <SparklesIcon />
            {t("ui_use")}
            <KbdGroup className="ml-auto">
              <Kbd>Alt</Kbd>
              <Kbd>LMB</Kbd>
            </KbdGroup>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => giveItem(item.slot)}>
            <HandIcon />
            {t("ui_give")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => moveItem({ side: "left", slot: item.slot })}>
            <Trash2Icon />
            {t("ui_drop")}
          </DropdownMenuItem>

          {(item.metadata?.ammo > 0 || item.metadata?.serial || components.length > 0) && <DropdownMenuSeparator />}
          {item.metadata?.ammo > 0 && (
            <DropdownMenuItem onSelect={() => removeAmmo(item.slot)}>
              <CrosshairIcon />
              {t("ui_remove_ammo")}
            </DropdownMenuItem>
          )}
          {item.metadata?.serial && (
            <DropdownMenuItem onSelect={() => copyText(String(item.metadata!.serial))}>
              <CopyIcon />
              {t("ui_copy")}
            </DropdownMenuItem>
          )}
          {components.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <PuzzleIcon className="size-4 text-muted-foreground" />
                {t("ui_removeattachments")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52">
                <Selection items="[data-slot=dropdown-menu-item], [data-slot=dropdown-menu-sub-trigger]" lit="[data-highlighted], [data-state=open]" pointer={false} focus={false} />
                {components.map((c, i) => (
                  <DropdownMenuItem key={`${c}-${i}`} onSelect={() => removeComponent(c, item.slot)}>
                    {Items[c]?.label ?? c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {groups.length > 0 && <DropdownMenuSeparator />}
          {groups.map((g, gi) =>
            g.name ? (
              <DropdownMenuSub key={`g-${gi}`}>
                <DropdownMenuSubTrigger>
                  <PackageOpenIcon className="size-4 text-muted-foreground" />
                  {g.name}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-52">
                  <Selection items="[data-slot=dropdown-menu-item], [data-slot=dropdown-menu-sub-trigger]" lit="[data-highlighted], [data-state=open]" pointer={false} focus={false} />
                  {g.buttons.map((b) => (
                    <DropdownMenuItem key={b.index} onSelect={() => useButton(b.index, item.slot)}>
                      {b.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : (
              g.buttons.map((b) => (
                <DropdownMenuItem key={b.index} onSelect={() => useButton(b.index, item.slot)}>
                  <SquareMousePointerIcon />
                  {b.label}
                </DropdownMenuItem>
              ))
            ),
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
