import { CopyIcon, CrosshairIcon, HandIcon, PackageOpenIcon, PuzzleIcon, SparklesIcon, SquareMousePointerIcon, Trash2Icon } from "lucide-react";
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
import { useT } from "@/lib/locale";
import { copyText } from "@/lib/nui";
import { giveItem, moveItem, removeAmmo, removeComponent, useButton, useItem } from "@/state/actions";
import { Items, hasItem, inv, itemLabel } from "@/state/inventory";
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
        <DropdownMenuContent align="start" side="right" sideOffset={2} className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuLabel className="nk-label truncate">{itemLabel(item)}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => useItem(item.slot)}>
            <SparklesIcon />
            {t("ui_use")}
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
