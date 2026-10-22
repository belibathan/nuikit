import { HandIcon, SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
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
            <div key={i}>
              {i > 0 && <Separator />}
              <div className="flex min-h-12 items-center justify-between gap-6 text-sm">
                <span>{text}</span>
                <span className="shrink-0">{keys}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A key hint, the pause menu's way: key caps beside the verb. `onClick` makes it a button. */
function Hint({ keys, children, onClick, label }: { keys: ReactNode; children: ReactNode; onClick?: () => void; label?: string }) {
  const body = (
    <>
      {keys}
      <span>{children}</span>
    </>
  );
  if (!onClick) return <span className="inv-hint">{body}</span>;
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inv-hint inv-hint-button">
      {body}
    </button>
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
        className="nk-panel inv-tray"
        onOpenAutoFocus={keep}
        onCloseAutoFocus={keep}
        onInteractOutside={keep}
        onEscapeKeyDown={keep}
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">{t("ui_usefulcontrols")}</SheetTitle>
        <div className="flex items-center gap-2">
          <AmountInput />
          <DropZone id="use" icon={<SparklesIcon />}>
            {t("ui_use")}
          </DropZone>
          <DropZone id="give" icon={<HandIcon />}>
            {t("ui_give")}
          </DropZone>
          <Separator orientation="vertical" className="mx-2 h-6!" />
          <div className="flex items-center gap-4">
            <Hint keys={<Kbd>?</Kbd>} onClick={() => ui.set({ help: true })} label={t("ui_usefulcontrols")}>
              {t("ui_usefulcontrols")}
            </Hint>
            <Hint keys={<Kbd>Esc</Kbd>} onClick={exit}>
              {t("ui_close")}
            </Hint>
          </div>
        </div>
      </SheetContent>
      <UsefulControls />
    </Sheet>
  );
}
