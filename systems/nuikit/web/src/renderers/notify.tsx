// notify → `notice`: one stack per position, newest nearest the edge. A notice ends itself when its
// time runs out (the runtime is told, so the stack stays small); the same id updates in place; the same
// notice again while it's on screen folds into it with a ×N count (notify-merge.ts).
import { defineReactRenderer, type RendererProps } from "nuikit-core/intents-react";
import { useClearOf } from "nuikit-core/react";
import { useEffect, useRef, useState } from "react";
import { Notice, NoticeStack, NOTICE_EXIT_MS, noticePosition, type NoticePosition } from "@/components/ui/notice";
import { Icon } from "@/lib/icon";
import { Text } from "@/lib/text";
import { anchor } from "@/lib/anchor";
import { mergeRepeats, mergeState } from "./notify-merge";

const DEFAULT_MS = 5000;

const slotPosition = (p?: string) => noticePosition(anchor(p as Parameters<typeof anchor>[0], "top-right"));

function NotifyRenderer({ intents, ctx }: RendererProps<"notify">) {
  // Repeats fold into the notice on screen: slots are assigned here (idempotent for ids already seen),
  // the older intents cancelled after the render. `folded` keeps them from playing an exit.
  const merge = useRef(mergeState());
  mergeRepeats(intents, merge.current, slotPosition);
  const folded = useRef(new Set<string>());
  useEffect(() => {
    for (const id of merge.current.absorbed) {
      if (folded.current.has(id)) continue;
      folded.current.add(id);
      ctx.cancel(id, "replaced");
    }
  }, [intents, ctx]);

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

  // A notice that ended stays drawn for its exit (`leaving`: notice slides it back out toward its
  // edge), then goes; the stack's others then glide into the gap (NoticeStack's flip).
  type Shown = (typeof intents)[number] & { leaving?: boolean };
  const [leaving, setLeaving] = useState<Shown[]>([]);
  const prev = useRef<typeof intents>([]);
  useEffect(() => {
    const live = new Set(intents.map((it) => it.id));
    const gone = prev.current.filter((it) => !live.has(it.id) && !folded.current.delete(it.id));
    prev.current = intents;
    if (!gone.length) return;
    setLeaving((l) => [...l.filter((x) => !live.has(x.id)), ...gone.map((it) => ({ ...it, leaving: true }))]);
    // not cleared when intents change again: each exit always ends
    setTimeout(() => setLeaving((l) => l.filter((x) => !gone.some((g) => g.id === x.id))), NOTICE_EXIT_MS);
  }, [intents]);

  const groups = new Map<NoticePosition, Shown[]>();
  const slot = (it: Shown) => merge.current.slots.get(it.id) ?? { root: it.id, count: 1, seq: it.seq };
  const all: Shown[] = [...intents.filter((it) => !merge.current.absorbed.has(it.id)), ...leaving.filter((x) => !intents.some((it) => it.id === x.id))].sort(
    (a, b) => slot(a).seq - slot(b).seq,
  );
  for (const it of all) {
    const p = noticePosition(anchor(it.props.position, "top-right"));
    groups.set(p, [it, ...(groups.get(p) ?? [])]);
  }

  return (
    <>
      {[...groups].map(([position, list]) => (
        <ClearStack key={position} position={position}>
          {list.map((it) => {
            const p = it.props;
            if (!p.title && !p.description && !p.item) return null;
            const ms = p.duration && p.duration > 0 ? p.duration : DEFAULT_MS;
            const { root, count } = slot(it);
            const icon = p.icon ? <Icon icon={p.icon} color={p.iconColor} animation={p.iconAnimation} allowImage={false} /> : p.iconColor ? <Icon icon={statusIcon(p.status)} color={p.iconColor} /> : undefined;
            return (
              // the wrapper is what the stack's flip moves; the notice slides in and out inside it. Keyed on
              // the slot: a repeat (×N) re-enters in place with a fade (slide={false}), its time restarting.
              <div key={root} data-slot="notify-item">
              <Notice
                key={`${it.id}:${it.at ?? it.seq}`}
                leaving={it.leaving}
                slide={count < 2}
                status={p.status ?? "info"}
                title={p.title ? <Counted count={count}><Text>{p.title}</Text></Counted> : undefined}
                description={p.description ? <Counted count={p.title ? 1 : count}><Text>{p.description}</Text></Counted> : undefined}
                icon={icon}
                iconAlign={p.alignIcon === "top" ? "start" : p.alignIcon === "center" ? "center" : undefined}
                duration={ms}
                showDuration={p.showDuration !== false}
                item={p.item ? { name: p.item.name, count: p.item.count, image: p.item.image, icon: p.item.icon ? <Icon icon={p.item.icon} /> : undefined } : undefined}
                style={p.style as React.CSSProperties | undefined}
              />
              </div>
            );
          })}
        </ClearStack>
      ))}
    </>
  );
}

/** The repeat count beside a title, `×2` on its right; each repeat rises in. */
function Counted({ children, count }: { children: React.ReactNode; count: number }) {
  if (count < 2) return <>{children}</>;
  return (
    <span className="flex items-center gap-2">
      <span className="min-w-0 flex-1">{children}</span>
      <span key={count} data-slot="notice-count" className="nk-num nk-rise shrink-0 text-xs text-muted-foreground" aria-label={`${count} times`}>
        {`×${count}`}
      </span>
    </span>
  );
}

/** A notice stack that starts clear of what other UIs cover in its corner (screen zones: the HUD's map). */
function ClearStack({ position, children }: { position: NoticePosition; children: React.ReactNode }) {
  const clear = useClearOf(position);
  return (
    <NoticeStack position={position} style={clear}>
      {children}
    </NoticeStack>
  );
}

function statusIcon(status: string | undefined) {
  return status === "success" ? "circle-check" : status === "warning" ? "triangle-alert" : status === "error" ? "circle-x" : "info";
}

export default defineReactRenderer({ kind: "notify", Component: NotifyRenderer, version: 1 });
