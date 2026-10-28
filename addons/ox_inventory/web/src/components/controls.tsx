import { HandIcon, SparklesIcon } from "@/components/ui/icons";
import type { ReactNode } from "react";
import { ActionBar, ActionBarItem, ActionBarSep } from "@/components/ui/action-bar";
import { MenuRow } from "@/components/ui/menu-row";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/lib/locale";
import { exit } from "@/state/actions";
import { inv } from "@/state/inventory";
import { ui } from "@/state/ui";

/** A Use / Give drop zone: drag a player item onto it. A well in the tray, lit while it can take the item. */
function DropZone({ id, icon, children }: { id: "use" | "give"; icon: ReactNode; children: ReactNode }) {
  const over = ui.use((s) => s.over === id);
  const armed = ui.use((s) => s.drag?.from.side === "left");
  return (
    <div data-drop={id} data-armed={armed || undefined} data-over={over || undefined} className="inv-zone">
      <span className="inv-zone-icon">{icon}</span>
      {children}
    </div>
  );
}

function AmountInput() {
  const amount = inv.use((s) => s.amount);
  return (
    <Input
      inputMode="numeric"
      value={amount > 0 ? amount.toLocaleString("en-US") : ""}
      placeholder="Amount"
      aria-label="Amount"
      onChange={(e) => {
        const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 12), 10) || 0;
        inv.set({ amount: n });
      }}
      className="inv-amount nk-num"
    />
  );
}

function UsefulControls() {
  const t = useT();
  const open = ui.use((s) => s.help);
  const rows: [ReactNode, string][] = [
    [<Kbd key="rmb">RMB</Kbd>, t("ui_rmb")],
    [
      <KbdGroup key="alt">
        <Kbd>Alt</Kbd>
        <Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_alt_lmb"),
    ],
    [
      <KbdGroup key="ctrl">
        <Kbd>Ctrl</Kbd>
        <Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_ctrl_lmb"),
    ],
    [
      <KbdGroup key="shift">
        <Kbd>Shift</Kbd>
        <Kbd>Drag</Kbd>
      </KbdGroup>,
      t("ui_shift_drag"),
    ],
    [
      <KbdGroup key="cs">
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_ctrl_shift_lmb"),
    ],
    [
      <KbdGroup key="cc">
        <Kbd>Ctrl</Kbd>
        <Kbd>C</Kbd>
      </KbdGroup>,
      t("ui_ctrl_c"),
    ],
  ];
  return (
    <Dialog open={open} onOpenChange={(help) => ui.set({ help })}>
      <DialogContent className="nk-panel max-w-lg gap-0 overflow-hidden bg-popover p-0 text-popover-foreground">
        <header className="nk-panel-header pr-12">
          <DialogTitle className="nk-title">{t("ui_usefulcontrols")}</DialogTitle>
          <DialogDescription className="sr-only">{t("ui_usefulcontrols")}</DialogDescription>
        </header>
        <div className="flex flex-col px-6 pt-2 pb-4">
          {rows.map(([keys, text], i) => (
            <MenuRow key={i} inert meta={keys}>
              {text}
            </MenuRow>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The action tray: a stock shadcn Sheet from the bottom (non-modal, so dragging between the side
 * sheets and onto it keeps working), floating above the bottom edge between the sheets: how many to move, the Use and Give drop
 * zones, then the key hints. (vaul's Drawer was tried: its Radix dialog is always modal, so a drawer
 * opened by prop leaves the page's pointer events off and traps focus.)
 */
export function Controls({ open }: { open: boolean }) {
  const t = useT();
  const keep = (e: Event) => e.preventDefault();
  return (
    <Sheet open={open} modal={false}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="inv-tray border-0 bg-transparent shadow-none"
        onOpenAutoFocus={keep}
        onCloseAutoFocus={keep}
        onInteractOutside={keep}
        onEscapeKeyDown={keep}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">{t("ui_usefulcontrols")}</SheetTitle>
        <ActionBar plate>
          <AmountInput />
          <DropZone id="use" icon={<SparklesIcon />}>
            {t("ui_use")}
          </DropZone>
          <DropZone id="give" icon={<HandIcon />}>
            {t("ui_give")}
          </DropZone>
          <ActionBarSep />
          <ActionBarItem keys={["?"]} label={t("ui_usefulcontrols")} aria-label={t("ui_usefulcontrols")} onClick={() => ui.set({ help: true })} />
          <ActionBarItem keys={["Esc"]} label={t("ui_close")} onClick={exit} />
        </ActionBar>
      </SheetContent>
      <UsefulControls />
    </Sheet>
  );
}
