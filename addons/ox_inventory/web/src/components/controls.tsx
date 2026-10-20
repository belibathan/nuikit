import { CircleHelpIcon, HandIcon, SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { useT } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { exit } from "@/state/actions";
import { inv } from "@/state/inventory";
import { ui } from "@/state/ui";

/** A Use / Give drop zone: drag a player item onto it. */
function DropZone({ id, icon, children }: { id: "use" | "give"; icon: ReactNode; children: ReactNode }) {
  const over = ui.use((s) => s.over === id);
  const armed = ui.use((s) => s.drag?.from.side === "left");
  return (
    <div
      data-drop={id}
      className={cn(
        "nk-row border border-transparent bg-muted/60 font-medium transition-colors duration-150 [&_svg]:size-4",
        armed && "border-dashed border-muted-foreground/40",
        over && "border-solid border-primary bg-primary text-primary-foreground",
      )}
    >
      <span className={cn("flex text-muted-foreground", over && "text-primary-foreground")}>{icon}</span>
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
      onChange={(e) => {
        const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 12), 10) || 0;
        inv.set({ amount: n });
      }}
      className="nk-num h-10 text-center font-medium md:text-sm"
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
      <DialogContent className="nk-panel nk-enter max-w-md gap-0 overflow-hidden bg-popover p-0 text-popover-foreground">
        <header className="nk-panel-header pr-12">
          <DialogTitle className="nk-title">{t("ui_usefulcontrols")}</DialogTitle>
          <DialogDescription className="sr-only">{t("ui_usefulcontrols")}</DialogDescription>
        </header>
        <div className="nk-panel-body">
          {rows.map(([keys, text], i) => (
            <div key={i} className="nk-row justify-between gap-6">
              <span>{text}</span>
              <span className="shrink-0">{keys}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The action bar along the bottom: amount, the Use and Give drop zones, close and help. */
export function Controls() {
  const t = useT();
  return (
    <div className="nk-panel nk-enter flex items-center gap-2 p-2">
      <div className="w-32">
        <AmountInput />
      </div>
      <div className="w-36">
        <DropZone id="use" icon={<SparklesIcon />}>
          {t("ui_use")}
        </DropZone>
      </div>
      <div className="w-36">
        <DropZone id="give" icon={<HandIcon />}>
          {t("ui_give")}
        </DropZone>
      </div>
      <Separator orientation="vertical" className="mx-1 h-6!" />
      <Button variant="ghost" size="sm" className="h-10 gap-2 px-3 font-medium" onClick={exit}>
        {t("ui_close")}
        <Kbd>Esc</Kbd>
      </Button>
      <Button variant="ghost" size="icon" className="size-10 text-muted-foreground" onClick={() => ui.set({ help: true })} aria-label={t("ui_usefulcontrols")}>
        <CircleHelpIcon />
      </Button>
      <UsefulControls />
    </div>
  );
}
