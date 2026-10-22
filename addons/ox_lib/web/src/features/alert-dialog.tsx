import { useEffect, useRef, useState } from "react";
import {
  AlertDialog as Dialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { alertIntent } from "@/lib/intents";
import { EnterKey } from "@/lib/keys";
import { useLocale } from "@/lib/locale";
import { Markdown } from "@/lib/markdown";
import { post, useOx } from "@/lib/nui";
import { openIntent, type Handle } from "@/lib/route";
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

/** ox_lib's modal sizes (xs 320 … xl 780 px), on the kit's width scale. */
const SIZE = { xs: "sm:max-w-80", sm: "sm:max-w-96", md: "sm:max-w-md", lg: "sm:max-w-2xl", xl: "sm:max-w-3xl" };

/**
 * ox_lib's alert dialog (lib.alertDialog) as shadcn's AlertDialog (Radix, its own fade and zoom in and
 * out), dressed as an nk-panel. ox_lib's rules stay here (docs/ox-lib-protocol.md §8): Escape always
 * cancels, even without a Cancel button; the first button has focus, so Enter presses Cancel when it's
 * shown and Confirm otherwise; closeAlertDialog closes without a post. Radix's own Escape is off: the
 * window listener below posts the one closeAlert. Hovering a button focuses it, so the focus ring and
 * the hover are always on the same button (and Enter presses the one you point at).
 */
export function AlertDialog() {
  const locale = useLocale();
  const [data, setData] = useState<AlertData | null>(null);
  const [open, setOpen] = useState(false);
  const confirm = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  const routed = useRef<Handle | null>(null);

  // Routed (docs/adapters/ox-lib.md §3): the frame's confirm; Escape there resolves cancel, as ox does.
  useOx<AlertData>("sendAlert", (d) => {
    const handle = openIntent("confirm", alertIntent(d as unknown as Record<string, unknown>), {
      key: "alert",
      onEnd: (a) => {
        if (routed.current?.id === a.id) routed.current = null;
        if (a.result === "confirm" || a.result === "cancel") void post("closeAlert", a.result);
        else if (a.reason === "stopped") void post("closeAlert", "cancel");
      },
      onLocal: () => {
        setData(d);
        setOpen(true);
      },
    });
    if (handle) {
      routed.current = handle;
      setOpen(false);
    }
  });
  useOx("closeAlertDialog", () => {
    routed.current?.cancel();
    routed.current = null;
    setOpen(false);
  });

  const close = (reason: "confirm" | "cancel") => {
    setOpen(false);
    void post("closeAlert", reason);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      e.preventDefault();
      close("cancel");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!data) return null;
  return (
    <Dialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (data.cancel ? cancel.current : confirm.current)?.focus();
        }}
        // Not centred (the default): near the top, as ox_lib draws it.
        className={cn("nk-panel ox-alert gap-0 p-0", SIZE[data.size ?? "md"], !data.centered && "top-[12vh] translate-y-0")}
      >
        <AlertDialogHeader className="nk-panel-header place-items-start text-left">
          <AlertDialogTitle asChild>
            <div className="nk-title ox-md">
              <Markdown>{data.header}</Markdown>
            </div>
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <div className={cn("ox-dialog-body text-base leading-6 text-muted-foreground", data.overflow && "max-h-[60vh] overflow-y-auto")}>
            <Markdown gfm className="ox-md">
              {data.content}
            </Markdown>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter className="nk-panel-footer justify-end">
          {data.cancel && (
            <AlertDialogCancel ref={cancel} onPointerEnter={(e) => e.currentTarget.focus()} onClick={() => close("cancel")}>
              {data.labels?.cancel ?? locale.cancel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction ref={confirm} onPointerEnter={(e) => e.currentTarget.focus()} onClick={() => close("confirm")}>
            {data.labels?.confirm ?? locale.confirm}
            {!data.cancel && <EnterKey />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </Dialog>
  );
}
