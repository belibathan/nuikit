import { useEffect, useRef, useState } from "react";
import { Confirm } from "@/components/ui/confirm";
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
const SIZE = { xs: "w-full max-w-80", sm: "w-full max-w-96", md: "w-full max-w-md", lg: "w-full max-w-2xl", xl: "w-full max-w-3xl" };

/**
 * ox_lib's alert dialog (lib.alertDialog), drawn with the kit's Confirm, the `confirm` intent's
 * renderer. ox_lib's rules stay here (docs/ox-lib-protocol.md §8): Escape always cancels, even
 * without a Cancel button; the first button has focus, so Enter presses Cancel when it's shown and
 * Confirm otherwise; closeAlertDialog closes without a post.
 */
export function AlertDialog() {
  const locale = useLocale();
  const [data, setData] = useState<AlertData | null>(null);
  const [open, setOpen] = useState(false);
  // A fresh Confirm per alert, so its focus starts on the right button every time.
  const [seq, setSeq] = useState(0);

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
        setSeq((n) => n + 1);
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

  // Confirm leaves Escape to nuikit surfaces; ox_lib's page owns it: always "cancel".
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

  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-50">
      <Confirm
        key={seq}
        title={<Markdown>{data.header}</Markdown>}
        description={
          <div className={cn("leading-6", data.overflow && "max-h-[60vh] overflow-y-auto")}>
            <Markdown gfm>{data.content}</Markdown>
          </div>
        }
        showCancel={Boolean(data.cancel)}
        cancelLabel={data.labels?.cancel ?? locale.cancel}
        confirmLabel={
          <>
            {data.labels?.confirm ?? locale.confirm}
            {!data.cancel && <EnterKey />}
          </>
        }
        initialFocus={data.cancel ? "cancel" : "confirm"}
        onCancel={() => close("cancel")}
        onConfirm={() => close("confirm")}
        // Not centred (the default): near the top, as ox_lib draws it.
        className={cn(SIZE[data.size ?? "md"], !data.centered && "mt-[12vh] self-start")}
      />
    </div>
  );
}
