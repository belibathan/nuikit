import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const WIDTH = { xs: "sm:max-w-[320px]", sm: "sm:max-w-[380px]", md: "sm:max-w-[440px]", lg: "sm:max-w-[620px]", xl: "sm:max-w-[780px]" };

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
        <DialogHeader>
          <DialogTitle asChild>
            <div>
              <Markdown>{data.header}</Markdown>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className={cn("text-sm text-muted-foreground", data.overflow && "overflow-y-auto pr-1")}>
          <Markdown gfm>{data.content}</Markdown>
        </div>
        <DialogFooter>
          {data.cancel && (
            <Button variant="outline" onClick={() => close("cancel")}>
              {data.labels?.cancel ?? locale.cancel}
            </Button>
          )}
          <Button variant={data.cancel ? "default" : "secondary"} onClick={() => close("confirm")}>
            {data.labels?.confirm ?? locale.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
