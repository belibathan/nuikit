import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DIALOG_HEADER, DIALOG_PANEL, WIDTH } from "@/features/input-dialog";
import { useLocale } from "@/lib/locale";
import { Markdown } from "@/lib/markdown";
import { post, useOx } from "@/lib/nui";
import { cn } from "@/lib/utils";

interface AlertData {
  header: string;
  content: string;
  centered?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  overflow?: boolean;
  cancel?: boolean;
  labels?: { cancel?: string; confirm?: string };
}


/** ox_lib's alert dialog (lib.alertDialog). Protocol: docs/ox-lib-protocol.md §8. */
export function AlertDialog() {
  const locale = useLocale();
  const [data, setData] = useState<AlertData | null>(null);
  const [open, setOpen] = useState(false);

  useOx<AlertData>("sendAlert", (d) => {
    setData(d);
    setOpen(true);
  });
  useOx("closeAlertDialog", () => setOpen(false));

  const close = (reason: "confirm" | "cancel") => {
    setOpen(false);
    void post("closeAlert", reason);
  };

  if (!data) return null;
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          DIALOG_PANEL,
          WIDTH[data.size ?? "md"],
          !data.centered && "top-[12%] translate-y-0",
          data.overflow && "max-h-[80vh] grid-rows-[auto_minmax(0,1fr)_auto]",
        )}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          close("cancel"); // Escape always cancels, even without a Cancel button
        }}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className={DIALOG_HEADER}>
          <DialogTitle asChild>
            <div className="nk-title min-w-0">
              <Markdown>{data.header}</Markdown>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={cn("p-4 text-sm leading-6 text-muted-foreground", data.overflow && "min-h-0 overflow-y-auto")}>
          <Markdown gfm>{data.content}</Markdown>
        </div>
        <DialogFooter className="nk-panel-footer">
          {data.cancel && (
            <Button variant="outline" onClick={() => close("cancel")}>
              {data.labels?.cancel ?? locale.cancel}
            </Button>
          )}
          <Button onClick={() => close("confirm")}>{data.labels?.confirm ?? locale.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
