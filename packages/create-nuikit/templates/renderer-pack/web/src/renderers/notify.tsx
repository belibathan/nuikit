// notify → Notice: the example renderer. Make it yours: the look is this file; the intent's fields
// (title, description, status, icon, duration, position, item…) are documented on NotifyProps.
//
// The frame re-renders this component with the open notify intents (bottom → top) on every change
// and gives it `ctx` to end one (`ctx.cancel(id, "timeout")`): the runtime keeps the stack, so a
// notice that ran out must say so, or it stays open forever.
import { BoxIcon, CarIcon, KeyIcon, PhoneIcon, ShieldIcon, WalletIcon, type LucideIcon } from "lucide-react";
import type { RendererProps } from "nuikit-core/intents-react";
import { useEffect, useRef } from "react";
import { Notice, NoticeStack, noticePosition, type NoticePosition } from "@/components/ui/notice";

const DEFAULT_MS = 5000;

// Icons a script may name (`icon = 'phone'`). Import only what you use: the whole lucide set is 1.5 MB.
const ICONS: Record<string, LucideIcon> = { phone: PhoneIcon, car: CarIcon, box: BoxIcon, key: KeyIcon, shield: ShieldIcon, wallet: WalletIcon };
const lucide = (name: string | undefined) => (name ? ICONS[name] : undefined);

export function NotifyRenderer({ intents, ctx }: RendererProps<"notify">) {
  // One timer per intent, restarted when it is re-opened or updated (its `at` changes).
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

  // One stack per position, newest nearest the edge.
  const groups = new Map<NoticePosition, typeof intents>();
  for (const it of intents) {
    const p = noticePosition(typeof it.props.position === "string" ? it.props.position : "top-right");
    groups.set(p, [it, ...(groups.get(p) ?? [])]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        <NoticeStack key={position} position={position}>
          {list.map((it) => {
            const p = it.props;
            const Icon = typeof p.icon === "string" ? lucide(p.icon) : undefined;
            return (
              <Notice
                key={`${it.id}:${it.at ?? it.seq}`}
                className="pointer-events-auto"
                status={p.status ?? "info"}
                title={p.title}
                description={p.description}
                icon={Icon ? <Icon /> : undefined}
                duration={p.duration && p.duration > 0 ? p.duration : DEFAULT_MS}
                showDuration={p.showDuration !== false}
                item={p.item ? { name: p.item.name, count: p.item.count, image: p.item.image } : undefined}
                onDismiss={() => ctx.cancel(it.id, "close")}
              />
            );
          })}
        </NoticeStack>
      ))}
    </>
  );
}
