import { CircleHelpIcon, HandIcon, SparklesIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
        "flex h-[3.25rem] items-center gap-2.5 rounded-lg border px-3 text-sm font-medium transition-all duration-150",
        "border-border/80 bg-secondary/80 text-secondary-foreground",
        armed && "border-dashed border-foreground/35",
        over && "border-solid border-primary bg-primary text-primary-foreground",
      )}
    >
      <span className={cn("grid size-7 place-items-center rounded-md bg-background/60", over && "bg-primary-foreground/20")}>{icon}</span>
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
      placeholder="0"
      onChange={(e) => {
        const n = parseInt(e.target.value.replace(/\D/g, "").slice(0, 12), 10) || 0;
        inv.set({ amount: n });
      }}
      className="h-11 border-border/80 bg-background/70 text-center text-base font-semibold tabular-nums md:text-base"
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
        <Kbd>Alt</Kbd>+<Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_alt_lmb"),
    ],
    [
      <KbdGroup key="ctrl">
        <Kbd>Ctrl</Kbd>+<Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_ctrl_lmb"),
    ],
    [
      <KbdGroup key="shift">
        <Kbd>Shift</Kbd>+<Kbd>Drag</Kbd>
      </KbdGroup>,
      t("ui_shift_drag"),
    ],
    [
      <KbdGroup key="cs">
        <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>LMB</Kbd>
      </KbdGroup>,
      t("ui_ctrl_shift_lmb"),
    ],
    [
      <KbdGroup key="cc">
        <Kbd>Ctrl</Kbd>+<Kbd>C</Kbd>
      </KbdGroup>,
      t("ui_ctrl_c"),
    ],
  ];
  return (
    <Dialog open={open} onOpenChange={(help) => ui.set({ help })}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("ui_usefulcontrols")}</DialogTitle>
          <DialogDescription className="sr-only">{t("ui_usefulcontrols")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col">
          {rows.map(([keys, text], i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-2.5" />}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">{text}</span>
                <span className="shrink-0">{keys}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Controls() {
  const t = useT();
  return (
    <div className="flex w-[11rem] flex-col gap-2.5 self-center rounded-xl border border-border/80 bg-card/95 p-3 inv-elev">
      <AmountInput />
      <Separator className="my-0.5" />
      <DropZone id="use" icon={<SparklesIcon className="size-4" />}>
        {t("ui_use")}
      </DropZone>
      <DropZone id="give" icon={<HandIcon className="size-4" />}>
        {t("ui_give")}
      </DropZone>
      <Separator className="my-0.5" />
      <div className="flex gap-2">
        <Button variant="outline" className="h-10 flex-1" onClick={exit}>
          <XIcon />
          {t("ui_close")}
        </Button>
        <Button variant="outline" size="icon" className="size-10" onClick={() => ui.set({ help: true })} aria-label={t("ui_usefulcontrols")}>
          <CircleHelpIcon />
        </Button>
      </div>
      <UsefulControls />
    </div>
  );
}
