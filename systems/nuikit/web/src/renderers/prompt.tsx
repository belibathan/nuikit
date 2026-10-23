// prompt → `key-prompt`, one stack per position. A prompt stays until the script cancels it. With
// `hold`, the page reads the key only when it has focus (it usually doesn't: the script feeds
// `progress` from the game and resolves itself, or the hold fills here and resolves true).
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useClearOf } from "nuikit-core/react";
import * as React from "react";
import { usePublishedRect } from "@/components/ui/zone";
import { KeyPrompt, KeyPromptStack, keyPromptPosition, type KeyPromptPosition } from "@/components/ui/key-prompt";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { cn } from "@/lib/utils";

/** A prompt stack clear of what other UIs cover in its zone (screen zones: a phone on the right edge, the HUD's map). */
function ClearPromptStack({ position, children }: { position: KeyPromptPosition; children: React.ReactNode }) {
  // prompts clear other resources (never this page's notices); the notices in the same zone clear them (local zone)
  const clear = useClearOf(position, { ignore: ["nuikit", "local"] });
  const ref = React.useRef<HTMLDivElement>(null);
  usePublishedRect(ref, `prompt:${position}`, { remote: false });
  return (
    <KeyPromptStack ref={ref} position={position} className="pointer-events-none" style={clear}>
      {children}
    </KeyPromptStack>
  );
}

function PromptRenderer({ intents, ctx }: RendererProps<"prompt">) {
  const groups = new Map<KeyPromptPosition, typeof intents>();
  for (const it of intents) {
    const p = keyPromptPosition(it.props.position ?? "center-right");
    groups.set(p, [...(groups.get(p) ?? []), it]);
  }
  return (
    <>
      {[...groups].map(([position, list]) => (
        <ClearPromptStack key={position} position={position}>
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
        </ClearPromptStack>
      ))}
    </>
  );
}

export default defineReactRenderer({ kind: "prompt", Component: PromptRenderer, version: 1 });
