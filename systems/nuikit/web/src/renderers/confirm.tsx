// confirm → `confirm`: the modal with a scrim. Confirm resolves "confirm"; Cancel, Escape and the
// timeout resolve "cancel" (Escape always works, even without a cancel button, as ox does).
import type { ConfirmProps } from "nuikit-core/intents";
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect } from "react";
import { Confirm } from "@/components/ui/confirm";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { cn } from "@/lib/utils";

const SIZE: Record<string, "sm" | "default" | "lg"> = { xs: "sm", sm: "sm", md: "default", lg: "lg", xl: "lg" };

function ConfirmRenderer({ intents, ctx }: RendererProps<"confirm">) {
  const top = intents[intents.length - 1];
  useEffect(
    () =>
      ctx.onBack(() => {
        const t = ctx.intents().at(-1);
        if (t) ctx.resolve(t.id, "cancel", { reason: "escape" });
      }),
    [ctx],
  );
  if (!top) return null;
  return <OneConfirm key={top.id} id={top.id} props={top.props} ctx={ctx} />;
}

function OneConfirm({ id, props, ctx }: { id: string; props: ConfirmProps; ctx: RendererProps<"confirm">["ctx"] }) {
  useEffect(() => {
    if (!props.timeout) return;
    const t = setTimeout(() => ctx.resolve(id, "cancel", { reason: "timeout" }), props.timeout);
    return () => clearTimeout(t);
  }, [id, props.timeout, ctx]);

  return (
    <div data-intent="confirm" className={cn("pointer-events-auto absolute inset-0", props.centered === false && "bottom-1/3")}>
      <Confirm
        size={SIZE[props.size ?? "md"] ?? "default"}
        tone={props.tone ?? "primary"}
        icon={props.icon ? <Icon icon={props.icon} /> : undefined}
        title={<Text>{props.title}</Text>}
        description={props.description ? <Text>{props.description}</Text> : undefined}
        confirmLabel={props.labels?.confirm}
        cancelLabel={props.labels?.cancel}
        showCancel={props.cancel !== false}
        initialFocus={props.cancel !== false ? "cancel" : "confirm"}
        onConfirm={() => ctx.resolve(id, "confirm")}
        onCancel={() => ctx.resolve(id, "cancel")}
      />
    </div>
  );
}

export default defineReactRenderer({ kind: "confirm", Component: ConfirmRenderer, version: 1 });
