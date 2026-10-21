// notify → `notice`: one stack per position, newest nearest the edge. A notice ends itself when its
// time runs out (the runtime is told, so the stack stays small); the same id updates in place.
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useEffect, useRef } from "react";
import { Notice, NoticeStack, noticePosition, type NoticePosition } from "@/components/ui/notice";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { anchor } from "@/lib/anchor";

const DEFAULT_MS = 5000;

function NotifyRenderer({ intents, ctx }: RendererProps<"notify">) {
  // Timers live here, not in the Notice (which restarts on every re-render of a changed prop):
  // one per id, restarted when the intent is re-opened or updated (its `at` changes).
  const timers = useRef(new Map<string, { at: number; t: ReturnType<typeof setTimeout> }>());
  useEffect(() => {
    const live = new Set<string>();
    for (const it of intents) {
      live.add(it.id);
      const at = it.at ?? it.seq;
      const prev = timers.current.get(it.id);
      if (prev && prev.at === at) continue;
      if (prev) clearTimeout(prev.t);
      const ms = it.props.duration && it.props.duration > 0 ? it.props.duration : DEFAULT_MS;
      timers.current.set(it.id, { at, t: setTimeout(() => ctx.cancel(it.id, "timeout"), ms) });
    }
    for (const [id, { t }] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(t);
        timers.current.delete(id);
      }
    }
  }, [intents, ctx]);
  useEffect(() => () => timers.current.forEach(({ t }) => clearTimeout(t)), []);

  const groups = new Map<NoticePosition, typeof intents>();
  for (const it of intents) {
    const p = noticePosition(anchor(it.props.position, "top-right"));
    groups.set(p, [it, ...(groups.get(p) ?? [])]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        <NoticeStack key={position} position={position}>
          {list.map((it) => {
            const p = it.props;
            if (!p.title && !p.description && !p.item) return null;
            const ms = p.duration && p.duration > 0 ? p.duration : DEFAULT_MS;
            const icon = p.icon ? <Icon icon={p.icon} color={p.iconColor} animation={p.iconAnimation} allowImage={false} /> : p.iconColor ? <Icon icon={statusIcon(p.status)} color={p.iconColor} /> : undefined;
            return (
              <Notice
                key={`${it.id}:${it.at ?? it.seq}`}
                className="pointer-events-auto"
                status={p.status ?? "info"}
                title={<Text>{p.title}</Text>}
                description={p.description ? <Text>{p.description}</Text> : undefined}
                icon={icon}
                iconAlign={p.alignIcon === "top" ? "start" : p.alignIcon === "center" ? "center" : undefined}
                duration={ms}
                showDuration={p.showDuration !== false}
                item={p.item ? { name: p.item.name, count: p.item.count, image: p.item.image, icon: p.item.icon ? <Icon icon={p.item.icon} /> : undefined } : undefined}
                style={p.style as React.CSSProperties | undefined}
              />
            );
          })}
        </NoticeStack>
      ))}
    </>
  );
}

function statusIcon(status: string | undefined) {
  return status === "success" ? "circle-check" : status === "warning" ? "triangle-alert" : status === "error" ? "circle-x" : "info";
}

export default defineReactRenderer({ kind: "notify", Component: NotifyRenderer, version: 1 });
