// prompt → `key-prompt`, one stack per position. A prompt stays until the script cancels it. With
// `hold`, the page reads the key only when it has focus (it usually doesn't: the script feeds
// `progress` from the game and resolves itself, or the hold fills here and resolves true).
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { KeyPrompt, KeyPromptStack, keyPromptPosition, type KeyPromptPosition } from "@/components/ui/key-prompt";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { cn } from "@/lib/utils";

function PromptRenderer({ intents, ctx }: RendererProps<"prompt">) {
  const groups = new Map<KeyPromptPosition, typeof intents>();
  for (const it of intents) {
    const p = keyPromptPosition(it.props.position ?? "center-right");
    groups.set(p, [...(groups.get(p) ?? []), it]);
  }
  return (
    <>
      {[...groups].map(([position, list]) => (
        <KeyPromptStack key={position} position={position} className="pointer-events-none">
          {list.map((it) => {
            const p = it.props;
            return (
              <KeyPrompt
                key={it.id}
                className={cn("pointer-events-auto", p.status === "success" && "text-(color:--success)", p.status === "warning" && "text-(color:--warning)", p.status === "error" && "text-(color:--destructive)")}
                surface={p.surface ?? "slab"}
                keys={p.keys ?? []}
                label={<Text>{p.label}</Text>}
                description={p.description ? <Text>{p.description}</Text> : undefined}
                wrap={!!p.description && (p.surface ?? "slab") === "slab"}
                icon={p.icon ? <Icon icon={p.icon} color={p.iconColor} animation={p.iconAnimation} allowImage={false} /> : undefined}
                hold={p.hold}
                progress={p.progress}
                active={p.active || p.pressed}
                data-pressed={p.pressed || undefined}
                data-status={p.status}
                disabled={p.disabled}
                listen={!!p.hold}
                onConfirm={() => (p.hold ? ctx.resolve(it.id, true) : ctx.emit(it.id, "confirm", {}))}
                style={p.style as React.CSSProperties | undefined}
              />
            );
          })}
        </KeyPromptStack>
      ))}
    </>
  );
}

export default defineReactRenderer({ kind: "prompt", Component: PromptRenderer, version: 1 });
