import { Mic } from "lucide-react";
import { Stagger, useStaggerItem } from "nuikit-core/react";
import { flipFrom } from "nuikit-core/motion";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Ctx, useCtx, type RadioCtx, type Tab } from "@/features/context";
import { Handheld } from "@/features/radio";
import { useAnchoredDrag, type Pos } from "@/lib/drag";
import { makeT } from "@/lib/locale";
import { post, useRadio } from "@/lib/nui";
import { loadServerTheme } from "@/lib/theme";
import { normaliseList, type PlayerList, type RadioData } from "@/lib/types";
import { cn } from "@/lib/utils";

const scaleOf = (m: number | undefined) => ((Number(m) || 50) * 2) / 100;

export default function App() {
  const [data, setData] = useState<RadioData | null>(null);
  const [shown, setShown] = useState(false);
  const [members, setMembers] = useState<PlayerList>({});
  const [tab, setTabState] = useState<Tab>("home");
  const [overlayOn, setOverlayOn] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const maxChannel = useRef<number | undefined>(undefined);

  useEffect(() => {
    void loadServerTheme();
  }, []);

  const accept = (d: RadioData | null | undefined) => {
    if (!d || typeof d !== "object") return;
    if (typeof d.maxChannel === "number") maxChannel.current = d.maxChannel;
    setData({ ...d, maxChannel: d.maxChannel ?? maxChannel.current });
    setOverlayOn(!!d.userData?.playerlist?.show);
    if (!d.onRadio) setMembers({});
  };

  useRadio<RadioData>("setRadioVisible", (d) => {
    accept(d);
    setShown(true);
  });
  useRadio<RadioData>("updateRadio", accept);
  const onTime = (time: string) => setData((d) => (d ? { ...d, time: String(time) } : d));
  useRadio<string>("UpdateTime", onTime); // what Lua sends
  useRadio<string>("updateTime", onTime); // what the stock page listened for
  useRadio("setRadioHide", () => hide(false));
  useRadio<boolean>("insideJammer", (v) => setData((d) => (d ? { ...d, insideJammerZone: !!v } : d)));
  useRadio<{ msg?: string; duration?: number }>("notify", (n) => window.dispatchEvent(new CustomEvent("radio:notify", { detail: n })));
  useRadio<unknown>("updateRadioList", (l) => setMembers(normaliseList(l)));
  useRadio<{ radioId?: string | number; radioTalking?: boolean }>("updateRadioTalking", ({ radioId, radioTalking }) =>
    setMembers((m) => {
      const id = String(radioId);
      return m[id] ? { ...m, [id]: { ...m[id], isTalking: !!radioTalking } } : m;
    }),
  );

  function hide(notify: boolean) {
    setShown(false);
    setTabState("home");
    setMoveMode(false);
    if (notify) void post("hideUI");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && shown) hide(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Members needs a channel.
  useEffect(() => {
    if (data && !data.onRadio && tab === "members") setTabState("home");
  }, [data, tab]);

  const ctx: RadioCtx | null = useMemo(
    () =>
      data && {
        data,
        t: makeT(data.locale),
        members,
        tab,
        setTab: (next: Tab) => {
          setTabState(next);
          setMoveMode(false);
        },
        update: (fn) => setData((d) => (d ? fn(d) : d)),
        overlayOn,
        setOverlayOn,
        moveMode,
        setMoveMode,
      },
    [data, members, tab, overlayOn, moveMode],
  );

  if (!ctx || !data) return null;
  const forced = shown && (tab === "members" || tab === "settings");

  return (
    <Ctx.Provider value={ctx}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <Overlay forced={forced} draggable={shown} />
        <RadioFrame shown={shown} />
      </div>
    </Ctx.Provider>
  );
}

function RadioFrame({ shown }: { shown: boolean }) {
  const { data, update, moveMode } = useCtx();
  const pos: Pos = data.userData?.radio?.coords ?? { x: 10, y: 15 };
  const setPos = (p: Pos) => update((d) => ({ ...d, userData: { ...d.userData, radio: { ...d.userData?.radio, coords: p } } }));
  const onMouseDown = useAnchoredDrag({ enabled: moveMode && shown, fromTop: false, get: () => pos, set: setPos, onEnd: (p) => void post("updateRadioPosition", p) });

  return (
    <div
      data-radio=""
      data-state={shown ? "open" : "closed"}
      className={cn("radio-frame pointer-events-auto absolute", !shown && "pointer-events-none opacity-0")}
      style={{
        right: pos.x,
        bottom: pos.y,
        transform: `translateY(var(--radio-off, 0%)) scale(${scaleOf(data.userData?.radioSizeMultiplier)})`,
        transformOrigin: "bottom right",
      }}
      onMouseDown={onMouseDown}
    >
      <Handheld />
    </div>
  );
}

/** Who’s talking: shown even with the radio put away. Chips rise in one after another and fold out
 *  (kept mounted until the exit ends); the others slide to their new places, like the notices. */
function Overlay({ forced, draggable }: { forced: boolean; draggable: boolean }) {
  const { data, members, overlayOn, update } = useCtx();
  const mode = data.overlay ?? "default";
  const pos: Pos = data.userData?.playerlist?.coords ?? { x: 15, y: 40 };
  const setPos = (p: Pos) => update((d) => ({ ...d, userData: { ...d.userData, playerlist: { ...d.userData?.playerlist, coords: p } } }));
  const onMouseDown = useAnchoredDrag({ enabled: draggable, fromTop: true, get: () => pos, set: setPos, onEnd: (p) => void post("updatePlayerListPosition", p) });

  const on = overlayOn && mode !== "never" && !!data.onRadio;
  const all = forced || mode === "always";
  const rows: [string, PlayerList[string] | null][] = on ? Object.entries(members).filter(([, m]) => all || m.isTalking) : [];
  if (on && forced) rows.unshift(["@channel", null]);
  const chips = useKeptThroughExit(rows, CHIP_EXIT_MS);

  const box = useRef<HTMLDivElement>(null);
  const places = useRef(new WeakMap<Element, [number, number]>());
  useLayoutEffect(() => {
    if (box.current) flipFrom(box.current.children as HTMLCollectionOf<HTMLElement>, places.current, "move");
  });

  if (chips.length === 0) return null;

  return (
    <div
      ref={box}
      data-overlay=""
      className={cn("absolute flex max-w-[15vw] min-w-40 flex-col items-end gap-1", draggable ? "pointer-events-auto cursor-move" : "pointer-events-none")}
      style={{ right: pos.x, top: pos.y, transform: `scale(${scaleOf(data.userData?.overlaySizeMultiplier)})`, transformOrigin: "top right" }}
      onMouseDown={onMouseDown}
    >
      <Stagger budget={240}>
        {chips.map(({ id, value: m, leaving }) =>
          m === null ? (
            <Chip key={id} on={!leaving} className="radio-lcd opacity-70">
              {data.channel} MHz
            </Chip>
          ) : m.isTalking ? (
            <Chip key={id} on={!leaving} className="nk-chip-active">
              <Mic className="size-3.5 shrink-0" />
              <span className="truncate">{m.name}</span>
            </Chip>
          ) : (
            <Chip key={id} on={!leaving}>
              <span className="truncate opacity-70">{m.name}</span>
            </Chip>
          ),
        )}
      </Stagger>
    </div>
  );
}

function Chip({ on, className, children }: { on: boolean; className?: string; children: ReactNode }) {
  const ref = useStaggerItem<HTMLDivElement>(on, { appear: true, animate: "rise" });
  return (
    <div ref={ref} className={cn("nk-chip max-w-full", !on && "pointer-events-none", className)}>
      {children}
    </div>
  );
}

/** Long enough for the last of a group to fold out: the exit (≤ 200ms) after the stagger budget. */
const CHIP_EXIT_MS = 440;

type Kept<T> = { id: string; value: T; leaving: boolean; since: number };

/** The list as it was, plus what just left (leaving: true) until `ms` after it left, in place. */
function useKeptThroughExit<T>(items: [string, T][], ms: number): Kept<T>[] {
  const prev = useRef<Kept<T>[]>([]);
  const [, tick] = useState(0);
  const now = performance.now();
  const live = new Map(items);
  const out: Kept<T>[] = [];
  for (const k of prev.current) {
    if (live.has(k.id)) {
      out.push({ id: k.id, value: live.get(k.id) as T, leaving: false, since: 0 });
      live.delete(k.id);
    } else if (!k.leaving) out.push({ ...k, leaving: true, since: now });
    else if (now - k.since < ms) out.push(k);
  }
  for (const [id, value] of live) out.push({ id, value, leaving: false, since: 0 });
  useLayoutEffect(() => {
    prev.current = out;
  });
  const leaving = out.some((k) => k.leaving);
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => tick((n) => n + 1), ms);
    return () => clearTimeout(t);
  });
  return out;
}
